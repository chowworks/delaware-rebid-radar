import "server-only";
import raw from "@/data/spending.json";
import { ACCOUNTS, THRESHOLDS, slugify, type Tier } from "./spending-rules";

// Reads the Checkbook snapshot built by scripts/build-spending.ts and answers
// the questions on the spending pages.
//
// "Under the bid limit" is inferred, because payments carry no contract or PO
// number: a vendor's payments from one department in one fiscal year, summed
// per procurement tier, must stay under that tier's open-market limit. Vendors
// on a current state contract and individuals are never counted as under-limit
// spend. Payers the procurement code doesn't cover are left out of the
// snapshot entirely.

interface Snapshot {
  builtAt: string;
  checkbookUpdatedAt: string | null;
  fiscalYears: number[];
  departments: string[];
  divisions: [number, string][];
  accounts: string[];
  vendors: [string, 0 | 1, number[]][];
  contracts: [string, string][];
  rows: [number, number, number, number, number, number][];
}

const data = raw as unknown as Snapshot;

export const INDIVIDUALS = "Individual payees (names withheld)";
// A vendor paid at least this much by the whole state in some fiscal year is
// treated as a large supplier. Size is not in the open data; this is a proxy.
export const LARGE_SUPPLIER = 5_000_000;

export type Year = number | "all";
export type VendorSize = "large" | "small";

export interface Payment {
  dept: number;
  div: number;
  vendor: number;
  account: string;
  tier: Tier;
  fy: number;
  amount: number;
  payments: number;
  small: boolean;
}

export interface VendorInfo {
  name: string;
  slug: string;
  osd: boolean;
  contracts: { title: string; url: string }[];
  size: VendorSize;
  peakStateTotal: number;
}

let built: ReturnType<typeof build> | null = null;
const model = () => (built ??= build());

function build() {
  const statewide = new Map<string, number>(); // vendor|fy
  const groups = new Map<string, number>(); // dept|vendor|fy|tier, covered payers only

  for (const [div, vendor, acct, fy, amount] of data.rows) {
    const k = `${vendor}|${fy}`;
    statewide.set(k, (statewide.get(k) ?? 0) + amount);
    const g = `${data.divisions[div][0]}|${vendor}|${fy}|${ACCOUNTS[data.accounts[acct]].tier}`;
    groups.set(g, (groups.get(g) ?? 0) + amount);
  }

  const peak = new Map<number, number>();
  for (const [k, v] of statewide) {
    const id = Number(k.split("|")[0]);
    peak.set(id, Math.max(peak.get(id) ?? 0, v));
  }

  const vendors: VendorInfo[] = data.vendors.map(([name, osd, refs], i) => {
    const peakStateTotal = peak.get(i) ?? 0;
    return {
      name,
      slug: `${slugify(name)}-${i}`,
      osd: !!osd,
      contracts: refs.map((r) => ({ title: data.contracts[r][0], url: data.contracts[r][1] })),
      size: peakStateTotal >= LARGE_SUPPLIER ? "large" : "small",
      peakStateTotal,
    };
  });

  const payments: Payment[] = data.rows.map(([div, vendor, acct, fy, amount, n]) => {
    const [dept] = data.divisions[div];
    const account = data.accounts[acct];
    const tier = ACCOUNTS[account].tier;
    const groupTotal = groups.get(`${dept}|${vendor}|${fy}|${tier}`) ?? 0;
    const small =
      vendors[vendor].name !== INDIVIDUALS &&
      vendors[vendor].contracts.length === 0 &&
      groupTotal > 0 &&
      groupTotal < THRESHOLDS[tier].openMarket;
    return { dept, div, vendor, account, tier, fy, amount, payments: n, small };
  });

  const departments = data.departments.map((name, i) => ({ name, slug: slugify(name), index: i }));
  return { payments, vendors, departments };
}

export function snapshotInfo() {
  return {
    builtAt: data.builtAt,
    checkbookUpdatedAt: data.checkbookUpdatedAt,
    fiscalYears: data.fiscalYears,
    latestYear: data.fiscalYears[data.fiscalYears.length - 1],
  };
}

export function parseYear(v: string | string[] | undefined): Year {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return data.fiscalYears.includes(n) ? n : "all";
}

export function divisionName(div: number) {
  return data.divisions[div][1];
}

export function accountLabel(account: string) {
  return ACCOUNTS[account]?.label ?? account;
}

