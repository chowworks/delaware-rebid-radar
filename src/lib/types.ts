// Raw rows as returned by the Socrata SODA API on data.delaware.gov.
export interface RawContract {
  contractnumber?: string;
  contracttitle?: string;
  agency?: string;
  unspsc?: string;
  effectivedate?: string;
  expirationdate?: string;
  multifeatures?: string;
  contracturl?: { url?: string };
  extensionavailable?: boolean;
}

export interface RawVendor {
  companyname?: string;
  contracturl?: { url?: string };
  mwbecertified?: string;
  vetservdisabled?: string;
  delawarevendor?: string;
}

export type Likelihood = "High" | "Medium" | "Low";

export type WindowStatus = "open" | "upcoming" | "closing" | "later";

export interface Vendor {
  name: string;
  mwbe: boolean;
  veteran: boolean;
  delaware: boolean;
}

export interface Contract {
  id: string; // MMP contract detail id, falls back to contract number
  number: string;
  title: string;
  agency: string;
  agencyName: string;
  unspsc: string[];
  category: string;
  effective: string | null; // ISO date (yyyy-mm-dd)
  expiration: string; // ISO date
  termMonths: number | null;
  deVendor: boolean;
  mbeWbe: boolean;
  setAside: boolean;
  cooperative: boolean;
  url: string | null;
  vendors: Vendor[];
  // Prediction
  leadMonths: number; // measured median for the category
  predicted: string; // most likely posting date: expiration minus the median lead time
  windowStart: string;
  windowEnd: string;
  status: WindowStatus;
  daysToWindow: number; // negative when the window has already opened
  likelihood: Likelihood;
  reasons: string[];
  priorAwards: number;
}

export interface Dataset {
  contracts: Contract[];
  source: "live" | "sample";
  fetchedAt: string;
}
