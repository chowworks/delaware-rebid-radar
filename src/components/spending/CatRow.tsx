"use client";

import Link from "next/link";
import { useState } from "react";
import type { CategoryBranch } from "@/lib/spending";
import { VendorLine } from "./DeptRow";
import type { Theme } from "./theme";

// One category on the category tabs. Its top vendors load from
// /api/spending/category the first time it is opened.
export default function CatRow({
  t,
  account,
  label,
  year,
  small,
  summaryClass,
  filterText,
  children,
}: {
  t: Theme;
  account: string;
  label: string;
  year: number | "all";
  small: boolean;
  summaryClass: string;
  filterText: string;
  children: React.ReactNode;
}) {
  const [branch, setBranch] = useState<CategoryBranch | null>(null);
  const [failed, setFailed] = useState(false);
  const q = [year === "all" ? "" : `fy=${year}`, small ? "scope=small" : ""].filter(Boolean).join("&");
  const page = `/spending/categories/${account}${q ? `?${q}` : ""}`;

  function load(open: boolean) {
    if (!open || branch || failed) return;
    fetch(`/api/spending/category?account=${account}&${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setBranch)
      .catch(() => setFailed(true));
  }

  return (
    <details className="group/cat" data-filter={filterText} onToggle={(e) => load(e.currentTarget.open)}>
      <summary className={summaryClass}>{children}</summary>
      <div className={`border-t ${t.border} pb-3 pl-10 pr-4 pt-2`}>
        {failed && <p className={`py-2 text-sm ${t.muted}`}>Couldn&apos;t load vendors. <Link className={t.link} href={page}>Open {label}</Link>.</p>}
        {!branch && !failed && <p className={`py-2 text-sm ${t.muted}`}>Loading vendors…</p>}
        {branch && (
          <>
            <p className={`pb-2 text-xs ${t.muted}`}>
              Top {branch.vendors.length} of {branch.vendorCount.toLocaleString()} vendors, with each one&apos;s share of the category.
            </p>
            <ul className="space-y-1.5 text-sm">
              {branch.vendors.map((v) => (
                <VendorLine key={v.name} t={t} v={v} max={branch.vendors[0].total} share={v.total / branch.total} />
              ))}
            </ul>
            <p className="pt-3 text-xs">
              <Link className={t.link} href={page}>
                All {branch.vendorCount.toLocaleString()} vendors, by department and year, with payment records
              </Link>
            </p>
          </>
        )}
      </div>
    </details>
  );
}
