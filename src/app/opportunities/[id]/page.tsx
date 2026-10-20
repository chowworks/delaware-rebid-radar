import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LikelihoodBadge, SampleBanner, StatusBadge, Tag } from "@/components/Badges";
import { getDataset } from "@/lib/data";
import { fmtDate, fmtTerm, windowCaption } from "@/lib/format";
import type { Contract } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

async function find(id: string): Promise<{ c: Contract | undefined; sample: boolean }> {
  const data = await getDataset();
  const key = decodeURIComponent(id);
  return { c: data.contracts.find((x) => x.id === key), sample: data.source === "sample" };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { c } = await find((await params).id);
  return { title: c?.title ?? "Contract" };
}

function Timeline({ c }: { c: Contract }) {
  // Zoom to the last three years of long contracts so the window stays visible.
  const end = Date.parse(c.expiration);
  const start = Math.max(Date.parse(c.effective ?? c.windowStart), end - 3 * 365 * 86_400_000);
  const zoomed = c.effective !== null && start > Date.parse(c.effective);
  const span = Math.max(end - start, 1);
  const pct = (iso: string) => Math.min(100, Math.max(0, ((Date.parse(iso) - start) / span) * 100));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <div className="relative h-3 rounded-full bg-slate-200">
        <div
          className="absolute inset-y-0 rounded-full bg-buff-400"
          style={{ left: `${pct(c.windowStart)}%`, width: `${Math.max(pct(c.windowEnd) - pct(c.windowStart), 1)}%` }}
        />
        <div className="absolute -top-1 h-5 w-0.5 bg-navy-900" style={{ left: `${pct(today)}%` }} title="Today" />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{zoomed ? fmtDate(new Date(start).toISOString().slice(0, 10)) : `Effective ${fmtDate(c.effective)}`}</span>
        <span>Expires {fmtDate(c.expiration)}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        <span className="mr-1 inline-block h-2 w-3 rounded-sm bg-buff-400 align-middle" /> Predicted solicitation window
        <span className="ml-3 mr-1 inline-block h-3 w-0.5 bg-navy-900 align-middle" /> Today
      </p>
    </div>
  );
}

export default async function ContractPage({ params }: Params) {
  const { c, sample } = await find((await params).id);
  if (!c) notFound();

  const facts: [string, React.ReactNode][] = [
    ["Contract number", c.number || "—"],
    ["Agency", c.agencyName === c.agency ? c.agency : `${c.agencyName} (${c.agency})`],
    ["Category", c.category],
    ["UNSPSC codes", c.unspsc.join(", ") || "—"],
    ["Effective", fmtDate(c.effective)],
    ["Expires", fmtDate(c.expiration)],
    ["Current term", fmtTerm(c.termMonths)],
    ["Typical lead time", `~${c.leadMonths} months before expiration (measured)`],
  ];

  return (
    <>
      {sample && <SampleBanner />}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/opportunities" className="text-sm text-navy-700 hover:underline">← All opportunities</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <LikelihoodBadge likelihood={c.likelihood} />
          {c.setAside && <Tag>Set-aside</Tag>}
          {c.mbeWbe && <Tag>MBE/WBE</Tag>}
          {c.deVendor && <Tag>DE Vendor</Tag>}
          {c.cooperative && <Tag>Cooperative</Tag>}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">{c.title}</h1>
        <p className="mt-1 text-slate-600">{c.agencyName}</p>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Predicted rebid window</h2>
              <p className="mt-1 text-xl font-semibold text-navy-900 tabular">
                {fmtDate(c.windowStart)} – {fmtDate(c.windowEnd)}
              </p>
              <p className="text-sm text-slate-600">Most likely around {fmtDate(c.predicted)}</p>
              <p className="mb-4 text-sm text-slate-500">{windowCaption(c.status, c.daysToWindow)}</p>
              <Timeline c={c} />
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Why this estimate</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {c.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                The open data does not say whether renewal options remain. If the agency extends this contract,
                the rebid moves later.
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Incumbent vendors</h2>
              {c.vendors.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No awarded vendor listed in the open data for this contract.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {c.vendors.map((v) => (
                    <li key={v.name} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="font-medium text-slate-800">{v.name}</span>
                      <span className="flex gap-1">
                        {v.mwbe && <Tag>OSD certified</Tag>}
                        {v.veteran && <Tag>Service-disabled veteran</Tag>}
                        {v.delaware && <Tag>Delaware</Tag>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <dl className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md bg-navy-800 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-navy-700"
              >
                View on Delaware Bids &amp; Contracts ↗
              </a>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
