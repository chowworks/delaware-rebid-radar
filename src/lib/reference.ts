// Agency codes used in the Delaware Bids & Contracts datasets. Only codes we
// are confident about are named; anything else is shown as its raw code.
export const AGENCY_NAMES: Record<string, string> = {
  AGR: "Department of Agriculture",
  AOA: "Office of the Auditor of Accounts",
  ARNG: "Delaware Army National Guard",
  ASD: "Appoquinimink School District",
  BSD: "Brandywine School District",
  CHD: "Cape Henlopen School District",
  CHR: "Christina School District",
  COL: "Colonial School District",
  CSD: "Capital School District",
  CYF: "Services for Children, Youth & Their Families",
  DHR: "Department of Human Resources",
  DOC: "Department of Correction",
  DOE: "Department of Education",
  DOI: "Department of Insurance",
  DOT: "Department of Transportation (DelDOT)",
  DSHA: "Delaware State Housing Authority",
  DSU: "Delaware State University",
  DTCC: "Delaware Technical Community College",
  DTI: "Department of Technology & Information",
  FIN: "Department of Finance",
  GSS: "Government Support Services (statewide)",
  HSS: "Department of Health & Social Services",
  IRD: "Indian River School District",
  LAB: "Department of Labor",
  NAT: "Natural Resources & Environmental Control (DNREC)",
  OMB: "Office of Management & Budget",
  RCCD: "Red Clay Consolidated School District",
  SSD: "Smyrna School District",
  STA: "Department of State",
  TRE: "Office of the State Treasurer",
};

export function agencyName(code: string): string {
  return AGENCY_NAMES[code] ?? code;
}

// UNSPSC segment (first two digits) -> plain-language category.
export const UNSPSC_SEGMENTS: Record<string, string> = {
  "10": "Plants & Animals",
  "11": "Raw Materials",
  "12": "Chemicals",
  "14": "Paper Products",
  "15": "Fuels & Lubricants",
  "20": "Mining Equipment",
  "21": "Farm & Grounds Equipment",
  "22": "Construction Equipment",
  "23": "Industrial Machinery",
  "24": "Material Handling",
  "25": "Vehicles & Transportation Equipment",
  "26": "Power & Electrical Equipment",
  "27": "Tools",
  "30": "Building Materials",
  "31": "Manufacturing Components",
  "32": "Electronic Components",
  "39": "Lighting & Electrical",
  "40": "HVAC & Plumbing Equipment",
  "41": "Lab & Testing Equipment",
  "42": "Medical Equipment & Supplies",
  "43": "IT & Telecom",
  "44": "Office Equipment & Supplies",
  "45": "Printing & Audio-Visual",
  "46": "Public Safety & Security",
  "47": "Cleaning Equipment & Supplies",
  "48": "Food Service Equipment",
  "49": "Sports & Recreation",
  "50": "Food & Beverage",
  "51": "Pharmaceuticals",
  "52": "Appliances & Furnishings",
  "53": "Apparel & Uniforms",
  "55": "Published Products",
  "56": "Furniture",
  "60": "Educational Materials",
  "70": "Agricultural & Environmental Services",
  "71": "Mining & Oil Services",
  "72": "Construction & Facility Maintenance",
  "73": "Industrial Services",
  "76": "Cleaning & Janitorial Services",
  "77": "Environmental Services",
  "78": "Transportation & Logistics Services",
  "80": "Management & Business Services",
  "81": "Engineering & IT Services",
  "82": "Marketing, Design & Communications",
  "83": "Utilities",
  "84": "Financial & Insurance Services",
  "85": "Healthcare Services",
  "86": "Education & Training Services",
  "90": "Travel, Food & Lodging Services",
  "91": "Personal & Domestic Services",
  "92": "Public Safety Services",
  "93": "Social & Community Services",
  "94": "Organizations & Clubs",
  "95": "Land & Buildings",
};

export function categoryFor(codes: string[]): string {
  for (const code of codes) {
    const name = UNSPSC_SEGMENTS[code.slice(0, 2)];
    if (name) return name;
  }
  return "Other / Unclassified";
}

// Typical months between a solicitation posting and the incumbent contract's
// expiration, by segment. These are planning assumptions, not measured values:
// complex services are solicited well ahead, commodities and single projects less so.
const LONG_LEAD = new Set(["43", "80", "81", "83", "84", "85", "86", "93"]);
const SHORT_LEAD = new Set(["72", "95", "15", "50"]);

export function leadMonthsFor(codes: string[]): number {
  const segs = codes.map((c) => c.slice(0, 2));
  if (segs.some((s) => LONG_LEAD.has(s))) return 9;
  if (segs.length && segs.every((s) => SHORT_LEAD.has(s))) return 4;
  return 6;
}
