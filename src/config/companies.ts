export type CompanyConfig = {
  slug: string;
  name: string;
};

export type USAJobsSearchConfig = {
  keyword: string;
  location: string;
};

export type AdzunaSearchConfig = {
  country: string;
  keyword: string;
  location: string;
};

// ── Greenhouse ────────────────────────────────────────────────────────────────
// boards-api.greenhouse.io/v1/boards/{slug}/jobs

export const GREENHOUSE_COMPANIES: CompanyConfig[] = [
  // Berlin / DACH
  { slug: "personio",        name: "Personio" },
  { slug: "getyourguide",    name: "GetYourGuide" },
  { slug: "n26",             name: "N26" },
  { slug: "hellofresh",      name: "HelloFresh" },
  { slug: "contentful",      name: "Contentful" },
  { slug: "adjust",          name: "Adjust" },
  { slug: "sumup",           name: "SumUp" },
  { slug: "taxfix",          name: "Taxfix" },
  { slug: "babbel",          name: "Babbel" },
  { slug: "pitch",           name: "Pitch" },
  { slug: "forto",           name: "Forto" },
  { slug: "billie",          name: "Billie" },
  { slug: "clark",           name: "Clark" },
  { slug: "trade-republic",  name: "Trade Republic" },
  { slug: "celonis",         name: "Celonis" },
  { slug: "mambu",           name: "Mambu" },
  { slug: "zenjob",          name: "Zenjob" },
  { slug: "solaris",         name: "Solaris" },
  { slug: "kombo",           name: "Kombo" },
  { slug: "taktile",         name: "Taktile" },
  { slug: "cogram",          name: "Cogram" },
  { slug: "scout24",         name: "Scout24" },
  { slug: "grover",          name: "Grover" },
  { slug: "trivago",         name: "Trivago" },
  { slug: "wooga",           name: "Wooga" },
  { slug: "refurbed",        name: "Refurbed" },
  { slug: "finanzcheck",     name: "Finanzcheck" },

  // Europe (non-DACH)
  { slug: "adyen",           name: "Adyen" },
  { slug: "wolt",            name: "Wolt" },
  { slug: "pleo",            name: "Pleo" },
  { slug: "trustpilot",      name: "Trustpilot" },
  { slug: "typeform",        name: "Typeform" },
  { slug: "wallapop",        name: "Wallapop" },
  { slug: "cabify",          name: "Cabify" },
  { slug: "truelayer",       name: "TrueLayer" },
  { slug: "form3",           name: "Form3" },
  { slug: "monzo",           name: "Monzo" },

  // Global / remote-friendly
  { slug: "cloudflare",      name: "Cloudflare" },
  { slug: "gitlab",          name: "GitLab" },
  { slug: "fastly",          name: "Fastly" },
  { slug: "mongodb",         name: "MongoDB" },
  { slug: "elastic",         name: "Elastic" },
  { slug: "datadog",         name: "Datadog" },
  { slug: "databricks",      name: "Databricks" },
  { slug: "okta",            name: "Okta" },
  { slug: "figma",           name: "Figma" },
  { slug: "airtable",        name: "Airtable" },
  { slug: "twilio",          name: "Twilio" },
  { slug: "braze",           name: "Braze" },
  { slug: "amplitude",       name: "Amplitude" },
  { slug: "klaviyo",         name: "Klaviyo" },
  { slug: "mixpanel",        name: "Mixpanel" },
  { slug: "iterable",        name: "Iterable" },
  { slug: "fivetran",        name: "Fivetran" },
  { slug: "temporal",        name: "Temporal" },
  { slug: "intercom",        name: "Intercom" },
  { slug: "gofundme",        name: "GoFundMe" },
  { slug: "singlestore",     name: "SingleStore" },
  { slug: "yugabyte",        name: "YugabyteDB" },
];

// ── Ashby ─────────────────────────────────────────────────────────────────────
// api.ashbyhq.com/posting-api/job-board/{slug}

