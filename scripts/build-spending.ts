// Builds src/data/spending.json for the "Where are you spending?" pages.
//   npm run build:spending
//
// Checkbook Expenditure Details (7bip-nb4g) has ~17M payment rows, too many
// to query while a page renders (one department takes ~25s), so this script
// sums them by department, division, vendor, account and fiscal year once and
// the pages read the snapshot. Only purchase accounts are kept (see ACCOUNTS
// in src/lib/spending-rules.ts). Payments to individuals are pooled under one
// unnamed payee. Payers the procurement code doesn't cover (school
// districts, charter schools, DSU, DTCC, UD, the Legislature) are left out,
// and so are payments to other governments and state accounts.
//
// Vendors are flagged from two more datasets by normalized name:
//   h9bb-iyu6 Awarded Vendor Contact Info -> on a current state contract
//   8dxf-6ahp OSD certified firms          -> certified small/diverse business
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ACCOUNTS, isExemptPayer, isPublicPayee } from "../src/lib/spending-rules";
import { loadVendorFlags, pages, soda } from "./socrata";

const CHECKBOOK = "7bip-nb4g";
const INDIVIDUALS = "Individual payees (names withheld)";

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

interface Agg {
  department?: string;
  division?: string;
  vendor?: string;
  account?: string;
  t: string;
  n: string;
}

async function main() {
  const accountList = Object.keys(ACCOUNTS).map((a) => `'${a}'`).join(",");
  const years = (
    await soda<{ fiscal_year: string }>(CHECKBOOK, { $select: "fiscal_year", $group: "fiscal_year", $order: "fiscal_year" })
  ).map((r) => r.fiscal_year);
  const departments = (
    await soda<{ department?: string }>(CHECKBOOK, { $select: "department", $group: "department", $order: "department" })
  )
    .map((r) => r.department)
    .filter((d): d is string => !!d);

  const jobs = departments.flatMap((d) => years.map((fy) => ({ d, fy })));
  let done = 0;
  const results = await pool(jobs, 4, async ({ d, fy }) => {
    const rows = await pages<Agg>(CHECKBOOK, {
      $select: "department, division, vendor, account, sum(amount::number) as t, count(*) as n",
      $where: `department='${d.replace(/'/g, "''")}' AND fiscal_year='${fy}' AND account in(${accountList})`,
      $group: "department, division, vendor, account",
      $order: "division, vendor, account",
    });
    console.log(`${++done}/${jobs.length} ${d} FY${fy}: ${rows.length} rows`);
    return rows.map((r) => ({ ...r, fy: Number(fy) }));
  });

  const [flags, meta] = await Promise.all([
    loadVendorFlags(),
    fetch(`https://data.delaware.gov/api/views/${CHECKBOOK}.json`).then((r) => r.json() as Promise<{ rowsUpdatedAt?: number }>),
  ]);

  const deptIdx = new Map<string, number>();
  const divIdx = new Map<string, number>();
  const vendorIdx = new Map<string, number>();
  const accountIdx = new Map<string, number>();
  const divisions: [number, string][] = [];
  const vendors: [string, 0 | 1, number[]][] = [];
  const contracts: [string, string][] = [];
  const contractIdx = new Map<string, number>();
  const rows: [number, number, number, number, number, number][] = [];
  const merged = new Map<string, (typeof rows)[number]>();

  for (const r of results.flat()) {
    const dept = r.department ?? "UNKNOWN";
    const div = r.division ?? "UNKNOWN";
    const rawVendor = (r.vendor ?? "UNKNOWN").trim();
    const vendor = rawVendor.startsWith("-") ? INDIVIDUALS : rawVendor;
    const amount = Number(r.t);
    if (!amount || isExemptPayer(dept, div) || isPublicPayee(rawVendor)) continue;

    if (!deptIdx.has(dept)) deptIdx.set(dept, deptIdx.size);
    const dk = `${dept}|${div}`;
    if (!divIdx.has(dk)) {
      divIdx.set(dk, divisions.length);
      divisions.push([deptIdx.get(dept)!, div]);
    }
    if (!vendorIdx.has(vendor)) {
      vendorIdx.set(vendor, vendors.length);
      const isPerson = vendor === INDIVIDUALS;
      const osd = !isPerson && flags.osd(vendor) ? 1 : 0;
      const onContract = isPerson ? undefined : flags.contracts(vendor);
      const refs = (onContract ?? []).slice(0, 5).map((c) => {
        if (!contractIdx.has(c.url)) {
          contractIdx.set(c.url, contracts.length);
          contracts.push([c.title, c.url]);
        }
        return contractIdx.get(c.url)!;
      });
      vendors.push([vendor, osd, refs]);
    }
    const acct = r.account!;
    if (!accountIdx.has(acct)) accountIdx.set(acct, accountIdx.size);

    const key = `${divIdx.get(dk)}|${vendorIdx.get(vendor)}|${accountIdx.get(acct)}|${r.fy}`;
    const prev = merged.get(key);
    if (prev) {
      prev[4] += amount;
      prev[5] += Number(r.n);
    } else {
      const row: (typeof rows)[number] = [divIdx.get(dk)!, vendorIdx.get(vendor)!, accountIdx.get(acct)!, r.fy, amount, Number(r.n)];
      merged.set(key, row);
      rows.push(row);
    }
  }
  for (const row of rows) row[4] = Math.round(row[4]);

  const out = {
    builtAt: new Date().toISOString(),
    checkbookUpdatedAt: meta.rowsUpdatedAt ? new Date(meta.rowsUpdatedAt * 1000).toISOString() : null,
    fiscalYears: years.map(Number),
    departments: [...deptIdx.keys()],
    divisions,
    accounts: [...accountIdx.keys()],
    vendors,
    contracts,
    // [division, vendor, account, fiscal year, dollars, payments]
    rows: rows.filter((r) => r[4] !== 0),
  };
  // The state reloads the Checkbook in place; mid-reload it can be missing
  // whole years (2026-11-08: FY2026-27 gone, FY2025 cut at 2.2M rows). Refuse
  // to replace a snapshot with one that lost a year or a big share of one.
  const OUT = "src/data/spending.json";
  if (existsSync(OUT) && !process.env.FORCE) {
    const prev = JSON.parse(readFileSync(OUT, "utf8")) as typeof out;
    const totals = (rows: typeof out.rows) => {
      const m = new Map<number, number>();
      for (const r of rows) m.set(r[3], (m.get(r[3]) ?? 0) + r[4]);
      return m;
    };
    const before = totals(prev.rows);
    const after = totals(out.rows);
    const lost = [...before].filter(([fy, t]) => (after.get(fy) ?? 0) < t * 0.9);
    if (lost.length) {
      console.error(
        `Not writing ${OUT}: the Checkbook looks incomplete. Down >10% vs the current snapshot: ` +
          lost.map(([fy, t]) => `FY${fy} $${Math.round(t / 1e6)}M -> $${Math.round((after.get(fy) ?? 0) / 1e6)}M`).join(", ") +
          ". Run with FORCE=1 to write anyway.",
      );
      process.exit(1);
    }
  }
  writeFileSync(OUT, JSON.stringify(out));
  console.log(
    `Wrote ${out.rows.length} rows, ${vendors.length} vendors (${vendors.filter((v) => v[1]).length} OSD, ${vendors.filter((v) => v[2].length).length} on contract)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
