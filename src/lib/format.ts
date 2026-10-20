import type { Likelihood, WindowStatus } from "./types";

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtMonth(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtTerm(months: number | null): string {
  if (months === null) return "—";
  if (months < 12) return `${months} mo`;
  const y = months / 12;
  return `${Number.isInteger(y) ? y : y.toFixed(1)} yr`;
}

export const STATUS_LABEL: Record<WindowStatus, string> = {
  open: "Window open",
  upcoming: "Opens within 90 days",
  closing: "Window passed",
  later: "Later",
};

export const STATUS_STYLE: Record<WindowStatus, string> = {
  open: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  upcoming: "bg-amber-50 text-amber-800 ring-amber-600/20",
  closing: "bg-rose-50 text-rose-800 ring-rose-600/20",
  later: "bg-slate-50 text-slate-700 ring-slate-500/20",
};

export const LIKELIHOOD_STYLE: Record<Likelihood, string> = {
  High: "bg-navy-800 text-white",
  Medium: "bg-buff-100 text-navy-900",
  Low: "bg-slate-100 text-slate-600",
};

export function windowCaption(status: WindowStatus, daysToWindow: number): string {
  if (status === "open") return "Watch for the solicitation now";
  if (status === "closing") return "Likely already posted or awarded; check MMP";
  if (daysToWindow <= 0) return "";
  if (daysToWindow < 60) return `Opens in ${daysToWindow} days`;
  return `Opens in ~${Math.round(daysToWindow / 30.44)} months`;
}
