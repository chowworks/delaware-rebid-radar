"use client";

import { useEffect, useState } from "react";

// A type-to-filter box for a server-rendered list. Rows inside #target carry
// data-filter with the text they match on; rows that don't match are hidden.
export default function QuickFilter({
  target,
  placeholder,
  noun,
  classes,
}: {
  target: string;
  placeholder: string;
  noun: string;
  classes: { input: string; muted: string };
}) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState<[number, number] | null>(null);

  useEffect(() => {
    const rows = [...document.querySelectorAll<HTMLElement>(`#${target} [data-filter]`)];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    for (const row of rows) {
      const text = row.dataset.filter!.toLowerCase();
      const hit = words.every((w) => text.includes(w));
      row.hidden = !hit;
      if (hit) n++;
    }
    setShown(words.length ? [n, rows.length] : null);
  }, [q, target]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full max-w-sm rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${classes.input}`}
      />
      {shown && (
        <span className={`text-xs ${classes.muted}`} aria-live="polite">
          {shown[0] === 0 ? `No ${noun} match` : `${shown[0]} of ${shown[1]} ${noun}`}
        </span>
      )}
    </div>
  );
}
