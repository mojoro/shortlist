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

/** German Bundesländer → canonical German state name */
const DE_STATES: Record<string, string> = {
  "baden-württemberg": "Baden-Württemberg",
  "baden-wurttemberg": "Baden-Württemberg",
  bavaria: "Bayern",
  bayern: "Bayern",
  berlin: "Berlin",
  brandenburg: "Brandenburg",
  bremen: "Bremen",
  hamburg: "Hamburg",
  hessen: "Hessen",
  hesse: "Hessen",
  "mecklenburg-vorpommern": "Mecklenburg-Vorpommern",
  "mecklenburg-western pomerania": "Mecklenburg-Vorpommern",
  "lower saxony": "Niedersachsen",
  niedersachsen: "Niedersachsen",
  "north rhine-westphalia": "Nordrhein-Westfalen",
  "nordrhein-westfalen": "Nordrhein-Westfalen",
  "rheinland-pfalz": "Rheinland-Pfalz",
  "rhineland-palatinate": "Rheinland-Pfalz",
  saarland: "Saarland",
  sachsen: "Sachsen",
  saxony: "Sachsen",
  "sachsen-anhalt": "Sachsen-Anhalt",
  "saxony-anhalt": "Sachsen-Anhalt",
  "schleswig-holstein": "Schleswig-Holstein",
  thüringen: "Thüringen",
  thuringia: "Thüringen",
};

