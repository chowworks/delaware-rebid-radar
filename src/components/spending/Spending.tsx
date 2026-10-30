import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import {
    categoryDetail,
  categorySummaries,
  checkbookCsv,
  departmentDetail,
  departmentSummaries,
  departmentTree,
  snapshotInfo,
  emptyShares,
  sizeSourceDate,
  type Shares,
  type VendorInfo,
  type VendorRow,
  type Year,
} from "@/lib/spending";
import { THRESHOLDS, THRESHOLD_SOURCE, type Tier } from "@/lib/spending-rules";
import { THEMES, type Theme, type Variant } from "./theme";

// "Where are you spending?" pages, shared by both designs.
//   /spending                      departments, small purchases (under the bid limits)
//   /spending/[dept]               one department (?division=), its vendors
//   /spending/categories           all purchase spend by category
//   /spending/categories/[account] one category, vendor concentration
// Every page takes ?fy=2026 (default: all years).

const OSD_DIRECTORY = "https://data.delaware.gov/d/8dxf-6ahp";
const OPEN_BIDS = "https://mmp.delaware.gov/";

function href(path: string, q: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "all") params.set(k, String(v));
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

function yearLabel(fy: Year) {
  if (fy === "all") return "All years";
  return fy === snapshotInfo().latestYear ? `FY${fy} to date` : `FY${fy}`;
}

function yearPhrase(fy: Year) {
  return fy === "all" ? "all years" : yearLabel(fy);
}

function yearSpan() {
  const { fiscalYears } = snapshotInfo();
  return `FY${fiscalYears[0]}–FY${fiscalYears[fiscalYears.length - 1]}`;
}

function Hero({ t, eyebrow, title, children, crumbs }: { t: Theme; eyebrow: string; title: string; children?: React.ReactNode; crumbs?: [string, string][] }) {
  return (
    <div className={t.heroBand}>
      <div className={t.hero}>
        {crumbs && (
          <nav className={`mb-4 flex flex-wrap gap-x-2 text-sm ${t.muted}`}>
            {crumbs.map(([label, to]) => (
              <span key={to} className="flex gap-2">
                <Link href={to} className={t.link}>{label}</Link>
                <span aria-hidden="true">/</span>
              </span>
            ))}
          </nav>
        )}
        <p className={t.eyebrow}>{eyebrow}</p>
        <h1 className={`mt-2 max-w-4xl ${t.h1}`}>{title}</h1>
        {children && <div className={`mt-4 max-w-3xl ${t.lead}`}>{children}</div>}
      </div>
    </div>
  );
}

function YearTabs({ t, year, path, keep = {} }: { t: Theme; year: Year; path: string; keep?: Record<string, string | undefined> }) {
  const years: Year[] = ["all", ...[...snapshotInfo().fiscalYears].reverse()];
  return (
    <nav aria-label="Fiscal year" className="flex flex-wrap gap-1.5">
      {years.map((y) => (
        <Link key={y} href={href(path, { ...keep, fy: y })} className={y === year ? t.tabOn : t.tab} aria-current={y === year ? "page" : undefined}>
          {yearLabel(y)}
        </Link>
      ))}
    </nav>
  );
}

