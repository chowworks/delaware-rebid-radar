import { STATUS_LABEL } from "@/lib/format";
import type { Likelihood, WindowStatus } from "@/lib/types";

const STATUS_STYLE: Record<WindowStatus, string> = {
  open: "border-emerald-200 bg-emerald-50 text-emerald-800",
  upcoming: "border-amber-200 bg-amber-50 text-amber-800",
  closing: "border-rose-200 bg-rose-50 text-rose-800",
  later: "border-line bg-white text-ink-700",
};

export const STATUS_DOT: Record<WindowStatus, string> = {
  open: "bg-emerald-500",
  upcoming: "bg-amber-500",
  closing: "bg-rose-500",
  later: "bg-ink-400",
};

export const STATUS_TEXT: Record<WindowStatus, string> = {
  open: "text-green-700",
  upcoming: "text-amber-700",
  closing: "text-rose-700",
  later: "text-ink-500",
};

const LIKELIHOOD_STYLE: Record<Likelihood, string> = {
  High: "bg-de-600 text-white",
  Medium: "bg-de-100 text-de-700",
  Low: "bg-slate-100 text-ink-500",
};

export function StatusBadge({ status }: { status: WindowStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const BARS: Record<Likelihood, number> = { High: 3, Medium: 2, Low: 1 };

export function LikelihoodMeter({ likelihood }: { likelihood: Likelihood }) {
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-1 rounded-sm ${i <= BARS[likelihood] ? "bg-de-600" : "bg-line"}`} style={{ height: 4 + i * 3 }} />
      ))}
    </span>
  );
}

export function LikelihoodBadge({ likelihood }: { likelihood: Likelihood }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${LIKELIHOOD_STYLE[likelihood]}`}>
      {likelihood} rebid likelihood
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="tag bg-white">{children}</span>
  );
}

export function SampleBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-900">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
        Showing a small built-in sample. The live feed from data.delaware.gov could not be reached.
      </div>
    </div>
  );
}
