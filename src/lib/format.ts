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
  open: "Expected now",
  upcoming: "Expected within 90 days",
  closing: "Likely already posted",
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

export function windowCaption(status: WindowStatus, daysToPredicted: number): string {
  if (status === "closing") return "Most likely date has passed; check MMP for an open bid";
  if (status === "open") return daysToPredicted >= 0 ? "Watch for the solicitation now" : "Most likely date just passed; watch MMP now";
  if (daysToPredicted < 60) return `Most likely in ${daysToPredicted} days`;
  return `Most likely in ~${Math.round(daysToPredicted / 30.44)} months`;
}