function Badge({ className, children, title }: { className: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

const DEPT_COLS = "grid-cols-[minmax(0,1fr)_12rem_4.5rem_4.5rem_4.5rem_3.5rem]";

const SIZE_LABEL = { large: "Large business", small: "Small business", nonprofit: "Nonprofit", unknown: "Size unknown" } as const;

function VendorBadges({ t, vendor: v }: { t: Theme; vendor: VendorInfo }) {
  const title = v.sizeMatch ? `Federal award records for ${v.sizeMatch}` : undefined;
  return (
    <>
      {v.size === "large" && <Badge className={t.badgeLarge} title={title}>Large business</Badge>}
      {v.size === "small" && <Badge className={t.badgeSmall} title={title}>Small business</Badge>}
      {v.size === "nonprofit" && <Badge className={t.badgeNonprofit} title={title}>Nonprofit</Badge>}
      {v.osd && <Badge className={t.badgeOsd}>OSD-certified</Badge>}
      {v.contracts.length > 0 && <Badge className={t.badgeContract}>On state contract</Badge>}
    </>
  );
}

function Bar({ t, value, max, className }: { t: Theme; value: number; max: number; className?: string }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${t.barTrack}`}>
      <div className={`h-full rounded-full ${className ?? t.bar}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function Stat({ t, value, label, sub }: { t: Theme; value: string; label: string; sub?: string }) {
  return (
    <div className={`${t.card} p-4`}>
      <p className={t.stat}>{value}</p>
      <p className={`mt-1 text-sm ${t.text}`}>{label}</p>
      {sub && <p className={`mt-1 text-xs ${t.muted}`}>{sub}</p>}
    </div>
  );
}

function SizeSplit({ t, s }: { t: Theme; s: Shares }) {
  const parts = [
    { key: "large", color: t.barLarge, value: s.large },
    { key: "small", color: t.bar, value: s.small },
    { key: "nonprofit", color: t.barNonprofit, value: s.nonprofit },
    { key: "unknown", color: t.barUnknown, value: s.unknown },
  ] as const;
  return (
    <div>
      <div className={`flex h-2.5 w-full overflow-hidden rounded-full ${t.barTrack}`}>
        {parts.map((p) => (
          <div key={p.key} className={p.color} style={{ width: `${s.total ? (p.value / s.total) * 100 : 0}%` }} />
        ))}
      </div>
      <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${t.muted}`}>
        {parts.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${p.color}`} />
            {SIZE_LABEL[p.key]} {fmtPct(p.value, s.total)}
          </span>
        ))}
        <span>OSD-certified firms {fmtPct(s.osd, s.total)}</span>
      </div>
    </div>
  );
}

