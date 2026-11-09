// Builds src/data/pcard.json: state purchase-card (P-card) spend by merchant,
// for the "Where are you spending?" pages.
//   npm run build:pcard
//
// P-card purchases reach the Checkbook (7bip-nb4g) only as one row per card
// transaction paid to "DIV OF ACCOUNTING" (check number "PCA"), with the
// paying division and account but no merchant. build-spending.ts drops those
// rows as payments to a state office. The merchant is in a separate dataset,
// State Employee Credit Card Transactions (nurt-5rqw), which has department,
// division, merchant, the merchant's card category, date and amount, but no
// account. The two share no ID, so this script pairs them on amount, a posting
// lag of a few days to two months, and department or division name. About
// 93% of card transactions pair up.
//
// From the pairs it learns how card departments/divisions map to Checkbook
// ones and which account each merchant and card category is booked to, then
// applies that to every card transaction (including months the Checkbook
// doesn't have yet). Purchases booked to accounts outside the purchase
// allowlist (travel, lodging, meals, dues, conference fees) are left out, as
// are payers the procurement code doesn't cover and payments to governments.
import { writeFileSync } from "node:fs";
import { ACCOUNTS, isExemptPayer, isPublicPayee } from "../src/lib/spending-rules";
import { cleanMerchant } from "./merchants";
import { loadVendorFlags, pages, soda } from "./socrata";

const CHECKBOOK = "7bip-nb4g";
const PCARD = "nurt-5rqw";
const FIRST_FY = 2021; // first Checkbook year

interface CbRaw { department?: string; division?: string; account?: string; check_date?: string; amount?: string }
interface PcRaw {
  fiscal_year?: string; dept_name?: string; div_name?: string; merchant?: string;
  cat_descr?: string; trans_dt?: string; merchandise_amt?: string;
}

const day = (s: string) => Math.floor(Date.parse(s.slice(0, 10)) / 86_400_000);
const norm = (s: string) => s.toUpperCase().replace(/&/g, " AND ").replace(/[^A-Z0-9]+/g, " ").trim();
// Names are cut at different lengths in the two datasets.
function sameName(a: string, b: string, min: number) {
  const n = Math.min(a.length, b.length);
  return n >= min && a.slice(0, n) === b.slice(0, n);
}

function vote<K>(m: Map<K, Map<string, number>>, k: K, v: string, w: number) {
  let inner = m.get(k);
  if (!inner) m.set(k, (inner = new Map()));
  inner.set(v, (inner.get(v) ?? 0) + w);
}
function winner<K>(m: Map<K, Map<string, number>>, k: K): string | undefined {
  const inner = m.get(k);
  if (!inner) return undefined;
  return [...inner].sort((a, b) => b[1] - a[1])[0][0];
}

