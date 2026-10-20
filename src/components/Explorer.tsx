"use client";

import Link from "next/link";
import { fmtDate, fmtMonth, fmtTerm, windowCaption } from "@/lib/format";
import type { Contract, Likelihood } from "@/lib/types";
import { PAGE, type Sort, type Timing, useExplorer } from "./useExplorer";
import { LikelihoodBadge, StatusBadge, Tag } from "./Badges";

export default function Explorer({ contracts, initialQuery = "" }: { contracts: Contract[]; initialQuery?: string }) {
  const {
    q, setQ, agency, setAgency, category, setCategory, timing, setTiming, likelihoods,
    hideCoop, setHideCoop, setAsideOnly, setSetAsideOnly, hidePassed, setHidePassed, sort, setSort, shown, setShown,
    showFilters, setShowFilters, agencies, categories, filtered, toggleLikelihood, download, reset,
  } = useExplorer(contracts, initialQuery);

  const select = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-navy-900 lg:hidden"
      >
        {showFilters ? "Hide filters" : "Search & filters"}
      </button>
      <aside className={`${showFilters ? "block" : "hidden"} space-y-5 lg:sticky lg:top-4 lg:block lg:self-start`}>
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
          <input
            id="q"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            placeholder="e.g. janitorial, IT, HVAC"
            className={select}
          />
        </div>
        <div>
          <label htmlFor="timing" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Predicted window</label>
          <select id="timing" value={timing} onChange={(e) => { setTiming(e.target.value as Timing); setShown(PAGE); }} className={select}>
            <option value="all">Any time</option>
            <option value="open">Expected now</option>
            <option value="90">Now or within 90 days</option>
            <option value="180">Now or within 6 months</option>
            <option value="365">Now or within 12 months</option>
          </select>
        </div>
        <div>
          <label htmlFor="agency" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Agency</label>
          <select id="agency" value={agency} onChange={(e) => { setAgency(e.target.value); setShown(PAGE); }} className={select}>
            <option value="">All agencies</option>
            {agencies.map(([code, name]) => (
              <option key={code} value={code}>{name === code ? code : `${name} (${code})`}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
          <select id="category" value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE); }} className={select}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Rebid likelihood</legend>
          <div className="flex gap-2">
            {(["High", "Medium", "Low"] as Likelihood[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLikelihood(l)}
                aria-pressed={likelihoods.includes(l)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${likelihoods.includes(l) ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2 text-sm text-slate-700">
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 accent-navy-800" checked={setAsideOnly} onChange={(e) => { setSetAsideOnly(e.target.checked); setShown(PAGE); }} />
            Set-aside contracts only
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 accent-navy-800" checked={hideCoop} onChange={(e) => { setHideCoop(e.target.checked); setShown(PAGE); }} />
            Hide cooperative / GSA contracts (rebid outside Delaware)
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 accent-navy-800" checked={hidePassed} onChange={(e) => { setHidePassed(e.target.checked); setShown(PAGE); }} />
            Hide contracts likely already posted
          </label>
        </div>
        <button type="button" onClick={reset} className="text-sm text-navy-700 underline">Reset filters</button>
      </aside>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900 tabular">{filtered.length.toLocaleString()}</span> of {contracts.length.toLocaleString()} contracts
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-slate-500">Sort</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
              <option value="window">Predicted window</option>
              <option value="expiration">Expiration date</option>
              <option value="agency">Agency</option>
            </select>
            <button type="button" onClick={download} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
              Export CSV
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No contracts match these filters.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.slice(0, shown).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/opportunities/${encodeURIComponent(c.id)}`}
                  className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-navy-700/40 hover:shadow"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={c.status} />
                        <LikelihoodBadge likelihood={c.likelihood} />
                        {c.setAside && <Tag>Set-aside</Tag>}
                        {c.mbeWbe && <Tag>MBE/WBE</Tag>}
                      </div>
                      <h3 className="font-semibold text-navy-900">{c.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {c.agencyName} · {c.category}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {c.number} · Term {fmtTerm(c.termMonths)} · Expires {fmtDate(c.expiration)}
                        {c.vendors.length > 0 && <> · Incumbent: {c.vendors.slice(0, 2).map((v) => v.name).join(", ")}{c.vendors.length > 2 ? ` +${c.vendors.length - 2}` : ""}</>}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-md bg-navy-50 px-3 py-2 text-left sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Predicted rebid window</p>
                      <p className="font-semibold text-navy-900 tabular">{fmtMonth(c.windowStart)} – {fmtMonth(c.windowEnd)}</p>
                      <p className="text-xs text-slate-500">{windowCaption(c.status, c.daysToPredicted)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {shown < filtered.length && (
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setShown((s) => s + PAGE)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
              Show more ({filtered.length - shown} remaining)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
