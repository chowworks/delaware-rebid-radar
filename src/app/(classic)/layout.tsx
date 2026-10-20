import Link from "next/link";
import DataSource from "@/components/DataSource";

// The original design. Served by default; the redesign lives under /v2 and is
// picked with ?design=2 (see src/middleware.ts).

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="7" className="fill-buff-400" />
      <path d="M9 23V9h6.2c4.4 0 7.3 2.7 7.3 7s-2.9 7-7.3 7H9Z" className="fill-navy-900" />
      <circle cx="15.3" cy="16" r="2.4" className="fill-buff-400" />
    </svg>
  );
}

export default function ClassicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Mark />
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Delaware Rebid Radar</span>
              <span className="hidden text-xs text-navy-100/70 sm:block">State contract opportunities for small &amp; diverse businesses</span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm">
            <Link href="/opportunities" className="rounded-md px-3 py-2 text-navy-100 hover:bg-white/10 hover:text-white">Opportunities</Link>
            <Link href="/methodology" className="rounded-md px-3 py-2 text-navy-100 hover:bg-white/10 hover:text-white">How it works</Link>
          </nav>
        </div>
        <div className="h-1 bg-buff-400" />
      </header>
      <DataSource variant="classic" />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-500 sm:px-6 space-y-1">
          <p>
            Data: <a className="underline hover:text-navy-800" href="https://data.delaware.gov/">data.delaware.gov</a> (Current Contracts, Archived Contracts, Awarded Vendor Contact Info).
            Predicted windows are estimates, not announcements. Always confirm on{" "}
            <a className="underline hover:text-navy-800" href="https://mmp.delaware.gov/">Delaware Bids &amp; Contracts</a>.
          </p>
          <p>Prototype. Not an official State of Delaware website.</p>
        </div>
      </footer>
    </>
  );
}
