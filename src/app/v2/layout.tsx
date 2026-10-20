import { IBM_Plex_Mono, Instrument_Serif, Public_Sans } from "next/font/google";
import Link from "next/link";
import DataSource from "@/components/DataSource";

const sans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

// Design option 2, inspired by samsearch.co: editorial serif headlines, white
// frosted header, hairline cards, mono data labels. Reached with ?design=2.

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-de-600" />
      <path d="M8 24a16 16 0 0 1 16-16" className="stroke-white/40" strokeWidth="2" fill="none" />
      <path d="M8 24a10 10 0 0 1 10-10" className="stroke-white/70" strokeWidth="2" fill="none" />
      <circle cx="8.5" cy="23.5" r="2.5" className="fill-buff-300" />
      <circle cx="21" cy="12" r="1.8" className="fill-white" />
    </svg>
  );
}

export default function V2Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`v2 flex flex-1 flex-col ${sans.variable} ${serif.variable} ${mono.variable}`}>
      <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Mark />
            <span className="whitespace-nowrap leading-none">
              <span className="block text-[15px] font-semibold tracking-tight text-ink-900">Rebid Radar</span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">State of Delaware</span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm">
            <Link href="/opportunities" className="hidden rounded-md px-3 py-2 text-ink-700 hover:text-ink-900 sm:block">Opportunities</Link>
            <Link href="/methodology" className="rounded-md px-3 py-2 text-ink-700 hover:text-ink-900">How it works</Link>
            <Link href="/opportunities" className="ml-1 rounded-lg bg-de-600 px-3.5 py-2 font-medium text-white shadow-sm hover:bg-de-700">
              <span className="sm:hidden">Search</span>
              <span className="hidden sm:inline">Search contracts</span>
            </Link>
          </nav>
        </div>
      </header>
      <DataSource variant="v2" />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="display text-2xl text-ink-900">Delaware Rebid Radar</p>
            <p className="mt-1 text-ink-500">For small and diverse businesses bidding on state work.</p>
          </div>
          <div className="space-y-2 text-xs leading-relaxed text-ink-500">
            <p>
              Data: <a className="underline hover:text-de-700" href="https://data.delaware.gov/">data.delaware.gov</a> (Current Contracts, Archived Contracts, Awarded Vendor Contact Info).
              Predicted windows are estimates, not announcements. Always confirm on{" "}
              <a className="underline hover:text-de-700" href="https://mmp.delaware.gov/">Delaware Bids &amp; Contracts</a>.
            </p>
            <p className="font-mono uppercase tracking-[0.12em]">
              Prototype · Not an official State of Delaware website ·{" "}
              <a className="underline hover:text-de-700" href="?design=1">Original design</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
