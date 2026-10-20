import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LikelihoodBadge, SampleBanner, StatusBadge, Tag } from "@/components/v2/Badges";
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
      <div className="relative h-2 rounded-full bg-line">
        <div
          className="absolute inset-y-0 rounded-full bg-de-600"
          style={{ left: `${pct(c.windowStart)}%`, width: `${Math.max(pct(c.windowEnd) - pct(c.windowStart), 1)}%` }}
        />
        <div className="absolute -top-1.5 h-5 w-0.5 bg-buff-500" style={{ left: `${pct(today)}%` }} title="Today" />
      </div>
      <div className="mt-3 flex justify-between font-mono text-[11px] text-ink-400">
        <span>{zoomed ? fmtDate(new Date(start).toISOString().slice(0, 10)) : `Effective ${fmtDate(c.effective)}`}</span>
        <span>Expires {fmtDate(c.expiration)}</span>
      </div>
      <p className="mt-3 text-xs text-ink-500">
        <span className="mr-1 inline-block h-2 w-3 rounded-sm bg-de-600 align-middle" /> Predicted solicitation window
        <span className="ml-3 mr-1 inline-block h-3 w-0.5 bg-buff-500 align-middle" /> Today
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

  const card = "rounded-2xl border border-line bg-white p-6";

  return (
    <>
      {sample && <SampleBanner />}
      <div className="wash border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
          <Link href="/opportunities" className="text-sm text-ink-500 hover:text-de-700">← All opportunities</Link>
          <p className="mt-8 font-mono text-xs text-de-600">{c.number || "No contract number"}</p>
          <h1 className="display mt-2 max-w-4xl text-4xl text-ink-900 sm:text-6xl">{c.title}</h1>
          <p className="mt-3 text-lg text-ink-500">{c.agencyName}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <LikelihoodBadge likelihood={c.likelihood} />
            {c.setAside && <Tag>Set-aside</Tag>}
            {c.mbeWbe && <Tag>MBE/WBE</Tag>}
            {c.deVendor && <Tag>DE Vendor</Tag>}
            {c.cooperative && <Tag>Cooperative</Tag>}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className={`${card} shadow-[0_12px_40px_rgb(11_26_51/0.06)]`}>
              <h2 className="eyebrow text-ink-400">Most likely rebid posting</h2>
              <p className="display mt-3 text-4xl text-ink-900 tabular">Around {fmtDate(c.predicted)}</p>
              <p className="mt-2 text-sm text-ink-700">{windowCaption(c.status, c.daysToPredicted)}</p>
              <p className="mb-6 text-sm text-ink-500">
                Half of past rebids like this posted between <span className="font-mono">{fmtDate(c.windowStart)}</span> and{" "}
                <span className="font-mono">{fmtDate(c.windowEnd)}</span>.
              </p>
              <Timeline c={c} />
            </section>

            <section className={card}>
              <h2 className="eyebrow text-ink-400">Why this estimate</h2>
              <ul className="mt-4 space-y-3">
                {c.reasons.map((r) => (
                  <li key={r} className="grid grid-cols-[24px_1fr] gap-x-2 text-[15px] text-ink-800">
                    <span className="mt-2.5 h-px w-4 bg-ink-400" />
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-4 text-xs text-ink-500">
                The open data does not say whether renewal options remain. If the agency extends this contract,
                the rebid moves later.
              </p>
            </section>

            <section className={card}>
              <h2 className="eyebrow text-ink-400">Incumbent vendors</h2>
              {c.vendors.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">No awarded vendor listed in the open data for this contract.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {c.vendors.map((v) => (
                    <li key={v.name} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span className="font-medium text-ink-900">{v.name}</span>
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

          <aside className="space-y-4 md:sticky md:top-20 md:self-start">
            <dl className="overflow-hidden rounded-2xl border border-line bg-white text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg bg-de-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-de-700"
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