// What "small purchases" means, in one line. The full limits and the method
// open in a panel from the (i), on hover where hover exists and on tap or
// keyboard everywhere (same pattern as DataSource).
function SmallPurchaseNote({ t }: { t: Theme }) {
  const tiers: Tier[] = ["goods", "prof", "works"];
  return (
    <div className={`${t.note} flex flex-wrap items-start gap-x-2 gap-y-1 px-4 py-3 text-sm leading-relaxed`}>
      <p className="min-w-0 flex-1">
        <strong>Small purchases</strong> are buys under Delaware&apos;s open-market limits ({fmtMoney(THRESHOLDS.goods.openMarket)} goods
        and services, {fmtMoney(THRESHOLDS.prof.openMarket)} professional services, {fmtMoney(THRESHOLDS.works.openMarket)} public
        works) that need no public bid. Only those are shown here; larger purchases are bid publicly on{" "}
        <a className={t.link} href={OPEN_BIDS}>MMP</a>. Which payments count is our estimate.
      </p>
      <details className="group relative [&::details-content]:[content-visibility:visible]">
        <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap font-medium underline underline-offset-2 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold no-underline">i</span>
          How this works
        </summary>
        <div className={`absolute right-0 top-full z-40 mt-2 hidden w-[min(34rem,calc(100vw-2rem))] rounded-xl border p-5 text-[13px] leading-relaxed shadow-xl group-open:block group-hover:block ${t.popover}`}>
          <p className="font-semibold">Delaware&apos;s purchase limits</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {tiers.map((k) => {
              const th = THRESHOLDS[k];
              return (
                <div key={k}>
                  <p className="text-xs font-semibold">{th.label}</p>
                  <ul className={`mt-1 space-y-0.5 text-xs ${t.muted}`}>
                    {th.steps.map(([range, rule]) => (
                      <li key={range}>{range}: {rule}</li>
                    ))}
                  </ul>
                  <p className={`mt-1 text-xs ${t.muted}`}>{th.basis}.</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 font-semibold">How we pick out small purchases</p>
          <p className="mt-1">
            Payment records don&apos;t say which contract or purchase order a payment belongs to. So we add up what each
            department paid each vendor in a fiscal year, per category, and count it only when that total stays under the
            open-market limit and the vendor isn&apos;t on a current state contract. A run of small payments that adds up past
            the limit is left out.
          </p>
          <p className="mt-3">
            For open-market purchases, agencies must ask at least one{" "}
            <a className={t.link} href={OSD_DIRECTORY}>certified diverse vendor</a> for a quote.
          </p>
          <p className={`mt-3 text-xs ${t.muted}`}>
            Source: Division of Accounting, <a className={t.link} href={THRESHOLD_SOURCE}>small purchase rules</a> (29 Del. C. ch. 69).
          </p>
        </div>
      </details>
    </div>
  );
}

function DataNote({ t }: { t: Theme }) {
  const info = snapshotInfo();
  return (
    <section className={`mt-10 border-t ${t.border} pt-6 text-xs leading-relaxed ${t.muted}`}>
      <p>
        Source: <a className={t.link} href="https://data.delaware.gov/d/7bip-nb4g">Checkbook Expenditure Details</a>,{" "}
        {yearSpan()}, payments to vendors for goods and services only (no salaries, benefits, grants, subsidies, Medicaid,
        loans or transfers). Snapshot taken {fmtDate(info.builtAt.slice(0, 10))}
        {info.checkbookUpdatedAt && <>; the state last updated the data {fmtDate(info.checkbookUpdatedAt.slice(0, 10))}</>}.
        State fiscal years run July to June.
      </p>
      <p className="mt-2">
        Left out: school districts, charter schools, DSU, DTCC, UD and the Legislature (not covered by the state procurement
        code), and payments to other governments and state accounts. Payments to individuals are pooled and never counted
        as small purchases. Company size isn&apos;t in Delaware&apos;s data, so it comes from federal award records on{" "}
        <a className={t.link} href="https://www.usaspending.gov/">USAspending.gov</a> (looked up {fmtDate(sizeSourceDate.slice(0, 10))}):
        &ldquo;large business&rdquo; means the firm is on federal record (SAM.gov registration and federal awards) as
        other than small under SBA size standards; &ldquo;small business&rdquo; means it is recorded as small and has been
        paid on a federal award. Vendors with no federal record, or whose names didn&apos;t match, show as size unknown,
        and that is most local vendors.
        &ldquo;On state contract&rdquo; and &ldquo;OSD-certified&rdquo; come from matching names against{" "}
        <a className={t.link} href="https://data.delaware.gov/d/h9bb-iyu6">Awarded Vendor Contact Info</a> and the{" "}
        <a className={t.link} href={OSD_DIRECTORY}>OSD certified firms list</a>, so a few matches will be missed, and
        contracts that ended before today aren&apos;t in that list.
      </p>
    </section>
  );
}

function SpendTabs({ t, active, year }: { t: Theme; active: "small" | "all"; year: Year }) {
  const tabs = [
    { key: "small", label: "Small purchases", to: href("/spending", { fy: year }) },
    { key: "all", label: "All spending by category", to: href("/spending/categories", { fy: year }) },
  ];
  return (
    <nav className={`flex gap-6 border-b ${t.border} text-sm`}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.to}
          className={`-mb-px border-b-2 pb-2 ${tab.key === active ? `border-current font-semibold ${t.text}` : `border-transparent ${t.muted}`}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

// One vendor, opened for detail. `scope` says what the per-place list holds.
function VendorDetails({ t, row, max, scope, csv }: { t: Theme; row: VendorRow; max: number; scope: "divisions" | "departments"; csv: string }) {
  const { fiscalYears } = snapshotInfo();
  const places = scope === "divisions" ? row.divisions.map((d) => ({ ...d, slug: undefined as string | undefined })) : row.departments;
  const yearMax = Math.max(...Object.values(row.byYear), 0);
  return (
    <details className="group">
      <summary className={`grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_6rem_1rem] ${t.rowHover} [&::-webkit-details-marker]:hidden`}>
        <span className="min-w-0">
          <span className={`block truncate font-medium ${t.text}`}>{row.vendor.name}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            <VendorBadges t={t} vendor={row.vendor} />
            <span className={`text-xs ${t.muted}`}>{row.categories.slice(0, 2).map((c) => c.label).join(", ")}</span>
          </span>
        </span>
        <span className="text-right sm:text-left">
          <span className={`block font-semibold tabular ${t.text}`}>{fmtMoney(row.total)}</span>
          <span className="mt-1 block w-24 sm:w-full"><Bar t={t} value={row.total} max={max} className={row.vendor.size === "large" ? t.barLarge : undefined} /></span>
        </span>
        <span className={`hidden text-right text-sm tabular sm:block ${t.muted}`}>{row.payments.toLocaleString()}</span>
        <span className={`hidden text-xs sm:block ${t.muted} transition group-open:rotate-90`} aria-hidden="true">▶</span>
      </summary>
      <div className={`grid gap-6 border-t ${t.border} px-4 py-4 text-sm md:grid-cols-4`}>
        <div>
          <p className={t.h3}>By fiscal year</p>
          <ul className="mt-2 space-y-1.5">
            {fiscalYears.map((fy) => (
              <li key={fy} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-2 text-xs">
                <span className={t.muted}>FY{fy}</span>
                <Bar t={t} value={row.byYear[fy] ?? 0} max={yearMax} />
                <span className={`text-right tabular ${t.text}`}>{row.byYear[fy] ? fmtMoney(row.byYear[fy]) : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={t.h3}>What for</p>
          <ul className="mt-2 space-y-1 text-xs">
            {row.categories.slice(0, 6).map((c) => (
              <li key={c.account} className="flex justify-between gap-2">
                <Link className={t.link} href={`/spending/categories/${c.account}`}>{c.label}</Link>
                <span className={`tabular ${t.text}`}>{fmtMoney(c.total)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={t.h3}>{scope === "divisions" ? "Which divisions" : "Which departments"}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {places.slice(0, 6).map((p) => (
              <li key={p.name} className="flex justify-between gap-2">
                {p.slug ? <Link className={t.link} href={`/spending/${p.slug}`}>{p.name}</Link> : <span className={t.text}>{p.name}</span>}
                <span className={`tabular ${t.text}`}>{fmtMoney(p.total)}</span>
              </li>
            ))}
            {places.length > 6 && <li className={t.muted}>+{places.length - 6} more</li>}
          </ul>
        </div>
        <div>
          <p className={t.h3}>Where to learn more</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {row.vendor.name.startsWith("Individual") ? (
              <li className={t.muted}>Names of individual payees are not shown here.</li>
            ) : (
              <li><a className={t.link} href={csv}>Every payment, from the state (CSV)</a></li>
            )}
            {row.vendor.contracts.map((c) => (
              <li key={c.url}><a className={t.link} href={c.url}>State contract: {c.title}</a></li>
            ))}
            {row.vendor.osd && <li><a className={t.link} href={OSD_DIRECTORY}>OSD certified firms list</a></li>}
            <li className={t.muted}>
              The state paid this vendor {fmtMoney(row.vendor.peakStateTotal)} in its biggest year, across all departments.
            </li>
          </ul>
        </div>
      </div>
    </details>
  );
}

function VendorList({ t, rows, scope, csv, limit = 25, empty }: { t: Theme; rows: VendorRow[]; scope: "divisions" | "departments"; csv: (r: VendorRow) => string; limit?: number; empty: string }) {
  if (rows.length === 0) return <p className={`${t.card} p-6 text-sm ${t.muted}`}>{empty}</p>;
  const max = rows[0].total;
  return (
    <div className={`${t.card} overflow-hidden`}>
      <div className={`hidden grid-cols-[minmax(0,1fr)_9rem_6rem_1rem] gap-x-4 border-b ${t.border} px-4 py-2 sm:grid ${t.th}`}>
        <span>Vendor</span>
        <span>Spend</span>
        <span className="text-right">Payments</span>
        <span />
      </div>
      <div className={`divide-y ${t.divide}`}>
        {rows.slice(0, limit).map((r) => (
          <VendorDetails key={r.vendor.slug} t={t} row={r} max={max} scope={scope} csv={csv(r)} />
        ))}
      </div>
      {rows.length > limit && (
        <p className={`border-t ${t.border} px-4 py-3 text-xs ${t.muted}`}>
          Showing the top {limit} of {rows.length.toLocaleString()} vendors.
        </p>
      )}
    </div>
  );
}

function ByYear({ t, rows, field }: { t: Theme; rows: { fy: number; [k: string]: number }[]; field: string }) {
  const max = Math.max(...rows.map((r) => r[field]), 0);
  return (
    <div className="flex h-36 items-end gap-2">
      {rows.map((r) => (
        <div key={r.fy} className="flex flex-1 flex-col items-center gap-1">
          <span className={`text-[11px] tabular ${t.muted}`}>{fmtMoney(r[field])}</span>
          <div className={`w-full rounded-t ${t.bar}`} style={{ height: `${max ? Math.max(2, (r[field] / max) * 96) : 2}px` }} />
          <span className={`text-[11px] ${t.muted}`}>FY{String(r.fy).slice(2)}</span>
        </div>
      ))}
    </div>
  );
}

export function SpendingHome({ variant, year }: { variant: Variant; year: Year }) {
  const t = THEMES[variant];
  const depts = departmentSummaries(year);
  const tree = departmentTree(year);
  const total = depts.reduce((s, d) => s + d.smallTotal, 0);
  const all = depts.reduce((s, d) => s + d.allTotal, 0);
  const shares = depts.reduce<Shares>(
    (s, d) => {
      for (const k of Object.keys(s) as (keyof Shares)[]) s[k] += d.shares[k];
      return s;
    },
    emptyShares(),
  );
  const max = Math.max(...depts.map((d) => d.smallTotal), 0);

  return (
    <>
      <Hero t={t} eyebrow="For department and division leads" title="Where are you spending?">
        <p>
          The small purchases your department makes without a bid or RFP: who gets that money, which vendors get the most,
          and how much of it goes to large companies that could be going to small businesses.
        </p>
      </Hero>
      <div className={t.wrap}>
        <SmallPurchaseNote t={t} />

        <div className="mt-8">
          <SpendTabs t={t} active="small" year={year} />
          <div className="mt-5"><YearTabs t={t} year={year} path="/spending" /></div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat t={t} value={fmtMoney(total)} label="Small purchases" sub={`${yearLabel(year)}, all departments`} />
          <Stat t={t} value={fmtPct(total, all)} label="Of all purchase spending" sub={`${fmtMoney(all)} including bid contracts`} />
          <Stat t={t} value={fmtPct(shares.large, shares.total)} label="Went to large businesses" sub={`${fmtPct(shares.small, shares.total)} to small businesses`} />
          <Stat t={t} value={fmtPct(shares.osd, shares.total)} label="Went to OSD-certified firms" />
        </div>

        <section className="mt-10">
          <h2 className={t.h2}>Browse by department</h2>
          <p className={`mt-1 text-sm ${t.muted}`}>
            Ranked by small purchases, {yearPhrase(year)}. Open a department for its divisions, and a division for its top vendors.
          </p>
          <div className={`${t.card} mt-4 overflow-x-auto`}>
            <div className="min-w-[680px]">
              <div className={`grid ${DEPT_COLS} gap-x-4 border-b ${t.border} px-4 py-2 ${t.th}`}>
                <span>Department</span>
                <span>Small purchases</span>
                <span className="text-right">Vendors</span>
                <span className="text-right">Large biz</span>
                <span className="text-right">Small biz</span>
                <span className="text-right">OSD</span>
              </div>
              <div className={`divide-y ${t.divide}`}>
                {depts.map((d) => (
                  <details key={d.slug} className="group/dept">
                    <summary className={`grid ${DEPT_COLS} cursor-pointer list-none items-center gap-x-4 px-4 py-3 text-sm ${t.rowHover} [&::-webkit-details-marker]:hidden`}>
                      <span className={`flex min-w-0 items-center gap-2 font-medium ${t.text}`}>
                        <span className={`text-[10px] ${t.muted} transition group-open/dept:rotate-90`} aria-hidden="true">▶</span>
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span>
                        <span className={`block font-semibold tabular ${t.text}`}>{fmtMoney(d.smallTotal)}</span>
                        <span className="mt-1 block"><Bar t={t} value={d.smallTotal} max={max} /></span>
                      </span>
                      <span className={`text-right tabular ${t.text}`}>{d.vendorCount.toLocaleString()}</span>
                      <span className={`text-right tabular ${t.text}`}>{fmtPct(d.shares.large, d.shares.total)}</span>
                      <span className={`text-right tabular ${t.text}`}>{fmtPct(d.shares.small, d.shares.total)}</span>
                      <span className={`text-right tabular ${t.text}`}>{fmtPct(d.shares.osd, d.shares.total)}</span>
                    </summary>
                    <div className={`border-t ${t.border} pb-2 pl-8 pr-4 pt-1`}>
                      {(tree.get(d.index) ?? []).map((div) => (
                        <details key={div.slug} className="group/div">
                          <summary className={`grid grid-cols-[minmax(0,1fr)_14rem] cursor-pointer list-none items-center gap-x-4 rounded px-2 py-2 text-sm ${t.rowHover} [&::-webkit-details-marker]:hidden`}>
                            <span className={`flex min-w-0 items-center gap-2 ${t.text}`}>
                              <span className={`text-[9px] ${t.muted} transition group-open/div:rotate-90`} aria-hidden="true">▶</span>
                              <span className="truncate">{div.name}</span>
                              <span className={`shrink-0 text-xs ${t.muted}`}>{div.vendorCount} vendors</span>
                            </span>
                            <span className="grid grid-cols-[1fr_4.5rem] items-center gap-2">
                              <Bar t={t} value={div.total} max={d.smallTotal} />
                              <span className={`text-right text-xs tabular ${t.text}`}>{fmtMoney(div.total)}</span>
                            </span>
                          </summary>
                          <ul className="mb-2 ml-6 mr-2 space-y-1.5 py-1 text-sm">
                            {div.vendors.map((v) => (
                              <li key={v.vendor.slug} className="grid grid-cols-[minmax(0,1fr)_14rem] items-center gap-x-4">
                                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                  <span className={`truncate ${t.text}`}>{v.vendor.name}</span>
                                  <VendorBadges t={t} vendor={v.vendor} />
                                </span>
                                <span className="grid grid-cols-[1fr_4.5rem] items-center gap-2">
                                  <Bar t={t} value={v.total} max={div.vendors[0].total} className={v.vendor.size === "large" ? t.barLarge : undefined} />
                                  <span className={`text-right text-xs tabular ${t.muted}`}>{fmtMoney(v.total)}</span>
                                </span>
                              </li>
                            ))}
                            <li className="pt-1 text-xs">
                              <Link className={t.link} href={href(`/spending/${d.slug}`, { fy: year, division: div.slug })}>
                                {div.vendorCount > div.vendors.length ? `All ${div.vendorCount} vendors, by year and with payment records` : "Vendor details and payment records"}
                              </Link>
                            </li>
                          </ul>
                        </details>
                      ))}
                      <p className="px-2 pt-2 text-xs">
                        <Link className={t.link} href={href(`/spending/${d.slug}`, { fy: year })}>Full {d.name} page</Link>
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
        <DataNote t={t} />
      </div>
    </>
  );
}

export function DepartmentSpending({ variant, slug, year, division }: { variant: Variant; slug: string; year: Year; division?: string }) {
  const t = THEMES[variant];
  const d = departmentDetail(slug, year, division);
  if (!d) notFound();
  const path = `/spending/${slug}`;
  const scopeName = d.division ? d.division.name : d.dept.name;
  const top10 = d.vendors.slice(0, 10).reduce((s, r) => s + r.total, 0);
  const divMax = Math.max(...d.divisions.map((x) => x.small), 0);
  const csv = (r: VendorRow) => checkbookCsv({ department: d.dept.name, vendor: r.vendor.name, year });

  return (
    <>
      <Hero
        t={t}
        eyebrow={d.division ? d.dept.name : "Department"}
        title={scopeName}
        crumbs={[["Where are you spending?", href("/spending", { fy: year })], ...(d.division ? [[d.dept.name, href(path, { fy: year })] as [string, string]] : [])]}
      >
        <p>
          Small purchases, {yearPhrase(year)}. Bid and RFP contracts are not included; see{" "}
          <a className={t.link} href={OPEN_BIDS}>MMP</a> for those.
        </p>
      </Hero>
      <div className={t.wrap}>
        <YearTabs t={t} year={year} path={path} keep={{ division }} />

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat t={t} value={fmtMoney(d.smallTotal)} label="Small purchases" sub={`${fmtPct(d.smallTotal, d.allTotal)} of ${fmtMoney(d.allTotal)} total purchases`} />
          <Stat t={t} value={d.vendors.length.toLocaleString()} label="Vendors paid" />
          <Stat t={t} value={fmtPct(top10, d.smallTotal)} label="Went to the top 10 vendors" />
          <Stat t={t} value={fmtPct(d.shares.large, d.shares.total)} label="Went to large businesses" sub={`${fmtPct(d.shares.small, d.shares.total)} to small businesses, ${fmtPct(d.shares.osd, d.shares.total)} to OSD-certified firms`} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-12">
            <section>
              <h2 className={t.h2}>Who are you spending with?</h2>
              <p className={`mt-1 text-sm ${t.muted}`}>
                Largest first. Open a vendor for spending by year, what it was for, and links to every payment.
              </p>
              <div className="mt-4">
                <VendorList t={t} rows={d.vendors} scope="divisions" csv={csv} empty="No small purchases for this selection." />
              </div>
            </section>

            <section>
              <h2 className={t.h2}>Small purchases going to large businesses</h2>
              <p className={`mt-1 text-sm leading-relaxed ${t.text}`}>
                {fmtMoney(d.shares.large)} ({fmtPct(d.shares.large, d.shares.total)}) of these purchases went to companies
                on federal record as <em>other than small</em> under SBA size standards. These are the
                purchases most worth steering to small and diverse firms: open-market buys already require asking at least one{" "}
                <a className={t.link} href={OSD_DIRECTORY}>certified diverse vendor</a> for a quote.
              </p>
              <div className={`${t.card} mt-4 p-4`}><SizeSplit t={t} s={d.shares} /></div>
              <div className="mt-4">
                <VendorList t={t} rows={d.largeVendors} scope="divisions" csv={csv} limit={15} empty="None of these purchases went to a business on record as large." />
              </div>
            </section>

            <section>
              <h2 className={t.h2}>Over time</h2>
              <p className={`mt-1 text-sm ${t.muted}`}>Small purchases by fiscal year. FY{snapshotInfo().latestYear} is partial.</p>
              <div className={`${t.card} mt-4 p-4`}><ByYear t={t} rows={d.byYear} field="small" /></div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className={`${t.card} p-4`}>
              <h2 className={t.h3}>Divisions</h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li>
                  <Link href={href(path, { fy: year })} className={!d.division ? `font-semibold ${t.text}` : t.link}>
                    All divisions
                  </Link>
                </li>
                {d.divisions.map((x) => (
                  <li key={x.slug}>
                    <Link href={href(path, { fy: year, division: x.slug })} className={d.division?.slug === x.slug ? `font-semibold ${t.text}` : t.link}>
                      {x.name}
                    </Link>
                    <span className="mt-1 grid grid-cols-[1fr_4.5rem] items-center gap-2">
                      <Bar t={t} value={x.small} max={divMax} />
                      <span className={`text-right text-xs tabular ${t.muted}`}>{fmtMoney(x.small)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
        <DataNote t={t} />
      </div>
    </>
  );
}

function concentration(hhi: number) {
  if (hhi >= 2500) return "Highly concentrated";
  if (hhi >= 1500) return "Moderately concentrated";
  return "Spread out";
}

export function CategoriesSpending({ variant, year }: { variant: Variant; year: Year }) {
  const t = THEMES[variant];
  const cats = categorySummaries(year);
  const total = cats.reduce((s, c) => s + c.total, 0);
  const max = Math.max(...cats.map((c) => c.total), 0);
  return (
    <>
      <Hero t={t} eyebrow="All purchase spending" title="Who soaks up the state's spending, and for what?">
        <p>
          Every purchase payment, bid contracts and small buys together, grouped by what it bought. For each category: how
          much of it one company gets. A category where one vendor takes most of the money has little diversification.
        </p>
      </Hero>
      <div className={t.wrap}>
        <SpendTabs t={t} active="all" year={year} />
        <div className="mt-5"><YearTabs t={t} year={year} path="/spending/categories" /></div>
        <p className={`mt-4 text-sm ${t.muted}`}>
          {fmtMoney(total)} across {cats.length} categories, {yearPhrase(year)}. Unlike the{" "}
          <Link className={t.link} href={href("/spending", { fy: year })}>small purchases view</Link>, this includes spending
          on bid and RFP contracts.
        </p>
        <div className={`${t.card} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className={`border-b ${t.border} text-left`}>
                <th className={`px-4 py-2 ${t.th}`}>Category</th>
                <th className={`px-4 py-2 ${t.th}`}>Spend</th>
                <th className={`px-4 py-2 ${t.th}`}>Biggest vendor</th>
                <th className={`px-4 py-2 text-right ${t.th}`}>Its share</th>
                <th className={`px-4 py-2 text-right ${t.th}`}>Top 3</th>
                <th className={`px-4 py-2 ${t.th}`}>Concentration</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divide}`}>
              {cats.map((c) => (
                <tr key={c.account} className={t.rowHover}>
                  <td className="px-4 py-3">
                    <Link className={`font-medium ${t.plainLink}`} href={href(`/spending/categories/${c.account}`, { fy: year })}>{c.label}</Link>
                    <span className={`block text-xs ${t.muted}`}>{c.vendorCount.toLocaleString()} vendors</span>
                  </td>
                  <td className="w-44 px-4 py-3">
                    <span className={`block font-semibold tabular ${t.text}`}>{fmtMoney(c.total)}</span>
                    <span className="mt-1 block"><Bar t={t} value={c.total} max={max} /></span>
                  </td>
                  <td className={`max-w-[16rem] truncate px-4 py-3 ${t.text}`} title={c.top.name}>{c.top.name}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular ${t.text}`}>{fmtPct(c.topShare, 1)}</td>
                  <td className={`px-4 py-3 text-right tabular ${t.text}`}>{fmtPct(c.top3Share, 1)}</td>
                  <td className={`px-4 py-3 text-xs ${c.hhi >= 2500 ? "font-semibold" : ""} ${t.text}`}>{concentration(c.hhi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={`mt-3 text-xs ${t.muted}`}>
          Concentration uses the Herfindahl-Hirschman index of vendor shares, the measure antitrust agencies use: above 2,500
          is highly concentrated, 1,500–2,500 moderately. A statewide contract with one awarded vendor will show up as
          concentrated by design; open a category to see whether that vendor holds one.
        </p>
        <DataNote t={t} />
      </div>
    </>
  );
}

export function CategorySpending({ variant, account, year, dept }: { variant: Variant; account: string; year: Year; dept?: string }) {
  const t = THEMES[variant];
  const c = categoryDetail(account, year, dept);
  if (!c) notFound();
  const path = `/spending/categories/${account}`;
  const top = c.vendors[0];
  const top3 = c.vendors.slice(0, 3).reduce((s, r) => s + r.total, 0);
  const deptMax = Math.max(...c.departments.map((x) => x.total), 0);
  const csv = (r: VendorRow) => checkbookCsv({ department: c.dept?.name, vendor: r.vendor.name, account, year });

  return (
    <>
      <Hero
        t={t}
        eyebrow={`Category · ${THRESHOLDS[c.tier].label}`}
        title={c.label}
        crumbs={[["All spending by category", href("/spending/categories", { fy: year })]]}
      >
        <p>
          {c.dept ? `${c.dept.name}, ` : "All departments, "}
          {yearPhrase(year)}. Includes bid contracts and small purchases;{" "}
          {fmtMoney(c.smallTotal)} ({fmtPct(c.smallTotal, c.total)}) was small purchases.
        </p>
      </Hero>
      <div className={t.wrap}>
        <YearTabs t={t} year={year} path={path} keep={{ dept }} />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat t={t} value={fmtMoney(c.total)} label="Spent in this category" />
          <Stat t={t} value={c.vendors.length.toLocaleString()} label="Vendors paid" />
          <Stat t={t} value={top ? fmtPct(top.total, c.total) : "—"} label="Went to the biggest vendor" sub={top?.vendor.name} />
          <Stat t={t} value={fmtPct(top3, c.total)} label="Went to the top 3 vendors" />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-12">
            <section>
              <h2 className={t.h2}>Who gets this money</h2>
              <p className={`mt-1 text-sm ${t.muted}`}>Share of category spend, largest first. Open a vendor for detail and source links.</p>
              <div className={`${t.card} mt-4 p-4`}><SizeSplit t={t} s={c.shares} /></div>
              <div className="mt-4">
                <VendorList t={t} rows={c.vendors} scope="departments" csv={csv} empty="No spending in this category for this selection." />
              </div>
            </section>
            <section>
              <h2 className={t.h2}>Over time</h2>
              <div className={`${t.card} mt-4 p-4`}><ByYear t={t} rows={c.byYear} field="all" /></div>
            </section>
          </div>
          <aside>
            <section className={`${t.card} p-4`}>
              <h2 className={t.h3}>Departments</h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li>
                  <Link href={href(path, { fy: year })} className={!c.dept ? `font-semibold ${t.text}` : t.link}>All departments</Link>
                </li>
                {c.departments.map((x) => (
                  <li key={x.slug}>
                    <Link href={href(path, { fy: year, dept: x.slug })} className={c.dept?.slug === x.slug ? `font-semibold ${t.text}` : t.link}>
                      {x.name}
                    </Link>
                    <span className="mt-1 grid grid-cols-[1fr_4.5rem] items-center gap-2">
                      <Bar t={t} value={x.total} max={deptMax} />
                      <span className={`text-right text-xs tabular ${t.muted}`}>{fmtMoney(x.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
        <DataNote t={t} />
      </div>
    </>
  );
}
