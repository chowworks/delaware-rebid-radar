import Link from "next/link";
import { LikelihoodMeter, STATUS_TEXT, SampleBanner } from "@/components/v2/Badges";
import { getDataset } from "@/lib/data";
import { STATUS_LABEL, fmtMonth } from "@/lib/format";
import type { Contract } from "@/lib/types";

export const revalidate = 86400;

// "Department of Transportation (DelDOT)" -> "DelDOT"; "Department of Correction" -> "Correction"
function shortAgency(name: string): string {
  const abbr = name.match(/\(([^)]+)\)$/)?.[1];
  if (abbr && abbr !== "statewide") return abbr;
  return name.replace(/\s*\(.*\)$/, "").replace(/^(Department|Office) of (the )?/, "");
}

function SectionHead({ n, label, title, children }: { n: string; label: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute -left-10 top-3 hidden font-mono text-xs font-medium text-de-600 lg:block">{n}</span>
      <p className="eyebrow text-ink-400 lg:hidden">{n} · {label}</p>
      <h2 className="display mt-2 text-[40px] text-ink-900 sm:text-[46px] lg:mt-0">{title}</h2>
      {children && <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-500">{children}</p>}
    </div>
  );
}

function Points({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-8 space-y-5">
      {items.map(([k, v]) => (
        <li key={k} className="grid grid-cols-[30px_1fr]">
          <span className="mt-2 h-px w-4 bg-ink-400" />
          <div>
            <p className="eyebrow text-ink-500">{k}</p>
            <p className="mt-1 text-[16px] text-ink-900">{v}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({ c, right }: { c: Contract; right: React.ReactNode }) {
  return (
    <li>
      <Link href={`/opportunities/${encodeURIComponent(c.id)}`} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-de-50/60">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink-900">{c.title}</p>
          <p className="truncate text-[13px] text-ink-500">{c.agencyName}</p>
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] text-ink-500">{right}</div>
      </Link>
    </li>
  );
}

export default async function Home() {
  const data = await getDataset();
  const all = data.contracts;
  const actionable = all.filter((c) => !c.cooperative && c.likelihood !== "Low");
  const openNow = actionable.filter((c) => c.status === "open");
  const next90 = actionable.filter((c) => c.status === "upcoming");
  const next12 = actionable.filter((c) => c.status === "open" || (c.daysToPredicted > 0 && c.daysToPredicted <= 365));
  const noDiverseIncumbent = next12.filter((c) => c.vendors.length > 0 && !c.vendors.some((v) => v.mwbe));
  const spotlight = [...openNow, ...next90].slice(0, 5);
  const openings = noDiverseIncumbent.filter((c) => c.likelihood === "High").slice(0, 4);

  const byCategory = new Map<string, number>();
  for (const c of next12) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const byAgency = new Map<string, number>();
  for (const c of all) byAgency.set(c.agencyName, (byAgency.get(c.agencyName) ?? 0) + 1);
  const topAgencies = [...byAgency.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => shortAgency(name)).filter((a) => a.length <= 24).slice(0, 5);

  // Lead with the number that matters most to OSD: upcoming work no certified firm holds today.
  const stats = [
    { label: "likely rebids in the next 12 months with no OSD-certified incumbent", value: noDiverseIncumbent.length },
    { label: "rebids expected now", value: openNow.length },
    { label: "expected in the next 90 days", value: next90.length },
    { label: "current contracts tracked", value: all.length },
  ];

  return (
    <>
      {data.source === "sample" && <SampleBanner />}

      <section className="night flex min-h-[640px] flex-col overflow-hidden text-white">
        <div className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
          <h1 className="display text-[52px] leading-[0.98] sm:text-[84px]">
            Every Delaware rebid,<br className="hidden sm:block" /> before the bid posts.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-white/80">
            State contract data, read daily, so small and diverse businesses<br className="hidden sm:block" /> can get ready months ahead.
          </p>
          <form action="/opportunities" className="mt-9 flex w-full max-w-xl items-center gap-2 rounded-lg bg-white p-1.5 text-left shadow-2xl">
            <label htmlFor="home-q" className="sr-only">Search contracts</label>
            <input
              id="home-q"
              name="q"
              placeholder="Search by service, agency or incumbent"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            <button className="shrink-0 rounded-md bg-de-600 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-de-700">
              Search<span className="hidden sm:inline"> contracts</span>
            </button>
          </form>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6">
            <span className="eyebrow text-white/40">Most contracts</span>
            {topAgencies.map((a) => (
              <span key={a} className="text-[17px] font-semibold tracking-tight text-white/70 sm:text-[19px]">{a}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-10">
        <h2 className="display text-[34px] text-ink-900">Built on Delaware&apos;s own contract records.</h2>
        <div className="mt-6 grid grid-cols-2 border border-line lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`p-5 ${i === 0 ? "bg-ink-900 text-white" : "bg-white"} ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <p className={`display text-[40px] leading-none tabular ${i === 0 ? "text-white" : "text-ink-900"}`}>{s.value.toLocaleString()}</p>
              <p className={`mt-2 text-[12px] ${i === 0 ? "text-white/70" : "text-ink-500"}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {topCategories.length > 0 && (
        <section className="mt-4 overflow-x-auto pb-16 pt-4 [scrollbar-width:none]">
          <ul className="flex gap-3 px-4 sm:px-6 lg:px-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]">
            {topCategories.map(([cat, n]) => (
              <li key={cat} className="shrink-0">
                <Link
                  href={`/opportunities?q=${encodeURIComponent(cat)}`}
                  className="night flex h-56 w-56 flex-col justify-end p-5 text-white transition hover:brightness-125"
                >
                  <span className="mb-4 h-0.5 w-8 bg-de-500" />
                  <span className="font-mono text-[52px] font-medium leading-none tracking-tight">{n}</span>
                  <span className="mt-3 text-[13px] leading-snug text-white/85">likely rebids in {cat} over the next 12 months</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="wash border-y border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 [&>*]:min-w-0 lg:gap-16 lg:px-10 lg:pl-20">
          <div>
            <SectionHead n="01" label="Watch" title="Know what is coming up next.">
              Rebids expected now or in the next 90 days, by most likely posting date. One-off projects and cooperative contracts are left out.
            </SectionHead>
            <Points
              items={[
                ["Most likely date", "Measured from how far ahead Delaware posted past rebids in the same category."],
                ["Rebid likelihood", "Higher when an earlier award for the same need exists in the archive."],
                ["Incumbent", "Who holds the contract now, and whether they are OSD certified."],
              ]}
            />
            <Link href="/opportunities" className="mt-8 inline-block text-[14px] font-medium text-de-600 hover:text-de-700">See every opportunity</Link>
          </div>
          <div>
            <p className="text-center text-[48px] font-semibold leading-none tracking-tight text-de-600 sm:text-[80px]">Watch</p>
            <div className="mt-8 overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_30px_rgb(10_24_51/0.08)]">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="tag">Rebid watchlist</span>
                <span className="font-mono text-[11px] text-ink-400">next 90 days</span>
              </div>
              {spotlight.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">No rebids expected now or in the next 90 days.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {spotlight.map((c) => (
                    <Row
                      key={c.id}
                      c={c}
                      right={
                        <>
                          <span className="text-ink-900">likely {fmtMonth(c.predicted)}</span>
                          <span className={`mt-1 flex items-center justify-end gap-1.5 ${STATUS_TEXT[c.status]}`}>
                            <LikelihoodMeter likelihood={c.likelihood} /> {STATUS_LABEL[c.status]}
                          </span>
                        </>
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="wash-green border-b border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 [&>*]:min-w-0 lg:gap-16 lg:px-10 lg:pl-20">
          <div>
            <SectionHead n="02" label="Open doors" title="Find work no certified firm holds.">
              {noDiverseIncumbent.length.toLocaleString()} likely rebids in the next 12 months are held today by firms without OSD certification.
              These are the clearest openings for small and diverse businesses.
            </SectionHead>
            <Points
              items={[
                ["Incumbent status", "Read from the state's awarded vendor records for each contract."],
                ["Recurring need", "These have an earlier award in the archive, so the work is likely to come back."],
                ["Time to prepare", "OSD certification can take weeks. Starting now leaves room before the bid posts."],
              ]}
            />
            <a href="https://osd.delaware.gov/" className="mt-8 inline-block text-[14px] font-medium text-de-600 hover:text-de-700">Start OSD certification</a>
          </div>
          <div>
            <p className="text-center text-[48px] font-semibold leading-none tracking-tight text-green-700 sm:text-[80px]">Open doors</p>
            <div className="mt-8 overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_30px_rgb(10_24_51/0.08)]">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="tag">No OSD-certified incumbent</span>
                <span className="font-mono text-[11px] text-ink-400">high likelihood</span>
              </div>
              {openings.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">None in the next 12 months.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {openings.map((c) => (
                    <Row
                      key={c.id}
                      c={c}
                      right={
                        <>
                          <span className="text-ink-900">likely {fmtMonth(c.predicted)}</span>
                          <span className="mt-1 block max-w-40 truncate">{c.vendors[0]?.name}</span>
                        </>
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2 className="display text-[46px] text-ink-900">Get certified while there&apos;s still time.</h2>
          <div>
            <p className="text-[17px] leading-relaxed text-ink-500">
              Register as a vendor on Delaware Bids &amp; Contracts so you see the solicitation the day it posts, and start OSD
              certification now so you can bid as a certified firm.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="https://osd.delaware.gov/" className="rounded-md bg-de-600 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-de-700">OSD certification</a>
              <a href="https://mmp.delaware.gov/" className="rounded-md border border-line px-4 py-2.5 text-[13px] font-medium text-ink-900 hover:border-ink-400">Delaware Bids &amp; Contracts</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
