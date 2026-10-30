"use client";

import { useMemo, useState } from "react";

export type SizedVendor = [name: string, size: "large" | "small" | "nonprofit", federalName: string, stateTotal: number];

const LABEL = { large: "Large business", small: "Small business", nonprofit: "Nonprofit" } as const;
const SHOW = 150;

function money(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

// Every vendor with a size on federal record, searchable by name.
export default function VendorSizeSearch({
  vendors,
  classes,
}: {
  vendors: SizedVendor[];
  classes: { input: string; chip: string; chipOn: string; muted: string; text: string; divide: string; badge: Record<SizedVendor[1], string> };
}) {
  const [q, setQ] = useState("");
  const [size, setSize] = useState<SizedVendor[1] | "all">("all");
  const counts = useMemo(() => {
    const c = { large: 0, small: 0, nonprofit: 0 };
    for (const v of vendors) c[v[1]]++;
    return c;
  }, [vendors]);
  const matches = useMemo(() => {
    const words = q.toUpperCase().split(/\s+/).filter(Boolean);
    return vendors.filter(
      ([name, s, fed]) => (size === "all" || s === size) && words.every((w) => name.includes(w) || fed.toUpperCase().includes(w)),
    );
  }, [vendors, q, size]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a vendor, e.g. Deloitte"
        aria-label="Search vendors"
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${classes.input}`}
      />
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {(["all", "large", "small", "nonprofit"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSize(s)} className={size === s ? classes.chipOn : classes.chip}>
            {s === "all" ? `All ${vendors.length.toLocaleString()}` : `${LABEL[s]} ${counts[s].toLocaleString()}`}
          </button>
        ))}
      </div>
      <ul className={`mt-3 divide-y text-sm ${classes.divide}`}>
        {matches.slice(0, SHOW).map(([name, s, fed, total]) => (
          <li key={name} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className={`block truncate ${classes.text}`}>{name}</span>
              {fed.toUpperCase() !== name && <span className={`block truncate text-xs ${classes.muted}`}>Federal record: {fed}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={`text-xs tabular-nums ${classes.muted}`}>{money(total)}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${classes.badge[s]}`}>{LABEL[s]}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={`mt-3 text-xs ${classes.muted}`}>
        {matches.length > SHOW ? `Showing ${SHOW} of ${matches.length.toLocaleString()}; search to narrow. ` : matches.length === 0 ? "No match. " : ""}
        Dollar figures are what the state paid each vendor for purchases, all years. A vendor not in this list has no
        federal size record and shows as size unknown.
      </p>
    </div>
  );
}
