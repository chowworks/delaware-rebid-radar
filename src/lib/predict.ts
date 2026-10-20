import { agencyName, categoryFor, leadMonthsFor } from "./reference";
import type {
  Contract,
  Likelihood,
  RawContract,
  RawVendor,
  Vendor,
  WindowStatus,
} from "./types";

const STOPWORDS = new Set([
  "and", "the", "of", "for", "to", "in", "at", "on", "a", "an", "with", "by",
  "state", "delaware", "de", "contract", "statewide", "services", "service",
]);

const ONE_OFF = [
  /\breplace(ment)?\b/, /\brenovat/, /\brehab/, /\broof/, /\bconstruction of\b/,
  /\bdemoli/, /\binstallation\b/, /\bupgrade/, /\bphase\b/, /^br \d/, /\bbridge\b.*\bover\b/,
  /\bexpansion\b/, /\baddition\b/, /\bnew\b.*\bbuilding\b/,
];

const RECURRING = [
  /\bservices?\b/, /\bsuppl(y|ies)\b/, /\bmaintenance\b/, /\bstatewide\b/, /\bon[- ]call\b/,
  /\bopen end\b/, /\bas needed\b/, /\bfuel\b/, /\boil\b/, /\bdiesel\b/, /\bprogram\b/,
  /\bmanagement\b/, /\brental\b/, /\blease\b/, /\binspection\b/, /\baudit/,
];

const DAY = 86_400_000;

