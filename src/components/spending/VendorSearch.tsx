"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Entry = [name: string, slug: string, total: number, small: number, onContract: 0 | 1, pcard: 0 | 1];
type Result = { q: string; count: number; vendors: Entry[] };

function money(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

// Find any vendor the state paid for purchases, not just the top ones a list
// shows. Searches on the server as you type.
export default function VendorSearch({
  classes,
}: {
  classes: { input: string; panel: string; muted: string; text: string; divide: string; row: string; pcard: string };
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const query = q.trim();

  useEffect(() => {
    if (!query) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/spending/vendors?${new URLSearchParams({ q: query })}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((r: Omit<Result, "q">) => setResult({ q: query, ...r }))
        .catch((err) => err?.name !== "AbortError" && setResult({ q: query, count: 0, vendors: [] }));
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const current = result && result.q === query ? result : null;

  return (
    <div className="relative w-full max-w-md" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <input
        type="search"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Find a vendor, e.g. Code Differently"
        aria-label="Find a vendor"
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${classes.input}`}
      />
      {open && query && (
        <div className={`absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border shadow-lg ${classes.panel}`}>
          {!current ? (
            <p className={`px-3 py-2 text-xs ${classes.muted}`}>Searching…</p>
          ) : current.count === 0 ? (
            <p className={`px-3 py-2 text-xs ${classes.muted}`}>No vendor matches. Only purchases are included, not grants or salaries.</p>
          ) : (
            <ul className={`divide-y text-sm ${classes.divide}`}>
              {current.vendors.map(([name, slug, total, small, onContract, pcard]) => (
                <li key={slug}>
                  <Link href={`/spending/vendors/${slug}`} className={`flex items-center justify-between gap-3 px-3 py-2 ${classes.row}`}>
                    <span className={`min-w-0 truncate ${classes.text}`}>
                      {name}
                      {pcard ? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${classes.pcard}`}>P-Card</span> : null}
                    </span>
                    <span className={`shrink-0 text-xs tabular-nums ${classes.muted}`}>
                      {money(total)}
                      {small > 0 ? ` · ${money(small)} small` : onContract ? " · on contract" : ""}
                    </span>
                  </Link>
                </li>
              ))}
              {current.count > current.vendors.length && (
                <li className={`px-3 py-2 text-xs ${classes.muted}`}>
                  {current.count - current.vendors.length} more; keep typing to narrow.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
