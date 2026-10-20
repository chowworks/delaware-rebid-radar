import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import DataSource from "@/components/DataSource";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

// Design option 2, modeled on samsearch.co: white header with inline nav,
// dark hero, Instrument Serif headlines, bordered cards, mono labels, one blue
// accent. Reached with ?design=2.

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
      <path d="M3 21a18 18 0 0 1 18-18v4A14 14 0 0 0 7 21Z" className="fill-de-600" />
      <path d="M9.5 21A11.5 11.5 0 0 1 21 9.5v4A7.5 7.5 0 0 0 13.5 21Z" className="fill-de-600/70" />
      <circle cx="19" cy="19" r="2.5" className="fill-buff-500" />
    </svg>
  );
}

const FOOTER = [
  { head: "Platform", links: [["Opportunities", "/opportunities"], ["How it works", "/methodology"]] },
  {
    head: "Get ready",
    links: [["OSD certification", "https://osd.delaware.gov/"], ["Delaware Bids & Contracts", "https://mmp.delaware.gov/"]],
  },
  {
    head: "Data",
    links: [
      ["Current Contracts", "https://data.delaware.gov/d/xxed-9nm8"],
      ["Archived Contracts", "https://data.delaware.gov/d/ey64-me86"],
      ["Awarded Vendors", "https://data.delaware.gov/d/h9bb-iyu6"],
    ],
  },
];

export default function V2Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`v2 flex flex-1 flex-col ${sans.variable} ${serif.variable} ${mono.variable}`}>
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="flex items-center gap-1.5 whitespace-nowrap">
              <Mark />
              <span className="text-[17px] font-semibold tracking-tight text-ink-900">rebidradar</span>
              <span className="ml-1 hidden rounded bg-de-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-de-700 sm:inline">Delaware</span>
            </Link>
            <nav className="hidden items-center gap-6 text-[14px] text-ink-800 md:flex">
              <Link href="/opportunities" className="hover:text-de-600">Opportunities</Link>
              <Link href="/methodology" className="hover:text-de-600">How it works</Link>
              <a href="https://osd.delaware.gov/" className="hover:text-de-600">Get certified</a>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-[14px]">
            <Link href="/methodology" className="text-ink-800 hover:text-de-600 md:hidden">How it works</Link>
            <Link href="/opportunities" className="rounded-md bg-de-600 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-de-700">
              Search contracts
            </Link>
          </div>
        </div>
      </header>
      <DataSource variant="v2" />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-10">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="flex items-center gap-1.5">
                <Mark />
                <span className="text-[17px] font-semibold tracking-tight text-ink-900">rebidradar</span>
              </Link>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink-500">
                See which Delaware state contracts are coming up for rebid, before the bid posts.
              </p>
            </div>
            {FOOTER.map((col) => (
              <div key={col.head}>
                <p className="eyebrow text-ink-500">{col.head}</p>
                <ul className="mt-4 space-y-2.5 text-[14px] text-ink-800">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="hover:text-de-600">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-line py-6 text-[13px] text-ink-500 sm:flex-row sm:justify-between">
            <p>Prototype. Not an official State of Delaware website. Rebid dates are estimates, not announcements.</p>
            <a className="hover:text-de-600" href="?design=1">Original design</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
