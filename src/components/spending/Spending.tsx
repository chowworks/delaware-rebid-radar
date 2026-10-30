import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import {
    categoryDetail,
  categorySummaries,
  checkbookCsv,
  departmentDetail,
  departmentSummaries,
  snapshotInfo,
  emptyShares,
  sizeSourceDate,
  type Shares,
  type VendorInfo,
  type VendorRow,
  type Year,
} from "@/lib/spending";
import { THRESHOLDS, THRESHOLD_SOURCE, type Tier } from "@/lib/spending-rules";
import CatRow from "./CatRow";
import DeptRow from "./DeptRow";
import Modal from "./Modal";
import QuickFilter from "./QuickFilter";
import { THEMES, type Theme, type Variant } from "./theme";
import VendorSizeSearch from "./VendorSizeSearch";

// "Where are you spending?" pages, shared by both designs.
//   /spending                      departments, small purchases (under the bid limits)
//   /spending/[dept]               one department (?division=), its vendors
//   /spending/by-category          small purchases by category
//   /spending/categories           all purchase spend by category (?scope=small on a category)
//   /spending/categories/[account] one category, vendor concentration
// Every page takes ?fy=2026 (default: all years).

const OSD_DIRECTORY = "https://data.delaware.gov/d/8dxf-6ahp";
const DIVERSE_TITLE =
  "Certified by Delaware's Office of Supplier Diversity (OSD) as minority-, women-, veteran-, service-disabled veteran- or disability-owned";
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
const CAT_COLS = "grid-cols-[minmax(0,1.4fr)_10rem_minmax(0,1fr)_4.5rem_4.5rem_4.5rem_8.5rem]";

function Filter({ t, target, placeholder, noun }: { t: Theme; target: string; placeholder: string; noun: string }) {
  return <QuickFilter target={target} placeholder={placeholder} noun={noun} classes={{ input: `${t.border} bg-white ${t.text}`, muted: t.muted }} />;
}

const SIZE_LABEL = { large: "Large business", small: "Small business", nonprofit: "Nonprofit", unknown: "Size unknown" } as const;

function VendorBadges({ t, vendor: v }: { t: Theme; vendor: VendorInfo }) {
  const title = v.sizeMatch ? `Federal award records for ${v.sizeMatch}` : undefined;
  return (
    <>
      {v.size === "large" && <Badge className={t.badgeLarge} title={title}>Large business</Badge>}
      {v.size === "small" && <Badge className={t.badgeSmall} title={title}>Small business</Badge>}
      {v.size === "nonprofit" && <Badge className={t.badgeNonprofit} title={title}>Nonprofit</Badge>}
      {v.osd && <Badge className={t.badgeOsd} title={DIVERSE_TITLE}>Diverse-owned</Badge>}
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
        <span title={DIVERSE_TITLE}>Certified diverse-owned firms {fmtPct(s.osd, s.total)}</span>
      </div>
    </div>
  );
}

