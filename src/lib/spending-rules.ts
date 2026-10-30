// Rules for the "Where are you spending?" pages, shared by the build script
// (scripts/build-spending.ts) and the pages that explain them.

// Delaware's open-market limits: below these an agency can buy without a
// formal bid or RFP. Source: Division of Accounting / GSS, "Small Purchases
// and Procurement" (mymarketplace.delaware.gov/agencies/spp.shtml).
export type Tier = "goods" | "prof" | "works";

export const THRESHOLDS: Record<
  Tier,
  { label: string; openMarket: number; steps: [string, string][]; basis: string }
> = {
  goods: {
    label: "Goods & non-professional services",
    openMarket: 50_000,
    steps: [
      ["Under $50,000", "Open market purchase"],
      ["$50,000 – $99,999", "3 written quotes"],
      ["$100,000 and over", "Formal bid"],
    ],
    basis: "Yearly cumulative limit per agency",
  },
  prof: {
    label: "Professional services",
    openMarket: 100_000,
    steps: [
      ["Under $100,000", "Open market"],
      ["$100,000 – $149,999", "3 letter bids"],
      ["$150,000 and over", "Formal RFP"],
    ],
    basis: "Per contract; contracts may not be split to stay under",
  },
  works: {
    label: "Public works",
    openMarket: 150_000,
    steps: [
      ["Under $150,000", "Open market purchase"],
      ["$150,000 – $249,999", "3 letter bids"],
      ["$250,000 and over", "Formal bid"],
    ],
    basis: "Per contract; contracts may not be split to stay under",
  },
};

export const THRESHOLD_SOURCE = "https://mymarketplace.delaware.gov/agencies/spp.shtml";

// Checkbook accounts that pay for goods and services bought from outside
// vendors, with the procurement tier each falls under. Everything else in the
// Checkbook (salaries, benefits, grants, subsidies, Medicaid, loans,
// transfers, tuition, utilities, rent, client benefits) is left out: those
// payments are not purchases an agency bids.
export const ACCOUNTS: Record<string, { label: string; tier: Tier }> = {
  // Professional services
  "55000": { label: "Other professional services", tier: "prof" },
  "55051": { label: "Consultants", tier: "prof" },
  "55052": { label: "IT professional services", tier: "prof" },
  "55073": { label: "Computer services", tier: "prof" },
  "55522": { label: "IT security services", tier: "prof" },
  "55020": { label: "Legal services", tier: "prof" },
  "55061": { label: "Temporary employment services", tier: "prof" },
  "55010": { label: "Medical services", tier: "prof" },
  "55324": { label: "Health care services", tier: "prof" },
  "55004": { label: "Laboratory services", tier: "prof" },
  "55074": { label: "Environmental services", tier: "prof" },
  "55019": { label: "Veterinarian services", tier: "prof" },
  "55315": { label: "Counseling", tier: "prof" },
  "55317": { label: "Casework services", tier: "prof" },
  "55667": { label: "Training", tier: "prof" },
  "55668": { label: "Other training services", tier: "prof" },
  // Public works
  "55007": { label: "Construction & building services", tier: "works" },
  "55500": { label: "Building & grounds repair", tier: "works" },
  "55503": { label: "Highway & bridge maintenance", tier: "works" },
  "58200": { label: "Buildings (capital)", tier: "works" },
  "58300": { label: "Building improvements (capital)", tier: "works" },
  "58400": { label: "Highway & bridge construction", tier: "works" },
  "58501": { label: "Highway & bridge reconstruction", tier: "works" },
  // Non-professional services
  "55036": { label: "Transportation services", tier: "goods" },
  "55641": { label: "Food service", tier: "goods" },
  "55037": { label: "Food service operations", tier: "goods" },
  "55513": { label: "Software maintenance", tier: "goods" },
  "55520": { label: "Cloud services", tier: "goods" },
  "55521": { label: "Data storage", tier: "goods" },
  "55512": { label: "IT hardware maintenance", tier: "goods" },
  "55125": { label: "Telecommunications", tier: "goods" },
  "55120": { label: "Communications devices & systems", tier: "goods" },
  "55507": { label: "Maintenance", tier: "goods" },
  "55510": { label: "Equipment repair", tier: "goods" },
  "55508": { label: "Vehicle maintenance & repair", tier: "goods" },
  "55506": { label: "Custodial services", tier: "goods" },
  "55003": { label: "Landscaping services", tier: "goods" },
  "55692": { label: "Sanitary services", tier: "goods" },
  "55110": { label: "Security services", tier: "goods" },
  "55111": { label: "Background checks & fingerprinting", tier: "goods" },
  "55610": { label: "Advertising", tier: "goods" },
  "55600": { label: "Printing & binding", tier: "goods" },
  "55635": { label: "Laundry service", tier: "goods" },
  "55639": { label: "Animal services", tier: "goods" },
  "55400": { label: "Equipment rental", tier: "goods" },
  "55434": { label: "Fleet rental", tier: "goods" },
  "55440": { label: "Other rental", tier: "goods" },
  "55103": { label: "Freight", tier: "goods" },
  // Goods
  "55509": { label: "Software purchases", tier: "goods" },
  "55511": { label: "IT hardware purchases", tier: "goods" },
  "56000": { label: "Office supplies", tier: "goods" },
  "56110": { label: "Operating supplies", tier: "goods" },
  "56111": { label: "Food", tier: "goods" },
  "56120": { label: "Clothing & linens", tier: "goods" },
  "56128": { label: "Medical supplies", tier: "goods" },
  "56129": { label: "Drugs", tier: "goods" },
  "56141": { label: "Custodial supplies", tier: "goods" },
  "56143": { label: "Cafeteria supplies", tier: "goods" },
  "56144": { label: "Computers", tier: "goods" },
  "56145": { label: "Computer supplies", tier: "goods" },
  "56147": { label: "Software", tier: "goods" },
  "56157": { label: "Books & publications", tier: "goods" },
  "56162": { label: "Safety equipment", tier: "goods" },
  "56183": { label: "Fuel", tier: "goods" },
  "56210": { label: "Vehicle materials", tier: "goods" },
  "56211": { label: "Equipment supplies & maintenance materials", tier: "goods" },
  "56220": { label: "Building materials", tier: "goods" },
  "56230": { label: "Highway & grounds materials", tier: "goods" },
  "55207": { label: "Heating oil", tier: "goods" },
  "55208": { label: "Propane", tier: "goods" },
  "57010": { label: "Office equipment", tier: "goods" },
  "57020": { label: "Institutional equipment", tier: "goods" },
  "56950": { label: "Institutional equipment", tier: "goods" },
  "57045": { label: "Technology equipment", tier: "goods" },
  "57050": { label: "IT hardware purchases", tier: "goods" },
  "57051": { label: "Software", tier: "goods" },
  "57110": { label: "Transportation equipment", tier: "goods" },
  "57130": { label: "Heavy equipment", tier: "goods" },
  "57210": { label: "Shop machinery & tools", tier: "goods" },
  "57411": { label: "Communication equipment", tier: "goods" },
};