/** Major tech-hub cities → { country, region } */
const CITY_TO_COUNTRY: Record<string, ParsedLocation> = {
  // United States
  "san francisco": { country: "US", region: "San Francisco" },
  "new york": { country: "US", region: "New York" },
  "new york city": { country: "US", region: "New York" },
  nyc: { country: "US", region: "New York" },
  austin: { country: "US", region: "Austin" },
  seattle: { country: "US", region: "Seattle" },
  chicago: { country: "US", region: "Chicago" },
  boston: { country: "US", region: "Boston" },
  denver: { country: "US", region: "Denver" },
  "los angeles": { country: "US", region: "Los Angeles" },
  la: { country: "US", region: "Los Angeles" },
  miami: { country: "US", region: "Miami" },
  portland: { country: "US", region: "Portland" },
  atlanta: { country: "US", region: "Atlanta" },
  "washington dc": { country: "US", region: "Washington DC" },
  "washington d.c.": { country: "US", region: "Washington DC" },
  "washington, d.c.": { country: "US", region: "Washington DC" },
  raleigh: { country: "US", region: "Raleigh" },
  nashville: { country: "US", region: "Nashville" },
  "salt lake city": { country: "US", region: "Salt Lake City" },
  minneapolis: { country: "US", region: "Minneapolis" },
  pittsburgh: { country: "US", region: "Pittsburgh" },
  philadelphia: { country: "US", region: "Philadelphia" },
  "san diego": { country: "US", region: "San Diego" },
  dallas: { country: "US", region: "Dallas" },
  houston: { country: "US", region: "Houston" },
  phoenix: { country: "US", region: "Phoenix" },
  // Germany
  berlin: { country: "DE", region: "Berlin" },
  munich: { country: "DE", region: "Munich" },
  münchen: { country: "DE", region: "Munich" },
  hamburg: { country: "DE", region: "Hamburg" },
  frankfurt: { country: "DE", region: "Frankfurt" },
  cologne: { country: "DE", region: "Cologne" },
  köln: { country: "DE", region: "Cologne" },
  düsseldorf: { country: "DE", region: "Düsseldorf" },
  dusseldorf: { country: "DE", region: "Düsseldorf" },
  stuttgart: { country: "DE", region: "Stuttgart" },
  bonn: { country: "DE", region: "Bonn" },
  // United Kingdom
  london: { country: "GB", region: "London" },
  manchester: { country: "GB", region: "Manchester" },
  edinburgh: { country: "GB", region: "Edinburgh" },
  bristol: { country: "GB", region: "Bristol" },
  cambridge: { country: "GB", region: "Cambridge" },
  oxford: { country: "GB", region: "Oxford" },
  birmingham: { country: "GB", region: "Birmingham" },
  // Netherlands
  amsterdam: { country: "NL", region: "Amsterdam" },
  rotterdam: { country: "NL", region: "Rotterdam" },
  "the hague": { country: "NL", region: "The Hague" },
  "den haag": { country: "NL", region: "The Hague" },
  utrecht: { country: "NL", region: "Utrecht" },
  eindhoven: { country: "NL", region: "Eindhoven" },
  // France
  paris: { country: "FR", region: "Paris" },
  lyon: { country: "FR", region: "Lyon" },
  marseille: { country: "FR", region: "Marseille" },
  toulouse: { country: "FR", region: "Toulouse" },
  bordeaux: { country: "FR", region: "Bordeaux" },
  // Canada
  toronto: { country: "CA", region: "Toronto" },
  vancouver: { country: "CA", region: "Vancouver" },
  montreal: { country: "CA", region: "Montreal" },
  montréal: { country: "CA", region: "Montreal" },
  ottawa: { country: "CA", region: "Ottawa" },
  calgary: { country: "CA", region: "Calgary" },
  // Australia
  sydney: { country: "AU", region: "Sydney" },
  melbourne: { country: "AU", region: "Melbourne" },
  brisbane: { country: "AU", region: "Brisbane" },
  perth: { country: "AU", region: "Perth" },
  // Ireland
  dublin: { country: "IE", region: "Dublin" },
  cork: { country: "IE", region: "Cork" },
  // Switzerland
  zurich: { country: "CH", region: "Zurich" },
  zürich: { country: "CH", region: "Zurich" },
  geneva: { country: "CH", region: "Geneva" },
  genève: { country: "CH", region: "Geneva" },
  basel: { country: "CH", region: "Basel" },
  bern: { country: "CH", region: "Bern" },
  // Austria
  vienna: { country: "AT", region: "Vienna" },
  wien: { country: "AT", region: "Vienna" },
  graz: { country: "AT", region: "Graz" },
  linz: { country: "AT", region: "Linz" },
  // Sweden
  stockholm: { country: "SE", region: "Stockholm" },
  gothenburg: { country: "SE", region: "Gothenburg" },
  göteborg: { country: "SE", region: "Gothenburg" },
  malmö: { country: "SE", region: "Malmö" },
  malmo: { country: "SE", region: "Malmö" },
  // Denmark
  copenhagen: { country: "DK", region: "Copenhagen" },
  københavn: { country: "DK", region: "Copenhagen" },
  // Norway
  oslo: { country: "NO", region: "Oslo" },
  // Finland
  helsinki: { country: "FI", region: "Helsinki" },
  // Spain
  madrid: { country: "ES", region: "Madrid" },
  barcelona: { country: "ES", region: "Barcelona" },
  valencia: { country: "ES", region: "Valencia" },
  // Italy
  milan: { country: "IT", region: "Milan" },
  milano: { country: "IT", region: "Milan" },
  rome: { country: "IT", region: "Rome" },
  roma: { country: "IT", region: "Rome" },
  turin: { country: "IT", region: "Turin" },
  torino: { country: "IT", region: "Turin" },
  // Portugal
  lisbon: { country: "PT", region: "Lisbon" },
  lisboa: { country: "PT", region: "Lisbon" },
  porto: { country: "PT", region: "Porto" },
  // Poland
  warsaw: { country: "PL", region: "Warsaw" },
  warszawa: { country: "PL", region: "Warsaw" },
  kraków: { country: "PL", region: "Kraków" },
  krakow: { country: "PL", region: "Kraków" },
  wrocław: { country: "PL", region: "Wrocław" },
  wroclaw: { country: "PL", region: "Wrocław" },
  gdańsk: { country: "PL", region: "Gdańsk" },
  gdansk: { country: "PL", region: "Gdańsk" },
  poznań: { country: "PL", region: "Poznań" },
  poznan: { country: "PL", region: "Poznań" },
  // Israel
  "tel aviv": { country: "IL", region: "Tel Aviv" },
  jerusalem: { country: "IL", region: "Jerusalem" },
  haifa: { country: "IL", region: "Haifa" },
  // Singapore
  singapore: { country: "SG", region: "Singapore" },
  // Japan
  tokyo: { country: "JP", region: "Tokyo" },
  osaka: { country: "JP", region: "Osaka" },
  // India
  bangalore: { country: "IN", region: "Bangalore" },
  bengaluru: { country: "IN", region: "Bangalore" },
  mumbai: { country: "IN", region: "Mumbai" },
  delhi: { country: "IN", region: "Delhi" },
  "new delhi": { country: "IN", region: "Delhi" },
  hyderabad: { country: "IN", region: "Hyderabad" },
  pune: { country: "IN", region: "Pune" },
  // Belgium
  brussels: { country: "BE", region: "Brussels" },
  bruxelles: { country: "BE", region: "Brussels" },
  antwerp: { country: "BE", region: "Antwerp" },
  antwerpen: { country: "BE", region: "Antwerp" },
  // Czech Republic
  prague: { country: "CZ", region: "Prague" },
  praha: { country: "CZ", region: "Prague" },
  brno: { country: "CZ", region: "Brno" },
  // South Korea
  seoul: { country: "KR", region: "Seoul" },
  // New Zealand
  auckland: { country: "NZ", region: "Auckland" },
  wellington: { country: "NZ", region: "Wellington" },
  // Brazil
  "são paulo": { country: "BR", region: "São Paulo" },
  "sao paulo": { country: "BR", region: "São Paulo" },
  "rio de janeiro": { country: "BR", region: "Rio de Janeiro" },
};

export function parseLocation(location: string | null): ParsedLocation {
  return { country: null, region: null };
}