function isoDate(s?: string): string | null {
  if (!s) return null;
  const d = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

export function mmpId(url?: string): string | null {
  const m = url?.match(/Details\/(\d+)/i);
  return m ? m[1] : null;
}

function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^(fy)?\d+$/.test(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Delaware contract numbers often look like GSS21780-ULSHEATOIL: the suffix
// after the hyphen tends to survive from one award cycle to the next.
function numberSuffix(num: string): string | null {
  const parts = num.toUpperCase().split("-");
  if (parts.length < 2) return null;
  const suffix = parts.slice(1).join("-");
  return /[A-Z]{3,}/.test(suffix) && !/^MC\d/.test(suffix) ? suffix : null;
}

interface ArchiveIndex {
  byAgency: Map<string, { number: string; tokens: Set<string> }[]>;
  bySuffix: Map<string, number>;
}

export function buildArchiveIndex(archived: RawContract[]): ArchiveIndex {
  const byAgency: ArchiveIndex["byAgency"] = new Map();
  const bySuffix = new Map<string, number>();
  for (const r of archived) {
    const agency = r.agency ?? "";
    const number = r.contractnumber ?? "";
    const list = byAgency.get(agency) ?? [];
    list.push({ number, tokens: tokens(r.contracttitle ?? "") });
    byAgency.set(agency, list);
    const suffix = numberSuffix(number);
    if (suffix) bySuffix.set(suffix, (bySuffix.get(suffix) ?? 0) + 1);
  }
  return { byAgency, bySuffix };
}

function priorAwardsFor(r: RawContract, index: ArchiveIndex): number {
  const number = r.contractnumber ?? "";
  const suffix = numberSuffix(number);
  if (suffix && index.bySuffix.get(suffix)) return index.bySuffix.get(suffix)!;
  const own = tokens(r.contracttitle ?? "");
  if (own.size < 2) return 0;
  let count = 0;
  for (const a of index.byAgency.get(r.agency ?? "") ?? []) {
    if (a.number !== number && jaccard(own, a.tokens) >= 0.6) count++;
  }
  return count;
}

function statusFor(today: string, start: string, end: string): WindowStatus {
  if (today >= start && today <= end) return "open";
  if (today < start) return daysBetween(today, start) <= 90 ? "upcoming" : "later";
  // Past the window (or past expiration but still listed): the replacement is
  // most likely already in procurement.
  return "closing";
}

export function buildContracts(
  current: RawContract[],
  archived: RawContract[],
  vendors: RawVendor[],
  today = new Date().toISOString().slice(0, 10),
): Contract[] {
  const index = buildArchiveIndex(archived);

  const vendorsById = new Map<string, Vendor[]>();
  for (const v of vendors) {
    const id = mmpId(v.contracturl?.url);
    if (!id || !v.companyname) continue;
    const list = vendorsById.get(id) ?? [];
    if (!list.some((x) => x.name === v.companyname)) {
      list.push({
        name: v.companyname,
        mwbe: v.mwbecertified === "Y",
        veteran: v.vetservdisabled === "Y",
        delaware: v.delawarevendor === "Y",
      });
    }
    vendorsById.set(id, list);
  }

  const out: Contract[] = [];
  const seen = new Set<string>();
  for (const r of current) {
    const expiration = isoDate(r.expirationdate);
    if (!expiration || !r.contracttitle) continue;
    const effective = isoDate(r.effectivedate);
    const unspsc = (r.unspsc ?? "").split(";").map((s) => s.trim()).filter(Boolean);
    const id = mmpId(r.contracturl?.url) ?? r.contractnumber ?? r.contracttitle;
    if (seen.has(id)) continue;
    seen.add(id);

    const termMonths = effective
      ? Math.round(daysBetween(effective, expiration) / 30.44)
      : null;
    const leadMonths = leadMonthsFor(unspsc);
    const predicted = addMonths(expiration, -leadMonths);
    const windowStart = addMonths(predicted, -2);
    const windowEnd = [addMonths(predicted, 2), expiration].sort()[0];
    const priorAwards = priorAwardsFor(r, index);

    const title = r.contracttitle.toLowerCase();
    const constructionOnly =
      unspsc.length > 0 && unspsc.every((c) => c.startsWith("72") || c.startsWith("95"));
    const oneOff = ONE_OFF.some((re) => re.test(title)) ||
      (constructionOnly && termMonths !== null && termMonths <= 24);
    const recurring = RECURRING.some((re) => re.test(title));

    const features = (r.multifeatures ?? "").split(";").map((s) => s.trim());
    const cooperative = features.includes("Cooperative Contract") ||
      features.includes("General Services Admin");

    const reasons: string[] = [];
    let likelihood: Likelihood;
    if (cooperative) {
      likelihood = "Low";
      reasons.push("Cooperative or GSA schedule contract: the rebid is run by another government body, not Delaware.");
    } else if ((termMonths !== null && termMonths > 240) || daysBetween(today, expiration) > 3650) {
      likelihood = "Low";
      reasons.push("Very long or open-ended term (an umbrella agreement, lease or public-private deal); the expiration date likely does not reflect real rebid timing.");
    } else if (oneOff && !recurring) {
      likelihood = "Low";
      reasons.push(
        priorAwards > 0
          ? `Looks like a one-time project, so this contract itself will not be rebid. The agency has bought similar work before (${priorAwards} match${priorAwards > 1 ? "es" : ""} in the archive), so watch for new projects like it.`
          : "Looks like a one-time project, which usually is not rebid.",
      );
    } else if (priorAwards > 0) {
      likelihood = "High";
      reasons.push(`Matches ${priorAwards} earlier award${priorAwards > 1 ? "s" : ""} in the archive, so this looks like a recurring need.`);
    } else if (recurring) {
      likelihood = "Medium";
      reasons.push("Title suggests an ongoing need, but no earlier award was found in the archive.");
    } else {
      likelihood = "Medium";
      reasons.push("No earlier award found in the archive; recurrence is uncertain.");
    }
    reasons.push(
      `Solicitation assumed about ${leadMonths} months before expiration for this category.`,
    );

    out.push({
      id,
      number: r.contractnumber ?? "",
      title: r.contracttitle.replace(/\?s\b/g, "'s"),
      agency: r.agency ?? "",
      agencyName: agencyName(r.agency ?? ""),
      unspsc,
      category: categoryFor(unspsc),
      effective,
      expiration,
      termMonths,
      deVendor: features.includes("DE Vendor"),
      mbeWbe: features.includes("MBE/WBE"),
      setAside: features.includes("Set Aside"),
      cooperative,
      url: r.contracturl?.url ?? null,
      vendors: vendorsById.get(id) ?? [],
      leadMonths,
      windowStart,
      windowEnd,
      status: statusFor(today, windowStart, windowEnd),
      daysToWindow: daysBetween(today, windowStart),
      likelihood,
      reasons,
      priorAwards,
    });
  }

  return out.sort((a, b) => a.windowStart.localeCompare(b.windowStart));
}
