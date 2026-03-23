export interface ParsedLocation {
  country: string | null;
  region: string | null;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

/** ISO 3166-1 alpha-2 country codes keyed by lowercased name/alias */
const COUNTRY_NAMES: Record<string, string> = {
  // United States
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  "u.s.": "US",
  "u.s.a.": "US",
  america: "US",
  // United Kingdom
  "united kingdom": "GB",
  uk: "GB",
  "u.k.": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "great britain": "GB",
  britain: "GB",
  // Germany
  germany: "DE",
  deutschland: "DE",
  de: "DE",
  // France
  france: "FR",
  fr: "FR",
  // Netherlands
  netherlands: "NL",
  holland: "NL",
  "the netherlands": "NL",
  nl: "NL",
  // Canada
  canada: "CA",
  // Australia
  australia: "AU",
  au: "AU",
  // Ireland
  ireland: "IE",
  ie: "IE",
  // Switzerland
  switzerland: "CH",
  ch: "CH",
  // Austria
  austria: "AT",
  at: "AT",
  // Sweden
  sweden: "SE",
  se: "SE",
  // Denmark
  denmark: "DK",
  dk: "DK",
  // Norway
  norway: "NO",
  // Finland
  finland: "FI",
  fi: "FI",
  // Spain
  spain: "ES",
  es: "ES",
  // Italy
  italy: "IT",
  it: "IT",
  // Portugal
  portugal: "PT",
  pt: "PT",
  // Poland
  poland: "PL",
  pl: "PL",
  // Czech Republic
  "czech republic": "CZ",
  czechia: "CZ",
  cz: "CZ",
  // Belgium
  belgium: "BE",
  be: "BE",
  // Israel
  israel: "IL",
  il: "IL",
  // Singapore
  singapore: "SG",
  sg: "SG",
  // Japan
  japan: "JP",
  jp: "JP",
  // India
  india: "IN",
  // Brazil
  brazil: "BR",
  brasil: "BR",
  br: "BR",
  // New Zealand
  "new zealand": "NZ",
  nz: "NZ",
  // South Korea
  "south korea": "KR",
  korea: "KR",
  kr: "KR",
  // Great Britain
  gb: "GB",
};

/** US state abbreviations and full names → canonical state name */
const US_STATES: Record<string, string> = {
  // Abbreviations
  al: "Alabama",
  ak: "Alaska",
  az: "Arizona",
  ar: "Arkansas",
  ca: "California",
  co: "Colorado",
  ct: "Connecticut",
  de: "Delaware",
  fl: "Florida",
  ga: "Georgia",
  hi: "Hawaii",
  id: "Idaho",
  il: "Illinois",
  in: "Indiana",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  md: "Maryland",
  ma: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mo: "Missouri",
  mt: "Montana",
  ne: "Nebraska",
  nv: "Nevada",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  ny: "New York",
  nc: "North Carolina",
  nd: "North Dakota",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  pa: "Pennsylvania",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  ut: "Utah",
  vt: "Vermont",
  va: "Virginia",
  wa: "Washington",
  wv: "West Virginia",
  wi: "Wisconsin",
  wy: "Wyoming",
  dc: "District of Columbia",
  // Full names (lowercased for lookup)
  alabama: "Alabama",
  alaska: "Alaska",
  arizona: "Arizona",
  arkansas: "Arkansas",
  california: "California",
  colorado: "Colorado",
  connecticut: "Connecticut",
  delaware: "Delaware",
  florida: "Florida",
  georgia: "Georgia",
  hawaii: "Hawaii",
  idaho: "Idaho",
  illinois: "Illinois",
  indiana: "Indiana",
  iowa: "Iowa",
  kansas: "Kansas",
  kentucky: "Kentucky",
  louisiana: "Louisiana",
  maine: "Maine",
  maryland: "Maryland",
  massachusetts: "Massachusetts",
  michigan: "Michigan",
  minnesota: "Minnesota",
  mississippi: "Mississippi",
  missouri: "Missouri",
  montana: "Montana",
  nebraska: "Nebraska",
  nevada: "Nevada",
  "new hampshire": "New Hampshire",
  "new jersey": "New Jersey",
  "new mexico": "New Mexico",
  "new york": "New York",
  "north carolina": "North Carolina",
  "north dakota": "North Dakota",
  ohio: "Ohio",
  oklahoma: "Oklahoma",
  oregon: "Oregon",
  pennsylvania: "Pennsylvania",
  "rhode island": "Rhode Island",
  "south carolina": "South Carolina",
  "south dakota": "South Dakota",
  tennessee: "Tennessee",
  texas: "Texas",
  utah: "Utah",
  vermont: "Vermont",
  virginia: "Virginia",
  washington: "Washington",
  "west virginia": "West Virginia",
  wisconsin: "Wisconsin",
  wyoming: "Wyoming",
  "district of columbia": "District of Columbia",
};

export function parseLocation(location: string | null): ParsedLocation {
  return { country: null, region: null };
}
