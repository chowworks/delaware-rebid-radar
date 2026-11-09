// Card-statement merchant names carry payment-processor prefixes ("SQ *",
// "TST* ", "PAYPAL *"), order or store numbers ("AMZN Mktp US*2K4...",
// "LOWES #02795*"). Reduce them to a name a person would recognize.
const PROCESSORS = new Set([
  "SQ", "TST", "IN", "PAYPAL", "PP", "PY", "WPY", "SP", "FSP", "EB", "EVENT", "AB", "DRI", "PAR", "BTS", "TFS",
  "CKE", "IC", "SMK", "GAN", "SPI", "WWP", "WL", "REI", "SSP", "4TE", "L2G", "CCI", "ACA", "SUMUP", "CC", "SEI",
  "TCT", "ANC", "BLT", "RTI", "FTA", "VCN", "DMI", "EIG", "AWL", "DBC", "HCM", "ESEA", "D J", "GTL", "CBI", "FS",
  "TLF", "GDP", "CAN", "CLR", "PLI", "ACT", "ZTL", "BBS", "POS", "SPO", "STK", "MSB", "NIC", "OLO", "CHQ",
]);
const BRANDS: [RegExp, string][] = [
  [/^(AMZN|AMAZON|AMZ\b|AMZ\*)/, "AMAZON"],
  [/^(WAL-?MART|WM SUPERCENTER|WALMART|WM\.COM)/, "WALMART"],
  [/^(THE HOME DEPOT|HOME DEPOT|HOMEDEPOT)/, "HOME DEPOT"],
  [/^LOWES/, "LOWES"],
  [/^CANON/, "CANON"],
  [/^(VZWRLSS|VERIZON|VZ WIRELESS)/, "VERIZON"],
  [/^STAPLES/, "STAPLES"],
  [/^(W ?W ?GRAINGER|GRAINGER)/, "GRAINGER"],
  [/^(SAMS ?CLUB|SAMSCLUB)/, "SAMS CLUB"],
  [/^COSTCO/, "COSTCO"],
  [/^TARGET/, "TARGET"],
  [/^UBER/, "UBER"],
  [/^LYFT/, "LYFT"],
  [/^(OFFICE ?DEPOT|OFFICEMAX)/, "OFFICE DEPOT"],
  [/^DOLLAR ?TREE/, "DOLLAR TREE"],
  [/^DOLLAR ?GENERAL/, "DOLLAR GENERAL"],
  [/^(WAWA)/, "WAWA"],
  [/^ROYAL FARMS/, "ROYAL FARMS"],
  [/^ACME/, "ACME"],
  [/^GIANT /, "GIANT"],
  [/^SHOPRITE/, "SHOPRITE"],
  [/^TRACTOR SUPPLY/, "TRACTOR SUPPLY"],
  [/^ADVANCE AUTO/, "ADVANCE AUTO PARTS"],
  [/^AUTOZONE/, "AUTOZONE"],
  [/^(NAPA|NAPA STORE)/, "NAPA AUTO PARTS"],
  [/^(ATT|AT&T|AT AND T)\b/, "AT&T"],
  [/^(DELL|DMI\b)/, "DELL"],
  [/^(ADOBE)/, "ADOBE"],
  [/^(MICROSOFT|MSFT)/, "MICROSOFT"],
  [/^(GOOGLE)/, "GOOGLE"],
  [/^(SOUTHWES|SWA\b)/, "SOUTHWEST AIRLINES"],
  [/^(UPS\b|UPS\*)/, "UPS"],
  [/^FEDEX/, "FEDEX"],
  [/^(USPS|US POSTAL)/, "USPS"],
];

export function cleanMerchant(raw: string): string {
  let m = raw.toUpperCase().replace(/\s+/g, " ").trim();
  const star = m.indexOf("*");
  if (star >= 0) {
    const head = m.slice(0, star).trim();
    const rest = m.slice(star + 1).replace(/^\*+/, "").trim();
    m = PROCESSORS.has(head) && rest ? rest.split("*")[0].trim() || rest : head || rest;
  }
  for (const [re, name] of BRANDS) if (re.test(m)) return name;
  const hash = m.indexOf("#"); // store numbers
  const words = (hash >= 0 ? m.slice(0, hash) : m).split(" ").filter(Boolean);
  // Drop trailing tokens with digits (store or order numbers), keeping the first word.
  while (words.length > 1 && /\d/.test(words[words.length - 1])) words.pop();
  m = words.join(" ").replace(/[\s.,\-/*]+$/, "").trim();
  return m || raw.toUpperCase().trim();
}
