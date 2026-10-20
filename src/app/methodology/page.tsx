import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works" };

export default function Methodology() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">How the rebid predictions work</h1>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-navy-900">Where the data comes from</h2>
          <p className="mt-2">
            Everything here comes from three public datasets on data.delaware.gov, refreshed daily:{" "}
            <a className="underline" href="https://data.delaware.gov/d/xxed-9nm8">Current Contracts</a>,{" "}
            <a className="underline" href="https://data.delaware.gov/d/ey64-me86">Archived Contracts</a>, and{" "}
            <a className="underline" href="https://data.delaware.gov/d/h9bb-iyu6">Awarded Vendor Contact Info</a>.
            They cover contracts posted on Delaware Bids &amp; Contracts (MMP).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-900">The predicted window</h2>
          <p className="mt-2">
            For each current contract we take its expiration date and subtract a typical solicitation lead time for its category:
            about 9 months for complex services and IT, 4 months for construction projects, fuel and food, and 6 months for everything else.
            The window runs two months either side of that date, and never past the expiration date.
          </p>
          <p className="mt-2">
            These lead times are planning assumptions. They have not yet been measured against actual Delaware solicitation dates.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-900">Rebid likelihood</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>High:</strong> a matching earlier award exists in the archive (same contract-number suffix, or a very similar title at the same agency). The need has recurred before.</li>
            <li><strong>Medium:</strong> no earlier award found, but nothing suggests a one-time purchase.</li>
            <li><strong>Low:</strong> looks like a one-time project (even if the agency has bought similar work before) (for example a roof replacement), is a cooperative or GSA schedule contract that another government rebids, or has a term over 10 years.</li>
          </ul>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold text-amber-900">Known limits</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
            <li>The open data does not record remaining renewal options. An extension pushes the real rebid later than shown.</li>
            <li>Contract values are not included for most contracts, so we cannot rank by size.</li>
            <li>Only contracts posted on MMP are covered. Purchases below bid thresholds and many school district buys are not.</li>
            <li>Agency codes without a confident name are shown as their raw code.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