export function departmentSlugs() {
  return model().departments.map((d) => d.slug);
}

export function categorySlugs() {
  return Object.keys(ACCOUNTS).filter((a) => data.accounts.includes(a));
}

const inYear = (p: Payment, year: Year) => year === "all" || p.fy === year;

export interface Shares {
  total: number;
  large: number;
  small: number;
  osd: number;
}

function shares(list: Payment[], vendors: VendorInfo[]): Shares {
  const by: Shares = { total: 0, large: 0, small: 0, osd: 0 };
  for (const p of list) {
    by.total += p.amount;
    by[vendors[p.vendor].size] += p.amount;
    if (vendors[p.vendor].osd) by.osd += p.amount;
  }
  return by;
}

export interface VendorRow {
  vendor: VendorInfo;
  total: number;
  payments: number;
  byYear: Record<number, number>;
  categories: { account: string; label: string; total: number }[];
  divisions: { name: string; total: number }[];
  departments: { name: string; slug: string; total: number }[];
}

function vendorRows(list: Payment[], vendors: VendorInfo[]): VendorRow[] {
  const deps = model().departments;
  const map = new Map<number, { total: number; payments: number; byYear: Record<number, number>; cat: Map<string, number>; div: Map<number, number>; dept: Map<number, number> }>();
  for (const p of list) {
    let v = map.get(p.vendor);
    if (!v) map.set(p.vendor, (v = { total: 0, payments: 0, byYear: {}, cat: new Map(), div: new Map(), dept: new Map() }));
    v.total += p.amount;
    v.payments += p.payments;
    v.byYear[p.fy] = (v.byYear[p.fy] ?? 0) + p.amount;
    v.cat.set(p.account, (v.cat.get(p.account) ?? 0) + p.amount);
    v.div.set(p.div, (v.div.get(p.div) ?? 0) + p.amount);
    v.dept.set(p.dept, (v.dept.get(p.dept) ?? 0) + p.amount);
  }
  const sorted = <K,>(m: Map<K, number>) => [...m].filter(([, t]) => t > 0).sort((a, b) => b[1] - a[1]);
  return [...map]
    .filter(([, v]) => v.total > 0)
    .map(([id, v]) => ({
      vendor: vendors[id],
      total: v.total,
      payments: v.payments,
      byYear: v.byYear,
      categories: sorted(v.cat).map(([account, total]) => ({ account, label: accountLabel(account), total })),
      divisions: sorted(v.div).map(([div, total]) => ({ name: divisionName(div), total })),
      departments: sorted(v.dept).map(([d, total]) => ({ name: deps[d].name, slug: deps[d].slug, total })),
    }))
    .sort((a, b) => b.total - a.total);
}

// Every department, ranked by spend under the bid limits.
export function departmentSummaries(year: Year) {
  const { payments, vendors, departments } = model();
  return departments
    .map((d) => {
      const mine = payments.filter((p) => p.dept === d.index && inYear(p, year));
      const small = mine.filter((p) => p.small);
      const by = shares(small, vendors);
      return {
        ...d,
        smallTotal: by.total,
        allTotal: mine.reduce((s, p) => s + p.amount, 0),
        vendorCount: new Set(small.map((p) => p.vendor)).size,
        shares: by,
      };
    })
    .filter((d) => d.allTotal > 0)
    .sort((a, b) => b.smallTotal - a.smallTotal);
}

export function departmentDetail(slug: string, year: Year, divisionSlug?: string) {
  const { payments, vendors, departments } = model();
  const dept = departments.find((d) => d.slug === slug);
  if (!dept) return null;
  const mineAllDivs = payments.filter((p) => p.dept === dept.index);

  const divTotals = new Map<number, { small: number; all: number }>();
  for (const p of mineAllDivs) {
    if (!inYear(p, year)) continue;
    const t = divTotals.get(p.div) ?? { small: 0, all: 0 };
    t.all += p.amount;
    if (p.small) t.small += p.amount;
    divTotals.set(p.div, t);
  }
  const divisions = [...divTotals]
    .map(([div, t]) => ({ name: divisionName(div), slug: slugify(divisionName(div)), ...t }))
    .filter((d) => d.all > 0)
    .sort((a, b) => b.small - a.small || b.all - a.all);
  const division = divisions.find((d) => d.slug === divisionSlug) ?? null;

  const scoped = mineAllDivs.filter((p) => !division || divisionName(p.div) === division.name);
  const small = scoped.filter((p) => p.small && inYear(p, year));
  const all = scoped.filter((p) => inYear(p, year));
  const byYear = data.fiscalYears.map((fy) => ({
    fy,
    small: scoped.filter((p) => p.small && p.fy === fy).reduce((s, p) => s + p.amount, 0),
    all: scoped.filter((p) => p.fy === fy).reduce((s, p) => s + p.amount, 0),
  }));
  const rows = vendorRows(small, vendors);
  const by = shares(small, vendors);
  return {
    dept,
    divisions,
    division,
    smallTotal: by.total,
    allTotal: all.reduce((s, p) => s + p.amount, 0),
    shares: by,
    byYear,
    vendors: rows,
    largeVendors: rows.filter((r) => r.vendor.size === "large"),
  };
}

