"use client";

import Link from "next/link";
import { fmtDate, fmtMonth, fmtTerm, windowCaption } from "@/lib/format";
import type { Contract, Likelihood } from "@/lib/types";
import { PAGE, type Sort, type Timing, useExplorer } from "../useExplorer";
import { LikelihoodMeter, StatusBadge, Tag } from "./Badges";

export default function Explorer({ contracts, initialQuery = "" }: { contracts: Contract[]; initialQuery?: string }) {
  const {
    q, setQ, agency, setAgency, category, setCategory, timing, setTiming, likelihoods,
    hideCoop, setHideCoop, setAsideOnly, setSetAsideOnly, hidePassed, setHidePassed, sort, setSort, shown, setShown,
    showFilters, setShowFilters, agencies, categories, filtered, toggleLikelihood, download, reset,
  } = useExplorer(contracts, initialQuery);

  const select = "rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-800 focus:border-de-500 focus:outline-none focus:ring-2 focus:ring-de-500/15";
  const toggle = (on: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-de-600 bg-de-50 text-de-700" : "border-line bg-white text-ink-500 hover:border-ink-400"}`;

  return (
    <div>
      <div className="rounded-2xl border border-line bg-white p-2 shadow-[0_8px_30px_rgb(11_26_51/0.06)]">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" className="ml-2 h-5 w-5 shrink-0 text-ink-400" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <label htmlFor="q" className="sr-only">Search</label>
          <input
            id="q"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            placeholder="Search titles, agencies, categories, incumbents. Try janitorial, IT, HVAC"
            className="min-w-0 flex-1 bg-transparent px-1 py-3 text-base text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-700 lg:hidden"
          >
            {showFilters ? "Hide filters" : "Filters"}
          </button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} gap-2 border-t border-line px-2 pb-1 pt-3 sm:grid-cols-2 lg:mt-1 lg:flex lg:flex-wrap lg:items-center`}>
          <label className="sr-only" htmlFor="timing">Predicted window</label>
          <select id="timing" value={timing} onChange={(e) => { setTiming(e.target.value as Timing); setShown(PAGE); }} className={select}>
            <option value="all">Window: any time</option>
            <option value="open">Window: open now</option>
            <option value="90">Window: open or within 90 days</option>
            <option value="180">Window: open or within 6 months</option>
            <option value="365">Window: open or within 12 months</option>
          </select>
          <label className="sr-only" htmlFor="agency">Agency</label>
          <select id="agency" value={agency} onChange={(e) => { setAgency(e.target.value); setShown(PAGE); }} className={`${select} lg:max-w-64`}>
            <option value="">All agencies</option>
            {agencies.map(([code, name]) => (
              <option key={code} value={code}>{name === code ? code : `${name} (${code})`}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="category">Category</label>
          <select id="category" value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE); }} className={`${select} lg:max-w-64`}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <fieldset className="flex items-center gap-1 rounded-lg border border-line p-0.5">
            <legend className="sr-only">Rebid likelihood</legend>
            <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">Likelihood</span>
            {(["High", "Medium", "Low"] as Likelihood[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLikelihood(l)}
                aria-pressed={likelihoods.includes(l)}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${likelihoods.includes(l) ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-paper"}`}
              >
                {l}
              </button>
            ))}
          </fieldset>
        </div>
        <div className={`${showFilters ? "flex" : "hidden"} flex-wrap items-center gap-2 px-2 pb-2 pt-2 lg:flex`}>
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
            Hide passed windows
          </label>
          <button type="button" onClick={reset} className="ml-auto px-2 text-xs font-medium text-de-600 hover:text-de-700">Reset filters</button>
        </div>
      </div>

      <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-ink-500">
          <span className="display mr-1 text-3xl text-ink-900 tabular">{filtered.length.toLocaleString()}</span> of {contracts.length.toLocaleString()} contracts
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="font-mono text-[11px] uppercase tracking-wider text-ink-400">Sort</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
            <option value="window">Predicted window</option>
            <option value="expiration">Expiration date</option>
            <option value="agency">Agency</option>
          </select>
          <button type="button" onClick={download} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink-800 hover:border-ink-400">
            Export CSV
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-12 text-center">
          <p className="display text-2xl text-ink-900">No contracts match these filters.</p>
          <button type="button" onClick={reset} className="mt-2 text-sm font-medium text-de-600">Reset filters</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_150px_120px] gap-4 border-b border-line bg-paper px-5 py-2.5 md:grid">
            <span className="eyebrow text-ink-400">Contract</span>
            <span className="eyebrow text-ink-400">Predicted window</span>
            <span className="eyebrow text-ink-400">Status</span>
            <span className="eyebrow text-right text-ink-400">Likelihood</span>
          </div>
          <ul className="divide-y divide-line">
            {filtered.slice(0, shown).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/opportunities/${encodeURIComponent(c.id)}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-de-50 md:grid-cols-[minmax(0,1fr)_170px_150px_120px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-ink-400">{c.number}</p>
                    <h3 className="mt-0.5 font-medium leading-snug text-ink-900">{c.title}</h3>
                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {c.agencyName} · {c.category}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                      <span>Term {fmtTerm(c.termMonths)}</span>
                      <span>Expires {fmtDate(c.expiration)}</span>
                      {c.vendors.length > 0 && (
                        <span className="truncate">Incumbent: {c.vendors.slice(0, 2).map((v) => v.name).join(", ")}{c.vendors.length > 2 ? ` +${c.vendors.length - 2}` : ""}</span>
                      )}
                      {c.setAside && <Tag>Set-aside</Tag>}
                      {c.mbeWbe && <Tag>MBE/WBE</Tag>}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-ink-900 tabular">{fmtMonth(c.windowStart)} – {fmtMonth(c.windowEnd)}</p>
                    <p className="text-xs text-ink-400">{windowCaption(c.status, c.daysToWindow)}</p>
                  </div>
                  <div><StatusBadge status={c.status} /></div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <LikelihoodMeter likelihood={c.likelihood} />
                    <span className="text-sm text-ink-700">{c.likelihood}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {shown < filtered.length && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setShown((s) => s + PAGE)} className="rounded-lg border border-line bg-white px-4 py-2 text-sm text-ink-800 hover:border-ink-400">
            Show more <span className="font-mono text-ink-400">({filtered.length - shown} remaining)</span>
          </button>
        </div>
      )}
    </div>
  );
}