// Payers the state procurement code does not cover (29 Del. C. § 6902):
// the Legislature, school districts and charter schools, DSU, DTCC, and the
// University of Delaware. Their spend is shown but never counted as
// under-threshold spend.
export function isExemptPayer(department: string, division: string): boolean {
  if (department === "LEGISLATIVE BRANCH" || department === "HIGHER EDUCATION") return true;
  if (department === "DEPT OF EDUCATION CONTINUED") return true;
  if (department !== "DEPT OF EDUCATION") return false;
  if (/PUBLIC SCHOOL TRANSPORTATION|SCHOLARSHIP/.test(division)) return false;
  return /SCHOOL|SCH DIST|SCHL|SCH OF|CHARTER|CHTR|ACADEMY|ACAD |ASPIRA|MONTESSORI|VO-TECH|ILC|NCCDSC|OFFICE ADMINISTRATION/.test(division);
}

// Vendor names differ between the Checkbook (upper case, cut at 40
// characters) and the contract and OSD lists, so compare on a normalized form.
const SUFFIXES = /\b(THE|INC|INCORPORATED|LLC|L L C|LLP|LP|LTD|LIMITED|CORP|CORPORATION|CO|COMPANY|PC|PA|PLLC|DBA|OF DELAWARE|USA|US|NA)\b/g;

export function normalizeVendor(name: string): string {
  return name
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Payments to other governments and to state accounts (school nutrition
// accounts, cities, counties, state divisions, public authorities) are
// transfers, not purchases from a business.
const PUBLIC_PAYEE = [
  /^(DHSS|DNREC|DSCYF|DSP|DSHS|DELDOT|DTCC|DOC|DTI|OMB|DIV OF|DIVISION OF|DEPT OF|DEPARTMENT OF|OFFICE OF SECRETARY|OFFICE OF THE|STATE OF|CITY OF|TOWN OF|DEL STATE UNIV)\b/,
  /SCHOOL DISTRICT|SCH DIST|SCHOOL DIST|NUTRITION|CHARTER SCHOOL|VO-TECH SCH|\bRCCSD\b|^BSD /,
  /^(NEW CASTLE|KENT|SUSSEX) COUNTY( COUNCIL| GOVERNMENT| LEVY COURT)?$/,
  /^(FAMILY COURT|SUPERIOR COURT|UNIVERSITY OF DELAWARE|DELAWARE STATE UNIVERSITY|DELAWARE TRANSIT CORP|DELAWARE STATE POLICE|FIRE PREVENTION COMMISSION|DELAWARE HEALTH INFORMATION NETWORK|DELAWARE RIVER & BAY AUTHORITY)$/,
  /HOUSING AUTHORITY|PARKING AUTHORITY|CAPITOL POLICE|\bMPO$|TREASURER|PETTY CASH|^HIGHWAY SAFETY$/,
];

export function isPublicPayee(vendor: string): boolean {
  return PUBLIC_PAYEE.some((re) => re.test(vendor));
}
