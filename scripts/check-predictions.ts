// Prints a summary of prediction output so the heuristics can be eyeballed.
//   npx tsx scripts/check-predictions.ts          # built-in sample
//   LIVE=1 npx tsx scripts/check-predictions.ts   # live data.delaware.gov
import { buildContracts } from "../src/lib/predict";
import type { RawContract, RawVendor } from "../src/lib/types";
import sampleCurrent from "../src/data/current.json";
import sampleArchived from "../src/data/archived.json";
import sampleVendors from "../src/data/vendors.json";

const BASE = "https://data.delaware.gov/resource";

async function soda<T>(id: string, select: string): Promise<T[]> {
  const params = new URLSearchParams({ $select: select, $limit: "50000" });
  const res = await fetch(`${BASE}/${id}.json?${params}`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  let current: RawContract[] = sampleCurrent;
  let archived: RawContract[] = sampleArchived;
  let vendors: RawVendor[] = sampleVendors;
  if (process.env.LIVE === "1") {
    [current, archived, vendors] = await Promise.all([
      soda<RawContract>("xxed-9nm8", "contractnumber,contracttitle,agency,unspsc,effectivedate,expirationdate,multifeatures,contracturl"),
      soda<RawContract>("ey64-me86", "contractnumber,contracttitle,agency"),
      soda<RawVendor>("h9bb-iyu6", "companyname,contracturl,mwbecertified,vetservdisabled,delawarevendor"),
    ]);
  }
  const rows = buildContracts(current, archived, vendors);
  console.log(`current=${current.length} archived=${archived.length} vendors=${vendors.length} built=${rows.length}`);

  const tally = new Map<string, number>();
  for (const c of rows) tally.set(`${c.status}/${c.likelihood}`, (tally.get(`${c.status}/${c.likelihood}`) ?? 0) + 1);
  console.table(Object.fromEntries([...tally.entries()].sort()));
  console.log(`with incumbent vendor: ${rows.filter((c) => c.vendors.length).length}`);
  console.log(`with prior award match: ${rows.filter((c) => c.priorAwards > 0).length}`);
  console.log(`unnamed agency codes: ${[...new Set(rows.filter((c) => c.agencyName === c.agency).map((c) => c.agency))].join(", ")}`);

  for (const c of rows.filter((c) => c.status === "open" || c.status === "upcoming").slice(0, 25)) {
    console.log([c.status.padEnd(8), c.likelihood.padEnd(6), c.windowStart, c.expiration, c.title.slice(0, 70)].join(" | "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
