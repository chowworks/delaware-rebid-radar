import type { Metadata } from "next";
import leadTimes from "@/data/lead-times.json";

export const metadata: Metadata = { title: "How it works" };

export default function Methodology() {
  return (
    <>
      <div className="wash border-b border-line">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-14 sm:px-6">
          <p className="eyebrow text-de-600">Methodology</p>
          <h1 className="display mt-3 text-5xl text-ink-900 sm:text-6xl">How the rebid predictions work.</h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-12 text-[16px] leading-relaxed text-ink-700 [&_a]:text-de-600 [&_a]:underline-offset-2">
          <section>
            <h2 className="display flex items-baseline gap-3 text-3xl text-ink-900"><span className="font-mono text-xs text-de-600">01</span>Where the data comes from</h2>
            <p className="mt-3">
              Contracts come from three public datasets on data.delaware.gov, refreshed daily:{" "}
              <a className="underline" href="https://data.delaware.gov/d/xxed-9nm8">Current Contracts</a>,{" "}
              <a className="underline" href="https://data.delaware.gov/d/ey64-me86">Archived Contracts</a>, and{" "}
              <a className="underline" href="https://data.delaware.gov/d/h9bb-iyu6">Awarded Vendor Contact Info</a>.
              They cover contracts posted on Delaware Bids &amp; Contracts (MMP). Lead times are measured from the{" "}
              <a className="underline" href="https://data.delaware.gov/d/2hnj-zwix">Open</a>,{" "}
              <a className="underline" href="https://data.delaware.gov/d/yhim-4378">Recently Closed</a> and{" "}
              <a className="underline" href="https://data.delaware.gov/d/bnup-azrk">Not Awarded</a> bid datasets.
            </p>
          </section>
          <section>
            <h2 className="display flex items-baseline gap-3 text-3xl text-ink-900"><span className="font-mono text-xs text-de-600">02</span>The predicted window</h2>
            <p className="mt-3">
              We matched {leadTimes.bidsMatched} past Delaware bids to the contracts they replaced (same agency, and the same
              contract-number suffix or a near-identical title) and measured how many months before the old contract expired
              each bid was posted. Across all categories the median is {Math.round(leadTimes.overall.median)} months, but half of
              rebids fall between {Math.round(leadTimes.overall.p25)} and {Math.round(leadTimes.overall.p75)} months.
            </p>
            <p className="mt-3">
              Each contract&apos;s window is that middle half for its category (or for all categories when its category had fewer
              than 8 matched bids), counted back from the expiration date. &ldquo;Most likely&rdquo; is the median. By construction
              about half of real rebids land inside the window; a quarter post earlier and a quarter later.
            </p>
          </section>
          <section>
            <h2 className="display flex items-baseline gap-3 text-3xl text-ink-900"><span className="font-mono text-xs text-de-600">03</span>Rebid likelihood</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-de-600">
              <li><strong>High:</strong> a matching earlier award exists in the archive (same contract-number suffix, or a very similar title at the same agency). The need has recurred before.</li>
              <li><strong>Medium:</strong> no earlier award found, but nothing suggests a one-time purchase.</li>
              <li><strong>Low:</strong> looks like a one-time project (even if the agency has bought similar work before) (for example a roof replacement), is a cooperative or GSA schedule contract that another government rebids, or has a term over 10 years.</li>
            </ul>
          </section>
          <section className="rounded-2xl border border-buff-300 bg-buff-50 p-6">
            <h2 className="eyebrow text-buff-500">Known limits</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-800 marker:text-buff-500">
              <li>The open data does not record remaining renewal options. An extension pushes the real rebid later than shown.</li>
              <li>Contract values are not included for most contracts, so we cannot rank by size.</li>
              <li>Only contracts posted on MMP are covered. Purchases below bid thresholds and many school district buys are not.</li>
              <li>Agency codes without a confident name are shown as their raw code.</li>
              <li>
                Lead times come from only {leadTimes.bidsMatched} matched bids, mostly ones that were not awarded (awarded bids are not
                published as a dataset). Several categories have fewer than 20 matches, and the bid-to-contract matching is by title, so
                some matches are wrong.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
