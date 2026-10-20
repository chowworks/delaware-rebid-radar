import { LIKELIHOOD_STYLE, STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import type { Likelihood, WindowStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: WindowStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
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
    <span className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
      {children}
    </span>
  );
}

export function SampleBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
        Showing a small built-in sample. The live feed from data.delaware.gov could not be reached.
      </div>
    </div>
  );
}
