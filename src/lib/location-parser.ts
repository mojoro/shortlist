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

export function parseLocation(location: string | null): ParsedLocation {
  return { country: null, region: null };
}
