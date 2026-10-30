"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtMoney } from "@/lib/format";
import type { DivisionBranch } from "@/lib/spending";
import type { Theme } from "./theme";

// One department on /spending. Its divisions and their top vendors load from
// /api/spending/tree the first time it is opened, so the page itself stays
// small.
export default function DeptRow({
  t,
  slug,
  name,
  year,
  total,
  summaryClass,
  filterText,
  children,
}: {
  t: Theme;
  slug: string;
  name: string;
  year: number | "all";
  total: number;
  summaryClass: string;
  filterText: string;
  children: React.ReactNode;
}) {
  const [divisions, setDivisions] = useState<DivisionBranch[] | null>(null);
  const [failed, setFailed] = useState(false);
  const fy = year === "all" ? "" : `fy=${year}`;
  const page = (q: string) => `/spending/${slug}${[fy, q].filter(Boolean).length ? `?${[fy, q].filter(Boolean).join("&")}` : ""}`;

  function load(open: boolean) {
    if (!open || divisions || failed) return;
    fetch(`/api/spending/tree?dept=${encodeURIComponent(slug)}&${fy}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setDivisions)
      .catch(() => setFailed(true));
  }

  return (
    <details className="group/dept" data-filter={filterText} onToggle={(e) => load(e.currentTarget.open)}>
      <summary className={summaryClass}>{children}</summary>
      <div className={`border-t ${t.border} pb-2 pl-8 pr-4 pt-1`}>
        {failed && <p className={`px-2 py-3 text-sm ${t.muted}`}>Couldn&apos;t load divisions. <Link className={t.link} href={page("")}>Open the {name} page</Link>.</p>}
        {!divisions && !failed && <p className={`px-2 py-3 text-sm ${t.muted}`}>Loading divisions…</p>}
        {divisions?.map((div) => (
          <details key={div.slug} className="group/div">
            <summary className={`grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_14rem] items-center gap-x-4 rounded px-2 py-2 text-sm ${t.rowHover} [&::-webkit-details-marker]:hidden`}>
              <span className={`flex min-w-0 items-center gap-2 ${t.text}`}>
                <span className={`text-[9px] ${t.muted} transition group-open/div:rotate-90`} aria-hidden="true">▶</span>
                <span className="truncate">{div.name}</span>
                <span className={`shrink-0 text-xs ${t.muted}`}>{div.vendorCount} vendors</span>
              </span>
              <span className="grid grid-cols-[1fr_4.5rem] items-center gap-2">
                <MiniBar t={t} value={div.total} max={total} />
                <span className={`text-right text-xs tabular ${t.text}`}>{fmtMoney(div.total)}</span>
              </span>
            </summary>
            <ul className="mb-2 ml-6 mr-2 space-y-1.5 py-1 text-sm">
              {div.vendors.map((v) => (
                <VendorLine key={v.name} t={t} v={v} max={div.vendors[0].total} />
              ))}
              <li className="pt-1 text-xs">
                <Link className={t.link} href={page(`division=${div.slug}`)}>
                  {div.vendorCount > div.vendors.length ? `All ${div.vendorCount} vendors, by year and with payment records` : "Vendor details and payment records"}
                </Link>
              </li>
            </ul>
          </details>
        ))}
        {divisions && (
          <p className="px-2 pt-2 text-xs">
            <Link className={t.link} href={page("")}>Full {name} page</Link>
          </p>
        )}
      </div>
    </details>
  );
}

type BranchVendor = DivisionBranch["vendors"][number];

export function MiniBar({ t, value, max, color }: { t: Theme; value: number; max: number; color?: string }) {
  return (
    <span className={`block h-1.5 w-full overflow-hidden rounded-full ${t.barTrack}`}>
      <span className={`block h-full rounded-full ${color ?? t.bar}`} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </span>
  );
}

// One vendor in a drill-down: name, badges, a bar against the biggest vendor
// in the list, and dollars. `share` adds the vendor's share of a total.
export function VendorLine({ t, v, max, share }: { t: Theme; v: BranchVendor; max: number; share?: number }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_14rem] items-center gap-x-4">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className={`truncate ${t.text}`}>{v.name}</span>
        {v.size === "large" && <Badge className={t.badgeLarge}>Large business</Badge>}
        {v.size === "small" && <Badge className={t.badgeSmall}>Small business</Badge>}
        {v.size === "nonprofit" && <Badge className={t.badgeNonprofit}>Nonprofit</Badge>}
        {v.osd && <Badge className={t.badgeOsd}>Diverse-owned</Badge>}
        {v.onContract && <Badge className={t.badgeContract}>On state contract</Badge>}
      </span>
      <span className={`grid ${share === undefined ? "grid-cols-[1fr_4.5rem]" : "grid-cols-[1fr_4.5rem_3rem]"} items-center gap-2`}>
        <MiniBar t={t} value={v.total} max={max} color={v.size === "large" ? t.barLarge : t.bar} />
        <span className={`text-right text-xs tabular ${t.muted}`}>{fmtMoney(v.total)}</span>
        {share !== undefined && <span className={`text-right text-xs tabular ${t.text}`}>{(share * 100).toFixed(share < 0.1 ? 1 : 0)}%</span>}
      </span>
    </li>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}
