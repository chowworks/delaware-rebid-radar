import Link from "next/link";
import { LikelihoodBadge, SampleBanner, StatusBadge } from "@/components/Badges";
import { getDataset } from "@/lib/data";
import { fmtMonth } from "@/lib/format";

export const revalidate = 86400;

export default async function Home() {
  const data = await getDataset();
  const all = data.contracts;
  const actionable = all.filter((c) => !c.cooperative && c.likelihood !== "Low");
  const openNow = actionable.filter((c) => c.status === "open");
  const next90 = actionable.filter((c) => c.status === "upcoming");
  const next12 = actionable.filter((c) => c.status === "open" || (c.daysToPredicted > 0 && c.daysToPredicted <= 365));
  const noDiverseIncumbent = next12.filter((c) => c.vendors.length > 0 && !c.vendors.some((v) => v.mwbe));
  const spotlight = [...openNow, ...next90].slice(0, 6);

  const byCategory = new Map<string, number>();
  for (const c of next12) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const stats = [
    { label: "Current contracts tracked", value: all.length },
    { label: "Rebids expected now", value: openNow.length },
    { label: "Expected in the next 90 days", value: next90.length },
    { label: "Next 12 months, no OSD-certified incumbent", value: noDiverseIncumbent.length },
  ];

  return (
    <>
      {data.source === "sample" && <SampleBanner />}
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6">
          <p className="text-sm font-medium text-buff-400">For Delaware small, minority, women, veteran and disability-owned businesses</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Know which state contracts are coming up for rebid, before the bid posts.
          </h1>
          <p className="mt-4 max-w-2xl text-navy-100/80">
            We read Delaware&apos;s open contract data, estimate when each contract will be re-solicited,
            and flag the ones likely to come back to market.
          </p>
          <form action="/opportunities" className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <label htmlFor="home-q" className="sr-only">Search contracts</label>
            <input
              id="home-q"
              name="q"
              placeholder="Search by service, product, agency or incumbent"
              className="flex-1 rounded-md border-0 bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-buff-400"
            />
            <button className="rounded-md bg-buff-400 px-5 py-3 font-semibold text-navy-950 hover:bg-buff-500">
              Find opportunities
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-3xl font-semibold text-navy-900 tabular">{s.value.toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-navy-900">Coming up next</h2>
              <Link href="/opportunities" className="text-sm text-navy-700 hover:underline">See all →</Link>
            </div>
            {spotlight.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                No rebid windows open now or in the next 90 days.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {spotlight.map((c) => (
                  <li key={c.id}>
                    <Link href={`/opportunities/${encodeURIComponent(c.id)}`} className="flex flex-col gap-2 p-4 hover:bg-navy-50 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-navy-900">{c.title}</p>
                        <p className="text-sm text-slate-500">{c.agencyName}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <LikelihoodBadge likelihood={c.likelihood} />
                        <StatusBadge status={c.status} />
                        <span className="text-sm font-medium text-slate-700 tabular">likely {fmtMonth(c.predicted)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside>
            <h2 className="mb-3 text-lg font-semibold text-navy-900">Next 12 months by category</h2>
            <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
              {topCategories.map(([cat, n]) => (
                <li key={cat} className="flex items-center justify-between gap-2">
                  <Link href={`/opportunities?q=${encodeURIComponent(cat)}`} className="text-slate-700 hover:text-navy-800 hover:underline">{cat}</Link>
                  <span className="font-semibold text-navy-900 tabular">{n}</span>
                </li>
              ))}
              {topCategories.length === 0 && <li className="text-slate-500">Nothing in the next 12 months.</li>}
            </ul>
            <div className="mt-4 rounded-lg bg-buff-100 p-4 text-sm text-navy-900">
              <p className="font-semibold">Get certified before the bid posts</p>
              <p className="mt-1">
                OSD certification can take weeks. Start at{" "}
                <a className="underline" href="https://osd.delaware.gov/">osd.delaware.gov</a> and register as a vendor on{" "}
                <a className="underline" href="https://mmp.delaware.gov/">Delaware Bids &amp; Contracts</a>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
