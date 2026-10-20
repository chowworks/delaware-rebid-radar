import { agencyName, categoryFor, leadTimeFor } from "./reference";
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
  /\bservices?\b/, /\bsuppl(y|ies)\b/, /\bmaintenance\b(?! facility)/, /\bstatewide\b/, /\bon[- ]call\b/,
  /\bopen end\b/, /\bas needed\b/, /\bprogram\b/, /\bmanagement\b/, /\brental\b/, /\blease\b/,
  /\binspection\b/, /\baudit(s|ing)?\b/,
];

// Commodities bought over and over, but naming one in a project title
// ("Diesel Generator Replacement") does not make the project recur.
const COMMODITY = [/\bfuel\b/, /\boil\b/, /\bdiesel\b/];

const DAY = 86_400_000;

export function isoDate(s?: string): string | null {
  if (!s) return null;
  const d = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function monthsBefore(iso: string, months: number): string {
  return new Date(Date.parse(iso) - Math.round(months * 30.44) * DAY).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

export function mmpId(url?: string): string | null {
  const m = url?.match(/Details\/(\d+)/i);
  return m ? m[1] : null;
}

export function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^(fy)?\d+$/.test(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Delaware contract numbers often look like GSS21780-ULSHEATOIL: the suffix
// after the hyphen tends to survive from one award cycle to the next.
export function numberSuffix(num: string): string | null {
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

// Status keys off the most likely posting date, not the window edges: measured
// windows span many months, so "inside the window" would flag contracts whose
// rebid most likely posted long ago.
export const DUE_NOW_PAST_DAYS = 60; // predicted date up to 2 months ago
export const DUE_NOW_AHEAD_DAYS = 30; // or within the next month
export const UPCOMING_DAYS = 90;

export function statusFor(today: string, predicted: string): WindowStatus {
  const d = daysBetween(today, predicted);
  if (d < -DUE_NOW_PAST_DAYS) return "closing"; // most likely already posted
  if (d <= DUE_NOW_AHEAD_DAYS) return "open";
  if (d <= UPCOMING_DAYS) return "upcoming";
  return "later";
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
    const lead = leadTimeFor(unspsc);
    const leadMonths = Math.round(lead.median);
    // The window spans the middle half of measured lead times for the category.
    const windowStart = monthsBefore(expiration, lead.p75);
    const windowEnd = monthsBefore(expiration, lead.p25);
    const predicted = monthsBefore(expiration, lead.median);
    const priorAwards = priorAwardsFor(r, index);

    const title = r.contracttitle.toLowerCase();
    const constructionOnly =
      unspsc.length > 0 && unspsc.every((c) => c.startsWith("72") || c.startsWith("95"));
    const oneOff = ONE_OFF.some((re) => re.test(title)) ||
      (constructionOnly && termMonths !== null && termMonths <= 24);
    const recurring = RECURRING.some((re) => re.test(title));
    const commodity = COMMODITY.some((re) => re.test(title));

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
    } else if (recurring || commodity) {
      likelihood = "Medium";
      reasons.push("Title suggests an ongoing need, but no earlier award was found in the archive.");
    } else {
      likelihood = "Medium";
      reasons.push("No earlier award found in the archive; recurrence is uncertain.");
    }
    reasons.push(
      `Past Delaware rebids in ${lead.basis} were typically posted ${Math.round(lead.p25)} to ${Math.round(lead.p75)} months before the old contract expired (median ${Math.round(lead.median)}, from ${lead.n} matched bids).`,
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
      predicted,
      windowStart,
      windowEnd,
      status: statusFor(today, predicted),
      daysToPredicted: daysBetween(today, predicted),
      likelihood,
      reasons,
      priorAwards,
    });
  }

  return out.sort((a, b) => a.predicted.localeCompare(b.predicted));
}