async function main() {
  const [meta, years] = await Promise.all([
    fetch(`https://data.delaware.gov/api/views/${PCARD}.json`)
      .then((r) => r.json() as Promise<{ rowsUpdatedAt?: number }>)
      .catch(() => ({}) as { rowsUpdatedAt?: number }),
    soda<{ fiscal_year: string }>(PCARD, { $select: "fiscal_year", $group: "fiscal_year", $order: "fiscal_year" }),
  ]);
  const fys = years.map((r) => Number(r.fiscal_year)).filter((fy) => fy >= FIRST_FY);
  const cbYears = (await soda<{ fiscal_year: string }>(CHECKBOOK, { $select: "fiscal_year", $group: "fiscal_year" })).map((r) => r.fiscal_year);

  console.log(`Card years ${fys.join(", ")}; Checkbook years ${cbYears.join(", ")}`);
  const pcRaw = (
    await Promise.all(
      fys.map((fy) =>
        pages<PcRaw>(PCARD, {
          $select: "fiscal_year, dept_name, div_name, merchant, cat_descr, trans_dt, merchandise_amt",
          $where: `fiscal_year=${fy}`,
          $order: ":id",
        }),
      ),
    )
  ).flat();
  const cbRaw = (
    await Promise.all(
      cbYears.map((fy) =>
        pages<CbRaw>(CHECKBOOK, {
          $select: "department, division, account, check_date, amount",
          $where: `fiscal_year='${fy}' AND starts_with(check_number,'PC') AND vendor='DIV OF ACCOUNTING'`,
          $order: ":id",
        }),
      ),
    )
  ).flat();
  console.log(`${pcRaw.length} card transactions, ${cbRaw.length} Checkbook card rows`);

  const cb = cbRaw
    .filter((r) => r.check_date && r.amount && r.department)
    .map((r) => ({
      dept: r.department!, div: r.division ?? "UNKNOWN", acct: r.account ?? "",
      nd: norm(r.department!), nv: norm(r.division ?? ""), date: day(r.check_date!),
      cents: Math.round(Number(r.amount) * 100), used: false,
    }));
  const pc = pcRaw
    .filter((r) => r.trans_dt && r.merchandise_amt && r.dept_name)
    .map((r) => ({
      fy: Number(r.fiscal_year), dept: r.dept_name!.trim(), div: (r.div_name ?? "").trim(),
      nd: norm(r.dept_name!), nv: norm(r.div_name ?? ""),
      merchant: cleanMerchant(r.merchant ?? "UNKNOWN"), cat: r.cat_descr ?? "",
      date: day(r.trans_dt!), cents: Math.round(Number(r.merchandise_amt) * 100),
    }))
    .sort((a, b) => a.date - b.date);

  // Pair each card transaction with an unused Checkbook row of the same amount
  // posted -5..60 days later from the same department or division, closest to
  // the typical ~18 day lag; matching both names wins.
  const byCents = new Map<number, typeof cb>();
  for (const r of cb) {
    const l = byCents.get(r.cents) ?? [];
    l.push(r);
    byCents.set(r.cents, l);
  }
  const pair = new Array<(typeof cb)[number] | undefined>(pc.length);
  let pairedDollars = 0;
  let cardDollars = 0; // in years the Checkbook has
  let cardCount = 0;
  const cbFys = new Set(cbYears.map(Number));
  pc.forEach((p, i) => {
    if (cbFys.has(p.fy)) {
      cardDollars += p.cents;
      cardCount++;
    }
    let best: (typeof cb)[number] | undefined;
    let bestCost = Infinity;
    for (const c of byCents.get(p.cents) ?? []) {
      if (c.used) continue;
      const lag = c.date - p.date;
      if (lag < -5 || lag > 60) continue;
      const d = sameName(p.nd, c.nd, 8);
      const v = sameName(p.nv, c.nv, 5);
      if (!d && !v) continue;
      const cost = Math.abs(lag - 18) - (d && v ? 100 : 0);
      if (cost < bestCost) [best, bestCost] = [c, cost];
    }
    if (best) {
      best.used = true;
      pair[i] = best;
      pairedDollars += p.cents;
    }
  });
  const paired = pair.filter(Boolean).length;
  console.log(`Paired ${paired}/${cardCount} (${((paired / cardCount) * 100).toFixed(1)}%), ${((pairedDollars / cardDollars) * 100).toFixed(1)}% of dollars`);

  // Learn mappings from the pairs.
  const divMap = new Map<string, Map<string, number>>(); // card dept|div -> cb dept|div
  const deptMap = new Map<string, Map<string, number>>(); // card dept -> cb dept|first div
  const acctByMerchantCat = new Map<string, Map<string, number>>();
  const acctByMerchant = new Map<string, Map<string, number>>();
  const acctByCat = new Map<string, Map<string, number>>();
  pc.forEach((p, i) => {
    const c = pair[i];
    if (!c) return;
    const w = Math.abs(p.cents);
    vote(divMap, `${p.dept}|${p.div}`, `${c.dept}|${c.div}`, w);
    vote(deptMap, p.dept, `${c.dept}|${c.div}`, w);
    vote(acctByMerchantCat, `${p.merchant}|${p.cat}`, c.acct, w);
    vote(acctByMerchant, p.merchant, c.acct, w);
    vote(acctByCat, p.cat, c.acct, w);
  });

  const flags = await loadVendorFlags();
  const divisions: [string, string][] = [];
  const divIdx = new Map<string, number>();
  const merchants: [string, 0 | 1, number[]][] = [];
  const merchantIdx = new Map<string, number>();
  const contracts: [string, string][] = [];
  const contractIdx = new Map<string, number>();
  const accounts: string[] = [];
  const accountIdx = new Map<string, number>();
  const merged = new Map<string, [number, number, number, number, number, number]>();
  const skipped = { unmapped: 0, notPurchase: 0, exempt: 0, publicPayee: 0 };

  pc.forEach((p, i) => {
    const c = pair[i];
    const where = c ? `${c.dept}|${c.div}` : winner(divMap, `${p.dept}|${p.div}`) ?? winner(deptMap, p.dept);
    if (!where) return void (skipped.unmapped += p.cents);
    const [dept, div] = where.split("|");
    // Without a pair the division may be one the department's pairs never saw.
    const division = c || divMap.has(`${p.dept}|${p.div}`) ? div : p.div.toUpperCase() || div;
    const acct =
      c?.acct ??
      winner(acctByMerchantCat, `${p.merchant}|${p.cat}`) ??
      winner(acctByMerchant, p.merchant) ??
      winner(acctByCat, p.cat);
    if (!acct || !ACCOUNTS[acct]) return void (skipped.notPurchase += p.cents);
    if (isExemptPayer(dept, division)) return void (skipped.exempt += p.cents);
    if (isPublicPayee(p.merchant)) return void (skipped.publicPayee += p.cents);

    const dk = `${dept}|${division}`;
    if (!divIdx.has(dk)) {
      divIdx.set(dk, divisions.length);
      divisions.push([dept, division]);
    }
    if (!merchantIdx.has(p.merchant)) {
      merchantIdx.set(p.merchant, merchants.length);
      const refs = (flags.contracts(p.merchant) ?? []).slice(0, 5).map((ct) => {
        if (!contractIdx.has(ct.url)) {
          contractIdx.set(ct.url, contracts.length);
          contracts.push([ct.title, ct.url]);
        }
        return contractIdx.get(ct.url)!;
      });
      merchants.push([p.merchant, flags.osd(p.merchant) ? 1 : 0, refs]);
    }
    if (!accountIdx.has(acct)) {
      accountIdx.set(acct, accounts.length);
      accounts.push(acct);
    }
    const key = `${divIdx.get(dk)}|${merchantIdx.get(p.merchant)}|${accountIdx.get(acct)}|${p.fy}`;
    const row = merged.get(key);
    if (row) {
      row[4] += p.cents;
      row[5] += 1;
    } else {
      merged.set(key, [divIdx.get(dk)!, merchantIdx.get(p.merchant)!, accountIdx.get(acct)!, p.fy, p.cents, 1]);
    }
  });

  const rows = [...merged.values()]
    .map((r) => [r[0], r[1], r[2], r[3], Math.round(r[4] / 100), r[5]] as typeof r)
    .filter((r) => r[4] !== 0);
  const out = {
    builtAt: new Date().toISOString(),
    pcardUpdatedAt: meta.rowsUpdatedAt ? new Date(meta.rowsUpdatedAt * 1000).toISOString() : null,
    fiscalYears: fys,
    // Share of card dollars paired with a Checkbook row, in years both cover.
    matchRate: Math.round((pairedDollars / cardDollars) * 1000) / 1000,
    divisions,
    accounts,
    // [merchant, OSD certified (0/1), contract refs]
    merchants,
    contracts,
    // [division, merchant, account, fiscal year, dollars, transactions]
    rows,
  };
  writeFileSync("src/data/pcard.json", JSON.stringify(out));
  const kept = rows.reduce((s, r) => s + r[4], 0);
  const m = (cents: number) => `$${(cents / 1e8).toFixed(1)}M`;
  console.log(
    `Wrote ${rows.length} rows, ${merchants.length} merchants, $${(kept / 1e6).toFixed(1)}M kept. ` +
      `Left out: travel/dues/other non-purchase ${m(skipped.notPurchase)}, exempt payers ${m(skipped.exempt)}, ` +
      `governments ${m(skipped.publicPayee)}, unmapped ${m(skipped.unmapped)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
