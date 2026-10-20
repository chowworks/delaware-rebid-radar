"use client";

import Link from "next/link";
import { useMemo } from "react";
import { STATUS_LABEL, fmtDate, fmtMonth, fmtTerm } from "@/lib/format";
import type { Contract, Likelihood } from "@/lib/types";
import { PAGE, type Sort, type Timing, useExplorer } from "../useExplorer";
import { LikelihoodMeter, STATUS_TEXT, Tag } from "./Badges";

export default function Explorer({
  contracts,
  initialQuery = "",
  intro,
}: {
  contracts: Contract[];
  initialQuery?: string;
  intro: React.ReactNode;
}) {
  const {
    q, setQ, agency, setAgency, category, setCategory, timing, setTiming, likelihoods,
    hideCoop, setHideCoop, setAsideOnly, setSetAsideOnly, hidePassed, setHidePassed, sort, setSort, shown, setShown,
    showFilters, setShowFilters, agencies, categories, filtered, toggleLikelihood, download, reset,
  } = useExplorer(contracts, initialQuery);

  // The ten biggest categories become quick-filter chips, like a market switcher.
  const chips = useMemo(() => {
    const n = new Map<string, number>();
    for (const c of contracts) n.set(c.category, (n.get(c.category) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);
  }, [contracts]);

  const select = "rounded-md border border-line bg-white px-3 py-2 text-[13px] text-ink-800 focus:border-de-500 focus:outline-none focus:ring-2 focus:ring-de-500/15";
  const toggle = (on: boolean) =>
    `inline-flex items-center gap-2 rounded border px-2.5 py-1.5 text-[12px] font-medium transition ${on ? "border-de-600 bg-de-50 text-de-700" : "border-line bg-white text-ink-500 hover:border-ink-400"}`;

  return (
    <>
      <section className="wash border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_minmax(0,560px)] lg:px-10 lg:py-20">
          <div>{intro}</div>
          <div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-[0_10px_30px_rgb(10_24_51/0.08)]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {chips.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(category === cat ? "" : cat); setShown(PAGE); }}
                    aria-pressed={category === cat}
                    title={cat}
                    className={`truncate rounded border px-2 py-1.5 text-[11px] transition ${category === cat ? "border-de-600 bg-de-50 font-semibold text-de-700" : "border-line text-ink-500 hover:border-ink-400"}`}
                  >
                    {cat.replace(/ Services$/, "")}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-[22px] font-semibold leading-none text-ink-900 tabular">{filtered.length.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] text-ink-400">matching</p>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-semibold leading-none text-rose-700 tabular">{(contracts.length - filtered.length).toLocaleString()}</p>
                  <p className="mt-1 text-[11px] text-ink-400">filtered out</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="eyebrow text-de-600">Sorted by most likely date</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="rounded-xl border border-line bg-white p-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" className="ml-2 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true">
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <label htmlFor="q" className="sr-only">Search</label>
            <input
              id="q"
              value={q}
              onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
              placeholder="Search titles, agencies, categories, incumbents"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="shrink-0 rounded-md border border-line px-3 py-2 text-[13px] font-medium text-ink-800 lg:hidden"
            >
              {showFilters ? "Hide filters" : "Filters"}
            </button>
          </div>
          <div className={`${showFilters ? "grid" : "hidden"} gap-2 border-t border-line px-1 pt-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center`}>
            <label className="sr-only" htmlFor="timing">Most likely date</label>
            <select id="timing" value={timing} onChange={(e) => { setTiming(e.target.value as Timing); setShown(PAGE); }} className={select}>
              <option value="all">Expected: any time</option>
              <option value="open">Expected: now</option>
              <option value="90">Expected: now or within 90 days</option>
              <option value="180">Expected: now or within 6 months</option>
              <option value="365">Expected: now or within 12 months</option>
            </select>
            <label className="sr-only" htmlFor="agency">Agency</label>
            <select id="agency" value={agency} onChange={(e) => { setAgency(e.target.value); setShown(PAGE); }} className={`${select} lg:max-w-60`}>
              <option value="">All agencies</option>
              {agencies.map(([code, name]) => (
                <option key={code} value={code}>{name === code ? code : `${name} (${code})`}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE); }} className={`${select} lg:max-w-60`}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <fieldset className="flex items-center gap-1 rounded-md border border-line p-0.5">
              <legend className="sr-only">Rebid likelihood</legend>
              <span className="eyebrow px-2 text-[10px] text-ink-400">Likelihood</span>
              {(["High", "Medium", "Low"] as Likelihood[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLikelihood(l)}
                  aria-pressed={likelihoods.includes(l)}
                  className={`flex-1 rounded px-2.5 py-1.5 text-[12px] font-medium ${likelihoods.includes(l) ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-paper"}`}
                >
                  {l}
                </button>
              ))}
            </fieldset>
          </div>
          <div className={`${showFilters ? "flex" : "hidden"} flex-wrap items-center gap-2 px-1 pb-1 pt-2 lg:flex`}>
            <label className={toggle(setAsideOnly)}>
              <input type="checkbox" className="accent-de-600" checked={setAsideOnly} onChange={(e) => { setSetAsideOnly(e.target.checked); setShown(PAGE); }} />
              Set-aside only
            </label>
            <label className={toggle(hideCoop)}>
              <input type="checkbox" className="accent-de-600" checked={hideCoop} onChange={(e) => { setHideCoop(e.target.checked); setShown(PAGE); }} />
              Hide cooperative / GSA (rebid outside Delaware)
            </label>
            <label className={toggle(hidePassed)}>
              <input type="checkbox" className="accent-de-600" checked={hidePassed} onChange={(e) => { setHidePassed(e.target.checked); setShown(PAGE); }} />
              Hide likely already posted
            </label>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort" className="eyebrow text-[10px] text-ink-400">Sort</label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${select} py-1.5`}>
                <option value="window">Most likely date</option>
                <option value="expiration">Expiration date</option>
                <option value="agency">Agency</option>
              </select>
              <button type="button" onClick={download} className="rounded-md border border-line px-3 py-1.5 text-[13px] text-ink-800 hover:border-ink-400">
                Export CSV
              </button>
              <button type="button" onClick={reset} className="px-1 text-[12px] font-medium text-de-600 hover:text-de-700">Reset</button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-line p-12 text-center">
            <p className="display text-2xl text-ink-900">No contracts match these filters.</p>
            <button type="button" onClick={reset} className="mt-2 text-sm font-medium text-de-600">Reset filters</button>
          </div>
        ) : (
          <ul className="mt-6 space-y-2.5">
            {filtered.slice(0, shown).map((c) => {
              const certified = c.vendors.some((v) => v.mwbe);
              return (
                <li key={c.id}>
                  <Link
                    href={`/opportunities/${encodeURIComponent(c.id)}`}
                    className="grid gap-4 rounded-xl border border-line bg-white p-4 shadow-[0_4px_14px_rgb(10_24_51/0.04)] transition hover:border-de-500/50 hover:shadow-[0_10px_30px_rgb(10_24_51/0.08)] sm:grid-cols-[minmax(0,1fr)_170px] sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="tag">{c.category}</span>
                        <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
                          <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${c.vendors.length === 0 ? "text-ink-400" : certified ? "text-ink-400" : "text-green-600"}`} aria-hidden="true">
                            <circle cx="8" cy="8" r="7" className="fill-current opacity-15" />
                            <path d="m5 8.2 2 2 4-4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {c.vendors.length === 0 ? "No incumbent listed" : certified ? "OSD-certified incumbent" : "No OSD-certified incumbent"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-ink-900">
                        {c.title}
                        <span className="font-normal text-ink-500"> · {c.agencyName}</span>
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
                        <span className="rounded bg-de-50 px-2 py-1 font-semibold text-de-700">{c.agency}</span>
                        <span className="rounded bg-de-50 px-2 py-1 font-mono font-medium text-de-700">{c.number}</span>
                        {c.setAside && <Tag>Set-aside</Tag>}
                        {c.mbeWbe && <Tag>MBE/WBE</Tag>}
                        <span className="text-ink-400">
                          Term {fmtTerm(c.termMonths)} · Expires {fmtDate(c.expiration)}
                          {c.vendors.length > 0 && <> · {c.vendors.slice(0, 2).map((v) => v.name).join(", ")}{c.vendors.length > 2 ? ` +${c.vendors.length - 2}` : ""}</>}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-line pt-3 sm:block sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
                      <div>
                        <p className={`text-[26px] font-semibold leading-none tracking-tight tabular ${STATUS_TEXT[c.status]}`}>{fmtMonth(c.predicted)}</p>
                        <p className={`mt-1.5 text-[12px] ${STATUS_TEXT[c.status]}`}>{STATUS_LABEL[c.status]}</p>
                      </div>
                      <div className="text-right sm:mt-3">
                        <p className="flex items-center justify-end gap-1.5 text-[12px] text-ink-500">
                          <LikelihoodMeter likelihood={c.likelihood} /> {c.likelihood} likelihood
                        </p>
                        <p className="mt-1 whitespace-nowrap font-mono text-[10.5px] text-ink-400">window {fmtMonth(c.windowStart)} – {fmtMonth(c.windowEnd)}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {shown < filtered.length && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setShown((s) => s + PAGE)} className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink-800 hover:border-ink-400">
              Show more <span className="font-mono text-ink-400">({filtered.length - shown} remaining)</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
