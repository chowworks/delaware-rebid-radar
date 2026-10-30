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
import { writeFileSync } from "node:fs";
import { ACCOUNTS, isExemptPayer, isPublicPayee, normalizeVendor } from "../src/lib/spending-rules";

const BASE = "https://data.delaware.gov/resource";
const CHECKBOOK = "7bip-nb4g";
const PAGE = 50_000;
const INDIVIDUALS = "Individual payees (names withheld)";

async function soda<T>(id: string, params: Record<string, string>): Promise<T[]> {
  const url = `${BASE}/${id}.json?${new URLSearchParams(params)}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 5) throw new Error(`${id}: ${err}`);
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
}

async function pages<T>(id: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const rows = await soda<T>(id, { ...params, $limit: String(PAGE), $offset: String(offset) });
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

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

  const [contractVendors, osdFirms, meta] = await Promise.all([
    soda<{ companyname?: string; contracttitle?: string; contracturl?: { url?: string } }>("h9bb-iyu6", {
      $select: "companyname, contracttitle, contracturl",
      $limit: "50000",
    }),
    soda<{ name?: string; certificatenumber?: string }>("8dxf-6ahp", { $select: "name, certificatenumber", $limit: "50000" }),
    fetch(`https://data.delaware.gov/api/views/${CHECKBOOK}.json`).then((r) => r.json() as Promise<{ rowsUpdatedAt?: number }>),
  ]);

  const contractsByName = new Map<string, { title: string; url: string }[]>();
  for (const v of contractVendors) {
    if (!v.companyname) continue;
    const key = normalizeVendor(v.companyname);
    const list = contractsByName.get(key) ?? [];
    const url = (v.contracturl?.url ?? "").replace(/^http:/, "https:");
    if (!list.some((c) => c.url === url)) list.push({ title: v.contracttitle ?? "State contract", url });
    contractsByName.set(key, list);
  }
  const osdNames = new Set(osdFirms.filter((f) => f.name).map((f) => normalizeVendor(f.name!)));
  const contractKeys = [...contractsByName.keys()];

  // The Checkbook cuts names at 40 characters; for those, accept a list name
  // that starts with the cut name minus its last (possibly partial) word.
  function lookup<V>(raw: string, exact: (k: string) => V | undefined, keys: Iterable<string>): V | undefined {
    const key = normalizeVendor(raw);
    const hit = exact(key);
    if (hit !== undefined || raw.length < 38) return hit;
    const stem = key.split(" ").slice(0, -1).join(" ");
    if (stem.length < 12) return undefined;
    for (const k of keys) if (k.startsWith(stem)) return exact(k);
    return undefined;
  }

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
      const osd = !isPerson && lookup(vendor, (k) => (osdNames.has(k) ? true : undefined), osdNames) ? 1 : 0;
      const onContract = isPerson ? undefined : lookup(vendor, (k) => contractsByName.get(k), contractKeys);
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
  writeFileSync("src/data/spending.json", JSON.stringify(out));
  console.log(
    `Wrote ${out.rows.length} rows, ${vendors.length} vendors (${vendors.filter((v) => v[1]).length} OSD, ${vendors.filter((v) => v[2].length).length} on contract)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
