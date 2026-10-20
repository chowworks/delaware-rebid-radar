import "server-only";
import { cache } from "react";
import { buildContracts } from "./predict";
import type { Dataset, RawContract, RawVendor } from "./types";
import sampleCurrent from "@/data/current.json";
import sampleArchived from "@/data/archived.json";
import sampleVendors from "@/data/vendors.json";

const BASE = process.env.SOCRATA_BASE_URL ?? "https://data.delaware.gov/resource";

export const DATASETS = {
  current: "xxed-9nm8",
  archived: "ey64-me86",
  vendors: "h9bb-iyu6",
} as const;

// Data refreshes weekly upstream; re-pulling daily is plenty.
const REVALIDATE_SECONDS = 60 * 60 * 24;

async function soda<T>(id: string, select: string): Promise<T[]> {
  const params = new URLSearchParams({ $select: select, $limit: "50000" });
  const headers: HeadersInit = {};
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  const res = await fetch(`${BASE}/${id}.json?${params}`, {
    headers,
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  return res.json();
}

const CONTRACT_FIELDS =
  "contractnumber,contracttitle,agency,unspsc,effectivedate,expirationdate,multifeatures,contracturl";

export const getDataset = cache(async (): Promise<Dataset> => {
  if (process.env.USE_SAMPLE_DATA !== "1") {
    try {
      const [current, archived, vendors] = await Promise.all([
        soda<RawContract>(DATASETS.current, CONTRACT_FIELDS),
        soda<RawContract>(DATASETS.archived, "contractnumber,contracttitle,agency"),
        soda<RawVendor>(
          DATASETS.vendors,
          "companyname,contracturl,mwbecertified,vetservdisabled,delawarevendor",
        ),
      ]);
      return {
        contracts: buildContracts(current, archived, vendors),
        source: "live",
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Falling back to sample data:", err);
    }
  }
  return {
    contracts: buildContracts(
      sampleCurrent as RawContract[],
      sampleArchived as RawContract[],
      sampleVendors as RawVendor[],
    ),
    source: "sample",
    fetchedAt: new Date().toISOString(),
  };
});