// All purchase spend (bid and unbid), per category, with how concentrated
// each category is in its top vendor.
export function categorySummaries(year: Year) {
  const { payments } = model();
  const by = new Map<string, Map<number, number>>();
  for (const p of payments) {
    if (!inYear(p, year) || p.amount <= 0) continue;
    const m = by.get(p.account) ?? new Map<number, number>();
    m.set(p.vendor, (m.get(p.vendor) ?? 0) + p.amount);
    by.set(p.account, m);
  }
  const { vendors } = model();
  return [...by]
    .map(([account, m]) => {
      const list = [...m.values()].filter((v) => v > 0).sort((a, b) => b - a);
      const total = list.reduce((s, v) => s + v, 0);
      const top = [...m].sort((a, b) => b[1] - a[1])[0];
      return {
        account,
        label: accountLabel(account),
        tier: ACCOUNTS[account].tier,
        total,
        vendorCount: list.length,
        top: vendors[top[0]],
        topShare: top[1] / total,
        top3Share: list.slice(0, 3).reduce((s, v) => s + v, 0) / total,
        // Herfindahl index on a 0-10,000 scale; above 2,500 is "highly concentrated".
        hhi: Math.round(list.reduce((s, v) => s + (v / total) ** 2, 0) * 10_000),
      };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function categoryDetail(account: string, year: Year, deptSlug?: string) {
  if (!ACCOUNTS[account]) return null;
  const { payments, vendors, departments } = model();
  const inCat = payments.filter((p) => p.account === account);
  const dept = departments.find((d) => d.slug === deptSlug) ?? null;
  const scoped = inCat.filter((p) => inYear(p, year) && (!dept || p.dept === dept.index));
  const rows = vendorRows(scoped, vendors);
  const total = rows.reduce((s, r) => s + r.total, 0);
  const deptTotals = new Map<number, number>();
  for (const p of inCat) if (inYear(p, year)) deptTotals.set(p.dept, (deptTotals.get(p.dept) ?? 0) + p.amount);
  return {
    account,
    label: accountLabel(account),
    tier: ACCOUNTS[account].tier,
    dept,
    total,
    smallTotal: scoped.filter((p) => p.small).reduce((s, p) => s + p.amount, 0),
    vendors: rows,
    shares: shares(scoped, vendors),
    departments: [...deptTotals]
      .filter(([, t]) => t > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([d, t]) => ({ name: departments[d].name, slug: departments[d].slug, total: t })),
    byYear: data.fiscalYears.map((fy) => ({
      fy,
      all: inCat.filter((p) => p.fy === fy && (!dept || p.dept === dept.index)).reduce((s, p) => s + p.amount, 0),
    })),
  };
}

// Payment-level rows behind a figure, as a CSV straight from the state's portal.
export function checkbookCsv(opts: { department?: string; vendor?: string; account?: string; year?: Year }) {
  const where: string[] = [];
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  if (opts.department) where.push(`department=${q(opts.department)}`);
  if (opts.vendor && opts.vendor !== INDIVIDUALS) where.push(`vendor=${q(opts.vendor)}`);
  where.push(opts.account ? `account=${q(opts.account)}` : `account in(${Object.keys(ACCOUNTS).map(q).join(",")})`);
  if (opts.year && opts.year !== "all") where.push(`fiscal_year=${q(String(opts.year))}`);
  const params = new URLSearchParams({
    $select: "fiscal_year,check_date,department,division,vendor,account,account_descr,approp_descr,check_number,amount",
    $where: where.join(" AND "),
    $order: "check_date DESC",
    $limit: "10000",
  });
  return `https://data.delaware.gov/resource/7bip-nb4g.csv?${params}`;
}
