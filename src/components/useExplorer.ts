"use client";

import { useMemo, useState } from "react";
import type { Contract, Likelihood } from "@/lib/types";

// Search, filter and sort state shared by both designs' explorers.

export type Timing = "all" | "open" | "90" | "180" | "365";
export type Sort = "window" | "expiration" | "agency";

export const PAGE = 40;

function inTiming(c: Contract, timing: Timing): boolean {
  if (timing === "all") return true;
  if (timing === "open") return c.status === "open";
  const days = Number(timing);
  return c.status === "open" || (c.daysToWindow > 0 && c.daysToWindow <= days);
}

function toCsv(rows: Contract[]): string {
  const head = [
    "Contract number", "Title", "Agency", "Category", "Effective", "Expiration",
    "Predicted window start", "Predicted window end", "Most likely posting", "Rebid likelihood", "Incumbent vendors", "MMP link",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((c) =>
    [
      c.number, c.title, c.agencyName, c.category, c.effective ?? "", c.expiration,
      c.windowStart, c.windowEnd, c.predicted, c.likelihood, c.vendors.map((v) => v.name).join("; "), c.url ?? "",
    ].map((v) => esc(String(v))).join(","),
  );
  return [head.map(esc).join(","), ...lines].join("\n");
}

export function useExplorer(contracts: Contract[], initialQuery: string) {
  const [q, setQ] = useState(initialQuery);
  const [agency, setAgency] = useState("");
  const [category, setCategory] = useState("");
  const [timing, setTiming] = useState<Timing>("all");
  const [likelihoods, setLikelihoods] = useState<Likelihood[]>(["High", "Medium"]);
  const [hideCoop, setHideCoop] = useState(true);
  const [setAsideOnly, setSetAsideOnly] = useState(false);
  const [hidePassed, setHidePassed] = useState(true);
  const [sort, setSort] = useState<Sort>("window");
  const [shown, setShown] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  const agencies = useMemo(
    () =>
      [...new Map(contracts.map((c) => [c.agency, c.agencyName])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1])),
    [contracts],
  );
  const categories = useMemo(
    () => [...new Set(contracts.map((c) => c.category))].sort(),
    [contracts],
  );

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = contracts.filter((c) => {
      if (agency && c.agency !== agency) return false;
      if (category && c.category !== category) return false;
      if (!likelihoods.includes(c.likelihood)) return false;
      if (hideCoop && c.cooperative) return false;
      if (setAsideOnly && !c.setAside) return false;
      if (hidePassed && c.status === "closing") return false;
      if (!inTiming(c, timing)) return false;
      if (terms.length) {
        const hay = `${c.title} ${c.number} ${c.agencyName} ${c.category} ${c.vendors.map((v) => v.name).join(" ")}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const by: Record<Sort, (a: Contract, b: Contract) => number> = {
      window: (a, b) => a.predicted.localeCompare(b.predicted),
      expiration: (a, b) => a.expiration.localeCompare(b.expiration),
      agency: (a, b) => a.agencyName.localeCompare(b.agencyName) || a.predicted.localeCompare(b.predicted),
    };
    return rows.sort(by[sort]);
  }, [contracts, q, agency, category, timing, likelihoods, hideCoop, setAsideOnly, hidePassed, sort]);

  function toggleLikelihood(l: Likelihood) {
    setShown(PAGE);
    setLikelihoods((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  }

  function download() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "delaware-rebid-opportunities.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const reset = () => {
    setQ(""); setAgency(""); setCategory(""); setTiming("all");
    setLikelihoods(["High", "Medium"]); setHideCoop(true); setSetAsideOnly(false); setHidePassed(true);
    setShown(PAGE);
  };

  return {
    q, setQ, agency, setAgency, category, setCategory, timing, setTiming, likelihoods,
    hideCoop, setHideCoop, setAsideOnly, setSetAsideOnly, hidePassed, setHidePassed, sort, setSort, shown, setShown,
    showFilters, setShowFilters, agencies, categories, filtered, toggleLikelihood, download, reset,
  };
}
