import { getDataset } from "@/lib/data";
import { fmtDate } from "@/lib/format";

const THEME = {
  classic: {
    bar: "border-b border-slate-200 bg-white text-slate-600",
    panel: "border-slate-200 bg-white text-slate-700",
    link: "text-navy-800 underline",
    muted: "text-slate-500",
  },
  v2: {
    bar: "border-b border-line bg-paper text-ink-500",
    panel: "border-line bg-white text-ink-700 shadow-[0_12px_40px_rgb(11_26_51/0.10)]",
    link: "text-de-600 underline underline-offset-2",
    muted: "text-ink-400",
  },
};

// Thin strip under the header saying where the numbers come from. The details
// open on hover where hover exists, and on tap or keyboard everywhere. Closed
// <details> content is normally not rendered, so ::details-content is made
// visible and the panel itself is shown or hidden with classes.
export default async function DataSource({ variant }: { variant: keyof typeof THEME }) {
  const data = await getDataset();
  const t = THEME[variant];
  const live = data.source === "live";
  const current = data.datasets.find((d) => d.name === "Current Contracts");
  const updated = current?.updatedAt ? fmtDate(current.updatedAt.slice(0, 10)) : null;

  return (
    <div className={`${t.bar} text-xs`}>
      <div className="mx-auto flex max-w-7xl px-4 sm:px-6">
        <details className="group relative [&::details-content]:[content-visibility:visible]">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-1.5 [&::-webkit-details-marker]:hidden">
            <span className="relative flex h-2 w-2">
              {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`} />
            </span>
            <span>
              {live ? (
                <>
                  <span className="font-medium">Live data from data.delaware.gov</span>
                  {updated && <span className="hidden sm:inline"> · state last updated {updated}</span>}
                </>
              ) : (
                <span className="font-medium text-amber-800">Sample data · live feed unreachable</span>
              )}
            </span>
            <span className={`${t.muted} underline underline-offset-2`}>Details</span>
          </summary>
          <div className={`absolute left-0 top-full z-40 hidden w-[min(22rem,calc(100vw-2rem))] rounded-xl border p-4 text-[13px] leading-relaxed group-open:block group-hover:block ${t.panel}`}>
            {live ? (
              <>
                <p>
                  Every contract here comes from the State of Delaware&apos;s open data portal. The site checks for new data
                  every 24 hours.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {data.datasets.map((d) => (
                    <li key={d.id} className="flex justify-between gap-3">
                      <a className={t.link} href={`https://data.delaware.gov/d/${d.id}`}>{d.name}</a>
                      <span className={`${t.muted} whitespace-nowrap`}>{d.updatedAt ? `updated ${fmtDate(d.updatedAt.slice(0, 10))}` : "update date unknown"}</span>
                    </li>
                  ))}
                </ul>
                <p className={`mt-3 ${t.muted}`}>Rebid dates are estimates from this data, not announcements from the state.</p>
              </>
            ) : (
              <p>
                The site couldn&apos;t reach data.delaware.gov, so it is showing a small sample built from real rows. These
                numbers are not current. It will switch back to live data on the next refresh that reaches the state&apos;s portal.
              </p>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
