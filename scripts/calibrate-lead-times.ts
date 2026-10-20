// Measures how far ahead of expiration Delaware actually posts rebids, and
// writes the result to src/data/lead-times.json for the predictor to use.
//   npm run calibrate
//
// The bid datasets on data.delaware.gov (open, recently closed, not awarded)
// carry real solicitation open dates. Each bid is matched to the contract it
// most likely replaces: same agency, a predecessor already in force when the
// bid opened, and the same contract-number suffix or a very similar title.
// Lead time = predecessor expiration minus bid open date.
import { writeFileSync } from "node:fs";
import { daysBetween, isoDate, jaccard, numberSuffix, tokens } from "../src/lib/predict";
import type { RawContract } from "../src/lib/types";

const BASE = "https://data.delaware.gov/resource";
const BID_DATASETS = { open: "2hnj-zwix", closed: "yhim-4378", notAwarded: "bnup-azrk" };
const MIN_SAMPLE = 8; // segments with fewer matches fall back to the overall figures
const MONTH = 30.44;

interface RawBid {
  contractnumber?: string;
  contracttitle?: string;
  opendate?: string;
  agencycode?: string;
  unspsc?: string;
}

async function soda<T>(id: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${id}.json?$limit=50000`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  return res.json();
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function stats(leads: number[]) {
  const s = [...leads].sort((a, b) => a - b);
  const r = (n: number) => Math.round(n * 10) / 10;
  return { n: s.length, p25: r(quantile(s, 0.25)), median: r(quantile(s, 0.5)), p75: r(quantile(s, 0.75)) };
}

async function main() {
  const [current, archived, ...bidLists] = await Promise.all([
    soda<RawContract>("xxed-9nm8"),
    soda<RawContract>("ey64-me86"),
    ...Object.values(BID_DATASETS).map((id) => soda<RawBid>(id)),
  ]);
  const bids = bidLists.flat();

  const byAgency = new Map<string, { number: string; tokens: Set<string>; suffix: string | null; effective: string; expiration: string }[]>();
  for (const c of [...current, ...archived]) {
    const effective = isoDate(c.effectivedate);
    const expiration = isoDate(c.expirationdate);
    if (!effective || !expiration) continue;
    const list = byAgency.get(c.agency ?? "") ?? [];
    list.push({
      number: (c.contractnumber ?? "").toUpperCase(),
      tokens: tokens(c.contracttitle ?? ""),
      suffix: numberSuffix(c.contractnumber ?? ""),
      effective,
      expiration,
    });
    byAgency.set(c.agency ?? "", list);
  }

  const matches: { segment: string; months: number }[] = [];
  for (const b of bids) {
    const open = isoDate(b.opendate);
    const title = b.contracttitle ?? "";
    // Supplemental bids add vendors to a live contract; they are not rebids.
    if (!open || /supplement/i.test(title)) continue;
    const own = tokens(title);
    const suffix = numberSuffix(b.contractnumber ?? "");
    let best: { score: number; lead: number } | null = null;
    for (const c of byAgency.get(b.agencycode ?? "") ?? []) {
      if (c.number === (b.contractnumber ?? "").toUpperCase() || c.effective >= open) continue;
      const lead = daysBetween(open, c.expiration);
      if (lead < -90 || lead > 3 * 365) continue;
      const sim = jaccard(own, c.tokens);
      const score = suffix && suffix === c.suffix && sim >= 0.4 ? sim + 0.5 : sim;
      if (score < 0.6) continue;
      if (!best || score > best.score || (score === best.score && Math.abs(lead) < Math.abs(best.lead))) {
        best = { score, lead };
      }
    }
    if (best) {
      const segment = (b.unspsc ?? "").split(";").map((s) => s.trim().slice(0, 2)).find(Boolean) ?? "";
      matches.push({ segment, months: best.lead / MONTH });
    }
  }

  const bySegment = new Map<string, number[]>();
  for (const m of matches) bySegment.set(m.segment, [...(bySegment.get(m.segment) ?? []), m.months]);
  const segments = Object.fromEntries(
    [...bySegment.entries()]
      .filter(([seg, leads]) => seg && leads.length >= MIN_SAMPLE)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([seg, leads]) => [seg, stats(leads)]),
  );

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    bidsScanned: bids.length,
    bidsMatched: matches.length,
    overall: stats(matches.map((m) => m.months)),
    segments,
  };
  writeFileSync("src/data/lead-times.json", JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
