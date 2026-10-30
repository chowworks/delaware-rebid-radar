// Looks up each Checkbook vendor in USAspending.gov's recipient records and
// writes src/data/vendor-sizes.json for the spending pages.
//   npm run build:vendor-sizes   (after npm run build:spending)
//
// Delaware's data says nothing about company size. Federal records do: firms
// registered in SAM.gov and paid on federal awards are flagged "small
// business" or "other than small business" against the SBA size standard, and
// USAspending lists those flags per recipient. A "small" flag counts only when
// the firm has actually been paid on a federal award (a registration alone is
// self-reported; Gainwell Technologies, for one, is registered as small). A
// vendor with no federal record stays "unknown".
//
// Results are cached by vendor name in the output file, so a re-run only looks
// up new vendors. Pass FRESH=1 to start over.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { normalizeVendor } from "../src/lib/spending-rules";

const API = "https://api.usaspending.gov/api/v2";
const OUT = "src/data/vendor-sizes.json";
const MIN_TOTAL = 5_000; // vendors paid less than this in all years aren't looked up

export type Size = "large" | "small" | "nonprofit" | "government" | "unknown";
export interface SizeRecord {
  size: Size;
  match?: string; // the federal recipient's name, when one matched
  uei?: string;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 404) return null as T;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      console.error(`retry ${attempt} ${path}: ${err}`);
      if (attempt >= 4) throw new Error(`${path}: ${err}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

interface Recipient {
  id: string;
  name: string;
  uei: string | null;
  recipient_level: "P" | "C" | "R";
}

// Federal flags to one size. A firm flagged small on some awards and other
// than small on others has outgrown the standard, so it counts as large.
export function classify(types: string[], federalDollars: number): Size {
  if (types.some((t) => /government|tribal/.test(t))) return "government";
  if (types.includes("nonprofit")) return "nonprofit";
  if (types.includes("other_than_small_business")) return "large";
  if (types.includes("small_business") && federalDollars > 0) return "small";
  return "unknown";
}

async function lookup(vendor: string): Promise<SizeRecord> {
  const key = normalizeVendor(vendor);
  if (key.length < 3) return { size: "unknown" };
  // The Checkbook cuts some names at 30 characters and others at 40, and the
  // search matches whole words, so a possibly cut last word is dropped.
  const cut = vendor.length >= 29;
  const words = key.split(" ");
  const keyword = (cut && words.length > 1 ? words.slice(0, -1) : words).slice(0, 5).join(" ");
  const found = await api<{ results: Recipient[] }>("/recipient/", { keyword, limit: 50 });
  const candidates = (found?.results ?? []).filter((r) => {
    if (!r.uei) return false;
    const k = normalizeVendor(r.name);
    const stem = words.slice(0, -1).join(" ");
    if (k === key) return true;
    if (!cut || stem.length < 8 || !k.startsWith(stem)) return false;
    // The word after the stem must agree with the possibly cut last word.
    const last = words[words.length - 1];
    const next = k.split(" ")[words.length - 1];
    return next === undefined || next.startsWith(last) || last.startsWith(next);
  });
  // Prefer the parent record: it carries flags from all of a firm's awards.
  candidates.sort((a, b) => "PCR".indexOf(a.recipient_level) - "PCR".indexOf(b.recipient_level));
  for (const c of candidates) {
    const detail = await api<{ business_types?: string[]; total_transaction_amount?: number } | null>(`/recipient/${c.id}/`);
    const size = classify(detail?.business_types ?? [], detail?.total_transaction_amount ?? 0);
    if (size !== "unknown") return { size, match: c.name, uei: c.uei! };
  }
  return { size: "unknown" };
}

async function main() {
  const spending = JSON.parse(readFileSync("src/data/spending.json", "utf8")) as {
    vendors: [string, 0 | 1, number[]][];
    rows: [number, number, number, number, number, number][];
  };
  const totals = new Map<number, number>();
  for (const r of spending.rows) totals.set(r[1], (totals.get(r[1]) ?? 0) + r[4]);
  const names = spending.vendors
    .map(([name], i) => ({ name, total: totals.get(i) ?? 0 }))
    .filter((v) => v.total >= MIN_TOTAL && !v.name.startsWith("Individual payees"))
    .sort((a, b) => b.total - a.total)
    .map((v) => v.name);

  const cache: Record<string, SizeRecord> =
    !process.env.FRESH && existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).vendors : {};
  const todo = names.filter((n) => !cache[n]);
  console.log(`${names.length} vendors, ${todo.length} to look up`);

  let next = 0;
  let done = 0;
  const save = () =>
    writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), source: "api.usaspending.gov", vendors: cache }));
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (next < todo.length) {
        const name = todo[next++];
        try {
          cache[name] = await lookup(name);
        } catch (err) {
          console.error(name, String(err));
        }
        if (++done % 100 === 0) {
          save();
          console.log(`${done}/${todo.length}`);
        }
      }
    }),
  );
  save();
  const counts: Record<string, number> = {};
  for (const n of names) counts[cache[n]?.size ?? "missing"] = (counts[cache[n]?.size ?? "missing"] ?? 0) + 1;
  console.log(counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