export const ASHBY_COMPANIES: CompanyConfig[] = [
  // Developer tools / infra
  { slug: "linear",          name: "Linear" },
  { slug: "vercel",          name: "Vercel" },
  { slug: "supabase",        name: "Supabase" },
  { slug: "neon",            name: "Neon" },
  { slug: "raycast",         name: "Raycast" },
  { slug: "infisical",       name: "Infisical" },
  { slug: "posthog",         name: "PostHog" },
  { slug: "clerk",           name: "Clerk" },
  { slug: "resend",          name: "Resend" },
  { slug: "inngest",         name: "Inngest" },
  { slug: "render",          name: "Render" },
  { slug: "railway",         name: "Railway" },
  { slug: "doppler",         name: "Doppler" },
  { slug: "mintlify",        name: "Mintlify" },
  { slug: "axiom",           name: "Axiom" },
  { slug: "checkly",         name: "Checkly" },
  { slug: "tempo",           name: "Tempo" },
  { slug: "coder",           name: "Coder" },
  { slug: "workos",          name: "WorkOS" },
  { slug: "stytch",          name: "Stytch" },
  { slug: "nango",           name: "Nango" },
  { slug: "speakeasy",       name: "Speakeasy" },
  { slug: "knock",           name: "Knock" },
  { slug: "hightouch",       name: "Hightouch" },
  { slug: "lightdash",       name: "Lightdash" },
  { slug: "cube",            name: "Cube" },
  { slug: "weaviate",        name: "Weaviate" },
  { slug: "n8n",             name: "n8n" },
  { slug: "plane",           name: "Plane" },
  { slug: "plain",           name: "Plain" },

  // AI
  { slug: "perplexity",      name: "Perplexity" },
  { slug: "cohere",          name: "Cohere" },
  { slug: "elevenlabs",      name: "ElevenLabs" },
  { slug: "synthesia",       name: "Synthesia" },
  { slug: "runway",          name: "Runway" },
  { slug: "character",       name: "Character.AI" },
  { slug: "harvey",          name: "Harvey" },
  { slug: "sierra",          name: "Sierra" },
  { slug: "modal",           name: "Modal" },
  { slug: "baseten",         name: "Baseten" },
  { slug: "langchain",       name: "LangChain" },

  // HR / ops / finance
  { slug: "deel",            name: "Deel" },
  { slug: "oyster",          name: "Oyster" },
  { slug: "ramp",            name: "Ramp" },
  { slug: "leapsome",        name: "Leapsome" },
  { slug: "moss",            name: "Moss" },
  { slug: "compa",           name: "Compa" },
  { slug: "assemble",        name: "Assemble" },

  // Content / docs
  { slug: "sanity",          name: "Sanity" },
  { slug: "incident",        name: "Incident.io" },
];

// ── Lever ─────────────────────────────────────────────────────────────────────
// api.lever.co/v1/postings/{slug}?mode=json
// Find slugs at jobs.lever.co/{slug}

export const LEVER_COMPANIES: CompanyConfig[] = [
  // Add companies here — find slugs at jobs.lever.co/{slug}
];

// ── USAJobs ──────────────────────────────────────────────────────────────────
// data.usajobs.gov/api/search — requires API key + registered email

export const USAJOBS_SEARCHES: USAJobsSearchConfig[] = [
  { keyword: "Software Engineer", location: "Washington, DC" },
  { keyword: "IT Specialist", location: "" },
  { keyword: "Human Resources", location: "" },
  { keyword: "Administrative", location: "" },
  { keyword: "Banking", location: "" },
];

// ── Adzuna ────────────────────────────────────────────────────────────────────
// api.adzuna.com/v1/api/jobs/{country}/search/{page}
// Requires ADZUNA_APP_ID and ADZUNA_APP_KEY env vars

export const ADZUNA_SEARCHES: AdzunaSearchConfig[] = [
  { country: "us", keyword: "Software Engineer",        location: "" },
  { country: "us", keyword: "Human Resources",          location: "" },
  { country: "us", keyword: "IT Specialist",            location: "" },
  { country: "us", keyword: "Bank Teller",              location: "" },
  { country: "us", keyword: "Administrative Assistant", location: "" },
  { country: "de", keyword: "Software Engineer",        location: "Berlin" },
  { country: "gb", keyword: "Software Engineer",        location: "London" },
];
