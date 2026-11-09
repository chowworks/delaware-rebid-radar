// Socrata helpers shared by the spending snapshot scripts (build-spending.ts
// and build-pcard.ts).
import { normalizeVendor } from "../src/lib/spending-rules";

export const BASE = "https://data.delaware.gov/resource";

export async function soda<T>(id: string, params: Record<string, string>): Promise<T[]> {
  const url = `${BASE}/${id}.json?${new URLSearchParams(params)}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 5) throw new Error(`${id}: ${err}`);
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
}

export async function pages<T>(id: string, params: Record<string, string>, size = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += size) {
    const rows = await soda<T>(id, { ...params, $limit: String(size), $offset: String(offset) });
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

// Flags vendors by normalized name from two more datasets:
//   h9bb-iyu6 Awarded Vendor Contact Info -> on a current state contract
//   8dxf-6ahp OSD certified firms          -> certified small/diverse business
export interface VendorFlags {
  osd(name: string): boolean;
  contracts(name: string): { title: string; url: string }[] | undefined;
}

export async function loadVendorFlags(): Promise<VendorFlags> {
  const [contractVendors, osdFirms] = await Promise.all([
    soda<{ companyname?: string; contracttitle?: string; contracturl?: { url?: string } }>("h9bb-iyu6", {
      $select: "companyname, contracttitle, contracturl",
      $limit: "50000",
    }),
    soda<{ name?: string; certificatenumber?: string }>("8dxf-6ahp", { $select: "name, certificatenumber", $limit: "50000" }),
  ]);

  const contractsByName = new Map<string, { title: string; url: string }[]>();
  for (const v of contractVendors) {
    if (!v.companyname) continue;
    const key = normalizeVendor(v.companyname);
    const list = contractsByName.get(key) ?? [];
    const url = (v.contracturl?.url ?? "").replace(/^http:/, "https:");
    if (!list.some((c) => c.url === url)) list.push({ title: v.contracttitle ?? "State contract", url });
    contractsByName.set(key, list);
  }
  const osdNames = new Set(osdFirms.filter((f) => f.name).map((f) => normalizeVendor(f.name!)));
  const contractKeys = [...contractsByName.keys()];

  // The Checkbook cuts names at 40 characters; for those, accept a list name
  // that starts with the cut name minus its last (possibly partial) word.
  function lookup<V>(raw: string, exact: (k: string) => V | undefined, keys: Iterable<string>): V | undefined {
    const key = normalizeVendor(raw);
    const hit = exact(key);
    if (hit !== undefined || raw.length < 38) return hit;
    const stem = key.split(" ").slice(0, -1).join(" ");
    if (stem.length < 12) return undefined;
    for (const k of keys) if (k.startsWith(stem)) return exact(k);
    return undefined;
  }

  return {
    osd: (name) => !!lookup(name, (k) => (osdNames.has(k) ? true : undefined), osdNames),
    contracts: (name) => lookup(name, (k) => contractsByName.get(k), contractKeys),
  };
}