// What "small purchases" means, in one line. "How this works" opens the
// limits and the method in place, below the strip.
function SmallPurchaseNote({ t }: { t: Theme }) {
  const tiers: Tier[] = ["goods", "prof", "works"];
  const k = (n: number) => fmtMoney(n);
  return (
    <details className="group">
      <summary className={`${t.note} flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-sm [&::-webkit-details-marker]:hidden`}>
        {INFO_ICON}
        <span className="min-w-0 flex-1">
          Shows only purchases under the no-bid limits: <strong>{k(THRESHOLDS.goods.openMarket)}</strong> goods ·{" "}
          <strong>{k(THRESHOLDS.prof.openMarket)}</strong> professional services · <strong>{k(THRESHOLDS.works.openMarket)}</strong>{" "}
          public works. Estimated from payment records.
        </span>
        <span className="whitespace-nowrap font-semibold underline underline-offset-2">
          How this works{" "}
          <svg viewBox="0 0 12 12" aria-hidden="true" className="inline h-3 w-3 transition group-open:rotate-180">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className={`${t.card} mt-2 grid gap-8 p-5 text-sm leading-relaxed md:grid-cols-[1.3fr_1fr] ${t.text}`}>
        <div className="min-w-0">
          <p className="font-semibold">The limits</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-left text-[13px]">
              <thead className={t.muted}>
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Type</th>
                  <th className="py-1.5 pr-3 font-medium">No bid</th>
                  <th className="py-1.5 pr-3 font-medium">Quotes</th>
                  <th className="py-1.5 font-medium">Formal bid or RFP</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divide} border-t ${t.border}`}>
                {tiers.map((tier) => {
                  const th = THRESHOLDS[tier];
                  const formalAt = Number(th.steps[2][0].replace(/[^0-9]/g, ""));
                  return (
                    <tr key={tier}>
                      <td className="py-2 pr-3">{th.label}</td>
                      <td className="py-2 pr-3 font-semibold tabular">&lt; {k(th.openMarket)}</td>
                      <td className="py-2 pr-3 tabular">{k(th.openMarket)}–{k(formalAt)}</td>
                      <td className="py-2 tabular">{k(formalAt)}+</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={`mt-2 text-xs ${t.muted}`}>
            Goods limits are a yearly total per agency; professional services and public works are per contract, and
            contracts can&apos;t be split to stay under. Source:{" "}
            <a className={t.link} href={THRESHOLD_SOURCE}>Division of Accounting small purchase rules</a>.
          </p>
        </div>
        <div className="min-w-0">
          <p className="font-semibold">How we estimate it</p>
          <p className="mt-2">
            Payment records don&apos;t say which contract a payment belongs to. We total what each department paid each
            vendor per year and type of purchase, and count it only if that stays under the no-bid limit and the vendor
            isn&apos;t on a state contract. Bigger purchases are bid publicly on <a className={t.link} href={OPEN_BIDS}>MMP</a>.
          </p>
          <p className={`mt-3 text-xs ${t.muted}`}>
            Agencies must ask at least one <a className={t.link} href={OSD_DIRECTORY}>certified diverse firm</a> for a quote on these buys.
          </p>
        </div>
      </div>
    </details>
  );
}

const INFO_ICON = (
  <span aria-hidden="true" className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-semibold">i</span>
);

function SizeInfo({ t }: { t: Theme }) {
  const trigger = `inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium underline underline-offset-2 ${t.muted}`;
  const icon = INFO_ICON;
  return (
    <Modal label={<>{icon}Who counts as a large or small business?</>} title="Large and small businesses" buttonClass={trigger} panelClass={t.popover}>
          <p className={`text-sm leading-relaxed ${t.text}`}>
            Delaware&apos;s data doesn&apos;t record company size, so we use federal records from{" "}
            <a className={t.link} href="https://www.usaspending.gov/">USAspending.gov</a>: a firm&apos;s SAM.gov
            registration and the federal contracts it has been paid on, measured against SBA size standards.
          </p>
          <ul className={`mt-3 space-y-1 text-sm ${t.text}`}>
            <li><strong>Large business:</strong> on federal record as other than small.</li>
            <li><strong>Small business:</strong> on record as small and paid on at least one federal award (a registration alone is self-reported, so it doesn&apos;t count).</li>
            <li><strong>Nonprofit:</strong> registered as a nonprofit.</li>
            <li><strong>Size unknown:</strong> no federal record, or the name didn&apos;t match. That is most local vendors.</li>
          </ul>
          <div className="mt-5">
            <VendorSizeSearch
              classes={{
                input: `${t.border} bg-white ${t.text}`,
                chip: t.tab,
                chipOn: t.tabOn,
                muted: t.muted,
                text: t.text,
                divide: t.divide,
                badge: { large: t.badgeLarge, small: t.badgeSmall, nonprofit: t.badgeNonprofit },
              }}
            />
          </div>
        </Modal>
  );
}

function DiverseInfo({ t }: { t: Theme }) {
  return (
    <Modal
      label={<>{INFO_ICON}<span className="sr-only">What is a certified diverse-owned firm?</span></>}
      title="Certified diverse-owned firms"
      buttonClass={`inline-flex items-center ${t.muted} hover:opacity-80`}
      panelClass={t.popover}
    >
      <div className={`space-y-3 text-sm leading-relaxed ${t.text}`}>
        <p>
          Delaware&apos;s <strong>Office of Supplier Diversity (OSD)</strong> certifies businesses that are at least 51% owned
          and run by people in these groups:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Minority-owned (MBE)</li>
          <li>Women-owned (WBE)</li>
          <li>Veteran-owned and service-disabled veteran-owned (VOBE, SDVOBE)</li>
          <li>Owned by individuals with disabilities (IWDBE)</li>
        </ul>
        <p>
          Certification is about who owns the firm, not its size: a few certified firms are large companies. For
          open-market purchases, agencies must ask at least one certified diverse firm for a quote.
        </p>
        <p className={`text-xs ${t.muted}`}>
          We match vendor names against the state&apos;s <a className={t.link} href={OSD_DIRECTORY}>certified firms list</a>{" "}
          (about 800 firms), so a few will be missed. Learn about certification at{" "}
          <a className={t.link} href="https://osd.delaware.gov/">osd.delaware.gov</a>.
        </p>
      </div>
    </Modal>
  );
}

// The headline numbers: how much, who got it, and one line saying it plainly.
function SpendSummary({ t, label, total, all, allLabel, shares, extras = [], subject, noun, period }: { t: Theme; label: string; total: number; all: number; allLabel: string; shares: Shares; extras?: [string, string][]; subject: string; noun: string; period: string }) {
  const rows = [
    { key: "large", color: t.barLarge, value: shares.large, info: null },
    { key: "small", color: t.bar, value: shares.small, info: null },
    { key: "nonprofit", color: t.barNonprofit, value: shares.nonprofit, info: null },
    { key: "unknown", color: t.barUnknown, value: shares.unknown, info: null },
    { key: "osd", color: "bg-emerald-600", value: shares.osd, info: <DiverseInfo t={t} /> },
  ] as const;
  const label2 = { ...SIZE_LABEL, osd: "Diverse-owned" };
  const max = Math.max(...rows.map((r) => r.value), 1);
  const smallOrNonprofit = shares.small + shares.nonprofit;
  return (
    <div className={`${t.card} overflow-hidden`}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className={`flex flex-col p-5 lg:border-r ${t.border}`}>
          <p className={t.h3}>{label}</p>
          <p className={`mt-2 ${t.stat} text-4xl`}>{fmtMoney(total)}</p>
          <div className="mt-4">
            <Bar t={t} value={total} max={all} />
            <p className={`mt-1.5 text-xs ${t.muted}`}>{fmtPct(total, all)} of {fmtMoney(all)} {allLabel}</p>
          </div>
          {extras.length > 0 && (
            <dl className={`mt-auto grid grid-cols-2 gap-3 border-t ${t.border} pt-4`}>
              {extras.map(([v, l]) => (
                <div key={l}>
                  <dt className={`text-xs ${t.muted}`}>{l}</dt>
                  <dd className={`text-lg font-semibold tabular ${t.text}`}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className={`border-t p-5 lg:border-t-0 ${t.border}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className={t.h3}>Who got it</p>
            <SizeInfo t={t} />
          </div>
          <ul className="mt-3">
            {rows.map((r, i) => (
              <li key={r.key} className={`grid grid-cols-[minmax(0,10rem)_1fr_3rem_4rem] sm:grid-cols-[minmax(0,12rem)_1fr_3.5rem_4.5rem] items-center gap-3 py-2 text-sm ${i ? `border-t ${t.border}` : ""}`}>
                <span className={`flex min-w-0 items-center gap-2 ${t.text}`}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${r.color}`} />
                  <span className="truncate">{label2[r.key]}</span>
                  {r.info}
                </span>
                <span className={`h-2 overflow-hidden rounded-full ${t.barTrack}`}>
                  <span className={`block h-full rounded-full ${r.color}`} style={{ width: `${(r.value / max) * 100}%` }} />
                </span>
                <span className={`text-right font-semibold tabular ${t.text}`}>{fmtPct(r.value, shares.total)}</span>
                <span className={`text-right text-xs tabular ${t.muted}`}>{fmtMoney(r.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className={`border-t ${t.border} px-5 py-3 text-sm ${t.text}`}>
        {subject} made <strong>{fmtMoney(total)}</strong> in {noun} ({period}). <strong>{fmtPct(shares.osd, shares.total)}</strong> went to
        certified diverse-owned firms, and <strong>{fmtMoney(smallOrNonprofit)}</strong> ({fmtPct(smallOrNonprofit, shares.total)}) to vendors
        we could confirm as small businesses or nonprofits.
      </p>
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
        &ldquo;Diverse-owned&rdquo; means certified by Delaware&apos;s Office of Supplier Diversity (OSD) as minority-,
        women-, veteran-, service-disabled veteran- or disability-owned. &ldquo;On state contract&rdquo; and
        &ldquo;diverse-owned&rdquo; come from matching names against{" "}
        <a className={t.link} href="https://data.delaware.gov/d/h9bb-iyu6">Awarded Vendor Contact Info</a> and the{" "}
        <a className={t.link} href={OSD_DIRECTORY}>OSD certified firms list</a>, so a few matches will be missed, and
        contracts that ended before today aren&apos;t in that list.
      </p>
    </section>
  );
}

function SpendTabs({ t, active, year }: { t: Theme; active: "dept" | "smallcat" | "all"; year: Year }) {
  const tabs = [
    { key: "dept", label: "Small purchases by department", to: href("/spending", { fy: year }) },
    { key: "smallcat", label: "Small purchases by category", to: href("/spending/by-category", { fy: year }) },
    { key: "all", label: "All spending by category", to: href("/spending/categories", { fy: year }) },
  ];
  return (
    <nav className={`flex gap-x-6 gap-y-2 overflow-x-auto whitespace-nowrap border-b ${t.border} text-sm`}>
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
            {row.vendor.osd && <li><a className={t.link} href={OSD_DIRECTORY}>Delaware certified diverse-owned firms list</a></li>}
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
        <SpendTabs t={t} active="dept" year={year} />
        <div className="mt-5"><SmallPurchaseNote t={t} /></div>
        <div className="mt-5"><YearTabs t={t} year={year} path="/spending" /></div>

        <div className="mt-6">
          <SpendSummary t={t} label={`Small purchases · ${yearLabel(year)}`} total={total} all={all} allLabel="in all purchases, including bid contracts" shares={shares} subject="Departments" noun="small purchases" period={yearPhrase(year)} />
        </div>

        <section className="mt-10">
          <h2 className={t.h2}>Browse by department</h2>
          <p className={`mt-1 text-sm ${t.muted}`}>
            Ranked by small purchases, {yearPhrase(year)}. Open a department for its divisions, and a division for its top vendors.
          </p>
          <div className="mt-4"><Filter t={t} target="dept-list" placeholder="Filter by department or division" noun="departments" /></div>
          <div id="dept-list" className={`${t.card} mt-3 overflow-x-auto`}>
            <div className="min-w-[680px]">
              <div className={`grid ${DEPT_COLS} gap-x-4 border-b ${t.border} px-4 py-2 ${t.th}`}>
                <span>Department</span>
                <span>Small purchases</span>
                <span className="text-right">Vendors</span>
                <span className="text-right">Large biz</span>
                <span className="text-right">Small biz</span>
                <span className="text-right" title={DIVERSE_TITLE}>Diverse</span>
              </div>
              <div className={`divide-y ${t.divide}`}>
                {depts.map((d) => (
                  <DeptRow
                    key={d.slug}
                    t={t}
                    slug={d.slug}
                    name={d.name}
                    year={year}
                    total={d.smallTotal}
                    filterText={[d.name, ...d.divisionNames].join(" | ")}
                    summaryClass={`grid ${DEPT_COLS} cursor-pointer list-none items-center gap-x-4 px-4 py-3 text-sm ${t.rowHover} [&::-webkit-details-marker]:hidden`}
                  >
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
                  </DeptRow>
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
        <div className="mt-5"><SmallPurchaseNote t={t} /></div>

        <div className="mt-6">
          <SpendSummary
            t={t}
            label={`Small purchases · ${yearLabel(year)}`}
            total={d.smallTotal}
            all={d.allTotal}
            allLabel="in this department's purchases"
            shares={d.shares}
            subject={d.division ? d.division.name : d.dept.name}
            noun="small purchases"
            period={yearPhrase(year)}
            extras={[[d.vendors.length.toLocaleString(), "Vendors paid"], [fmtPct(top10, d.smallTotal), "To the top 10 vendors"]]}
          />
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

export function CategoriesSpending({ variant, year, small = false }: { variant: Variant; year: Year; small?: boolean }) {
  const t = THEMES[variant];
  const cats = categorySummaries(year, small);
  const total = cats.reduce((s, c) => s + c.total, 0);
  const max = Math.max(...cats.map((c) => c.total), 0);
  const path = small ? "/spending/by-category" : "/spending/categories";
  const shares = cats.reduce((s, c) => {
    for (const k of Object.keys(s) as (keyof Shares)[]) s[k] += c.shares[k];
    return s;
  }, emptyShares());
  const all = small ? categorySummaries(year).reduce((s, c) => s + c.total, 0) : total;
  return (
    <>
      {small ? (
        <Hero t={t} eyebrow="Small purchases by category" title="What are small purchases buying, and from whom?">
          <p>
            Purchases small enough to skip a public bid, grouped by what they bought. For each category: who gets the money,
            and how much goes to large businesses.
          </p>
        </Hero>
      ) : (
        <Hero t={t} eyebrow="All purchase spending" title="Who soaks up the state's spending, and for what?">
          <p>
            Every purchase payment, bid contracts and small buys together, grouped by what it bought. For each category: how
            much of it one company gets. A category where one vendor takes most of the money has little diversification.
          </p>
        </Hero>
      )}
      <div className={t.wrap}>
        <SpendTabs t={t} active={small ? "smallcat" : "all"} year={year} />
        {small && <div className="mt-5"><SmallPurchaseNote t={t} /></div>}
        <div className="mt-5"><YearTabs t={t} year={year} path={path} /></div>
        <div className="mt-6">
          <SpendSummary
            t={t}
            label={`${small ? "Small purchases" : "All purchases"} · ${yearLabel(year)}`}
            total={total}
            all={all}
            allLabel={small ? "in all purchases, including bid contracts" : "in purchases"}
            shares={shares}
            subject="Departments"
            noun={small ? "small purchases" : "purchases, bid and unbid"}
            period={yearPhrase(year)}
            extras={[[String(cats.length), "Categories"], [cats.filter((c) => c.hhi >= 2500).length.toString(), "Highly concentrated"]]}
          />
        </div>
        {!small && (
          <p className={`mt-4 text-sm ${t.muted}`}>
            Unlike the <Link className={t.link} href={href("/spending", { fy: year })}>small purchases views</Link>, this
            includes spending on bid and RFP contracts.
          </p>
        )}
        <div className="mt-6"><Filter t={t} target="cat-list" placeholder="Filter by category or vendor" noun="categories" /></div>
        <div id="cat-list" className={`${t.card} mt-3 overflow-x-auto`}>
          <div className="min-w-[900px] text-sm">
            <div className={`grid ${CAT_COLS} gap-x-4 border-b ${t.border} px-4 py-2 ${t.th}`}>
              <span>Category</span>
              <span>Spend</span>
              <span>Biggest vendor</span>
              <span className="text-right">Its share</span>
              <span className="text-right">Top 3</span>
              <span className="text-right">Large biz</span>
              <span>Concentration</span>
            </div>
            <div className={`divide-y ${t.divide}`}>
              {cats.map((c) => (
                <CatRow
                  key={c.account}
                  t={t}
                  account={c.account}
                  label={c.label}
                  year={year}
                  small={small}
                  filterText={[c.label, ...c.topNames].join(" | ")}
                  summaryClass={`grid ${CAT_COLS} cursor-pointer list-none items-center gap-x-4 px-4 py-3 ${t.rowHover} [&::-webkit-details-marker]:hidden`}
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <span className={`mt-1 text-[10px] ${t.muted} transition group-open/cat:rotate-90`} aria-hidden="true">▶</span>
                    <span className="min-w-0">
                      <span className={`block truncate font-medium ${t.text}`}>{c.label}</span>
                      <span className={`block text-xs ${t.muted}`}>{c.vendorCount.toLocaleString()} vendors</span>
                    </span>
                  </span>
                  <span>
                    <span className={`block font-semibold tabular ${t.text}`}>{fmtMoney(c.total)}</span>
                    <span className="mt-1 block"><Bar t={t} value={c.total} max={max} /></span>
                  </span>
                  <span className={`truncate ${t.text}`} title={c.top.name}>{c.top.name}</span>
                  <span className={`text-right font-semibold tabular ${t.text}`}>{fmtPct(c.topShare, 1)}</span>
                  <span className={`text-right tabular ${t.text}`}>{fmtPct(c.top3Share, 1)}</span>
                  <span className={`text-right tabular ${t.text}`}>{fmtPct(c.shares.large, c.shares.total)}</span>
                  <span className={`text-xs ${c.hhi >= 2500 ? "font-semibold" : ""} ${t.text}`}>{concentration(c.hhi)}</span>
                </CatRow>
              ))}
            </div>
          </div>
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

export function CategorySpending({ variant, account, year, dept, small = false }: { variant: Variant; account: string; year: Year; dept?: string; small?: boolean }) {
  const t = THEMES[variant];
  const c = categoryDetail(account, year, dept, small);
  const scope = small ? "small" : undefined;
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
        crumbs={[small ? ["Small purchases by category", href("/spending/by-category", { fy: year })] : ["All spending by category", href("/spending/categories", { fy: year })]]}
      >
        <p>
          {c.dept ? `${c.dept.name}, ` : "All departments, "}
          {yearPhrase(year)}.{" "}
          {small ? (
            <>Small purchases only. <Link className={t.link} href={href(path, { fy: year, dept })}>Include bid contracts</Link></>
          ) : (
            <>Includes bid contracts and small purchases; {fmtMoney(c.smallTotal)} ({fmtPct(c.smallTotal, c.total)}) was small purchases. <Link className={t.link} href={href(path, { fy: year, dept, scope: "small" })}>Small purchases only</Link></>
          )}
        </p>
      </Hero>
      <div className={t.wrap}>
        <YearTabs t={t} year={year} path={path} keep={{ dept, scope }} />
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
                  <Link href={href(path, { fy: year, scope })} className={!c.dept ? `font-semibold ${t.text}` : t.link}>All departments</Link>
                </li>
                {c.departments.map((x) => (
                  <li key={x.slug}>
                    <Link href={href(path, { fy: year, dept: x.slug, scope })} className={c.dept?.slug === x.slug ? `font-semibold ${t.text}` : t.link}>
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
