import Link from "next/link";
import { LikelihoodMeter, STATUS_DOT, SampleBanner } from "@/components/v2/Badges";
import { getDataset } from "@/lib/data";
import { fmtMonth, windowCaption } from "@/lib/format";

export const revalidate = 86400;

function Rings() {
  return (
    <svg viewBox="0 0 800 800" className="pointer-events-none absolute left-1/2 top-[-320px] h-[800px] w-[800px] -translate-x-1/2 opacity-60" aria-hidden="true">
      {[120, 200, 280, 360].map((r) => (
        <circle key={r} cx="400" cy="400" r={r} fill="none" stroke="#1b4ea3" strokeOpacity="0.09" strokeDasharray="2 6" />
      ))}
    </svg>
  );
}

function SectionHead({ n, title, children }: { n: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute -left-9 top-2 hidden font-mono text-xs text-de-600 lg:block">{n}</span>
      <h2 className="display text-4xl text-ink-900 sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-500">{children}</p>}
    </div>
  );
}

export default async function Home() {
  const data = await getDataset();
  const all = data.contracts;
  const actionable = all.filter((c) => !c.cooperative && c.likelihood !== "Low");
  const openNow = actionable.filter((c) => c.status === "open");
  const next90 = actionable.filter((c) => c.status === "upcoming");
  const next12 = actionable.filter((c) => c.status === "open" || (c.daysToWindow > 0 && c.daysToWindow <= 365));
  const noDiverseIncumbent = next12.filter((c) => c.vendors.length > 0 && !c.vendors.some((v) => v.mwbe));
  const spotlight = [...openNow, ...next90].slice(0, 6);

  const byCategory = new Map<string, number>();
  for (const c of next12) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const stats = [
    { label: "Current contracts tracked", value: all.length },
    { label: "Rebid windows open now", value: openNow.length },
    { label: "Opening in the next 90 days", value: next90.length },
    { label: "Next 12 months, no OSD-certified incumbent", value: noDiverseIncumbent.length },
  ];

  return (
    <>
      {data.source === "sample" && <SampleBanner />}

      <section className="wash relative overflow-hidden border-b border-line">
        <Rings />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="eyebrow text-de-600">For Delaware small, minority, women, veteran &amp; disability-owned businesses</p>
          <h1 className="display mt-5 text-5xl text-ink-900 sm:text-7xl">
            Know which state contracts come up for rebid, before the bid posts.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
            We read Delaware&apos;s open contract data, estimate when each contract will be re-solicited,
            and flag the ones likely to come back to market.
          </p>
          <form action="/opportunities" className="mx-auto mt-9 flex max-w-2xl items-center gap-2 rounded-xl border border-line bg-white p-2 text-left shadow-[0_8px_30px_rgb(11_26_51/0.08)]">
            <svg viewBox="0 0 20 20" className="ml-2 h-5 w-5 shrink-0 text-ink-400" aria-hidden="true">
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <label htmlFor="home-q" className="sr-only">Search contracts</label>
            <input
              id="home-q"
              name="q"
              placeholder="Search by service, product, agency or incumbent"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            <button className="shrink-0 rounded-lg bg-de-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-de-700 sm:px-5">
              Search
            </button>
          </form>
          {topCategories.length > 0 && (
            <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
              <span className="py-1 font-mono text-[11px] uppercase tracking-wider text-ink-400">Popular</span>
              {topCategories.slice(0, 4).map(([cat]) => (
                <Link key={cat} href={`/opportunities?q=${encodeURIComponent(cat)}`} className="rounded-full border border-line bg-white/70 px-3 py-1 text-xs text-ink-700 hover:border-de-500 hover:text-de-700">
                  {cat}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-px grid grid-cols-2 border-x border-b border-line lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`p-5 sm:p-6 ${i === 0 ? "bg-ink-900 text-white" : "bg-white"} ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <p className={`display text-4xl tabular sm:text-5xl ${i === 0 ? "text-white" : "text-ink-900"}`}>{s.value.toLocaleString()}</p>
              <p className={`mt-2 text-sm ${i === 0 ? "text-white/70" : "text-ink-500"}`}>{s.label}</p>
            </div>
          ))}
        </div>

        <section className="grid gap-10 py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:pl-9">
          <div>
            <SectionHead n="01" title="Coming up next.">
              Rebid windows that are open now or open in the next 90 days, leaving out one-off projects and cooperative contracts.
            </SectionHead>
            <ul className="mt-8 space-y-5">
              {[
                ["Predicted window", "Measured from how far ahead Delaware posted past rebids in the same category."],
                ["Rebid likelihood", "Higher when an earlier award for the same need exists in the archive."],
                ["Incumbent", "Who holds the contract now, and whether they are OSD certified."],
              ].map(([k, v]) => (
                <li key={k} className="grid grid-cols-[24px_1fr] gap-x-3">
                  <span className="mt-2 h-px w-4 bg-ink-400" />
                  <div>
                    <p className="eyebrow text-ink-500">{k}</p>
                    <p className="mt-1 text-[15px] text-ink-800">{v}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/opportunities" className="mt-8 inline-block text-sm font-medium text-de-600 hover:text-de-700">
              See all opportunities →
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgb(11_26_51/0.07)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="eyebrow rounded border border-line px-2 py-1 text-ink-700">Rebid watchlist</span>
              <span className="font-mono text-xs text-ink-400">{spotlight.length} shown</span>
            </div>
            {spotlight.length === 0 ? (
              <p className="p-6 text-sm text-ink-500">No rebid windows open now or in the next 90 days.</p>
            ) : (
              <ul className="divide-y divide-line">
                {spotlight.map((c) => (
                  <li key={c.id}>
                    <Link href={`/opportunities/${encodeURIComponent(c.id)}`} className="grid grid-cols-[auto_1fr] gap-x-3 px-5 py-4 hover:bg-de-50 sm:grid-cols-[auto_1fr_auto]">
                      <span className={`mt-2 h-2 w-2 rounded-full ${STATUS_DOT[c.status]}`} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{c.title}</p>
                        <p className="truncate text-sm text-ink-500">{c.agencyName}</p>
                      </div>
                      <div className="col-start-2 mt-2 flex items-center gap-3 sm:col-start-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
                        <span className="font-mono text-xs text-ink-700 tabular">likely {fmtMonth(c.predicted)}</span>
                        <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-400">
                          <LikelihoodMeter likelihood={c.likelihood} /> {windowCaption(c.status, c.daysToWindow) || c.likelihood}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="border-t border-line py-20 lg:pl-9">
          <SectionHead n="02" title="Where the work is.">
            Likely rebids in the next 12 months, by category. Pick one to see every contract in it.
          </SectionHead>
          {topCategories.length === 0 ? (
            <p className="mt-8 text-sm text-ink-500">Nothing in the next 12 months.</p>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              {topCategories.map(([cat, n]) => (
                <li key={cat}>
                  <Link
                    href={`/opportunities?q=${encodeURIComponent(cat)}`}
                    className="group flex h-full min-h-40 flex-col justify-between rounded-xl bg-ink-900 p-5 text-white transition hover:bg-ink-800"
                  >
                    <span className="h-0.5 w-6 bg-buff-300" />
                    <div>
                      <p className="font-mono text-4xl font-medium tabular sm:text-5xl">{n}</p>
                      <p className="mt-2 text-sm leading-snug text-white/75 group-hover:text-white">{cat}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="border-t border-line bg-buff-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between lg:pl-15">
          <div className="max-w-2xl">
            <p className="eyebrow text-buff-500">Before the bid posts</p>
            <h2 className="display mt-3 text-4xl text-ink-900 sm:text-5xl">Get certified while there&apos;s still time.</h2>
            <p className="mt-3 text-ink-500">
              OSD certification can take weeks. Start now, and register as a vendor so you see the solicitation the day it posts.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href="https://osd.delaware.gov/" className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-800">
              OSD certification ↗
            </a>
            <a href="https://mmp.delaware.gov/" className="rounded-lg border border-ink-900/15 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:border-ink-900/30">
              Delaware Bids &amp; Contracts ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
