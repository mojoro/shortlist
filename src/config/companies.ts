export type CompanyConfig = {
  slug: string;
  name: string;
};

// ── Greenhouse ────────────────────────────────────────────────────────────────
// Edit: boards-api.greenhouse.io/v1/boards/{slug}/jobs

export const GREENHOUSE_COMPANIES: CompanyConfig[] = [
  { slug: "personio",       name: "Personio" },
  { slug: "getyourguide",   name: "GetYourGuide" },
  { slug: "n26",            name: "N26" },
  { slug: "hellofresh",     name: "HelloFresh" },
  { slug: "contentful",     name: "Contentful" },
  { slug: "adjust",         name: "Adjust" },
  { slug: "sumup",          name: "SumUp" },
  { slug: "taxfix",         name: "Taxfix" },
  { slug: "babbel",         name: "Babbel" },
  { slug: "pitch",          name: "Pitch" },
  { slug: "forto",          name: "Forto" },
  { slug: "billie",         name: "Billie" },
  { slug: "clark",          name: "Clark" },
  { slug: "trade-republic", name: "Trade Republic" },
  { slug: "celonis",        name: "Celonis" },
  { slug: "mambu",          name: "Mambu" },
  { slug: "zenjob",         name: "Zenjob" },
  { slug: "solaris",        name: "Solaris" },
  { slug: "kombo",          name: "Kombo" },
  { slug: "taktile",        name: "Taktile" },
  { slug: "cogram",         name: "Cogram" },
];

// ── Lever ─────────────────────────────────────────────────────────────────────
// Edit: api.lever.co/v1/postings/{slug}?mode=json
// Find slug at jobs.lever.co/{slug}

export const LEVER_COMPANIES: CompanyConfig[] = [
  // Add companies here — find slugs at jobs.lever.co/{slug}
];

// ── Ashby ─────────────────────────────────────────────────────────────────────
// Edit: api.ashbyhq.com/posting-api/job-board/{slug}

export const ASHBY_COMPANIES: CompanyConfig[] = [
  { slug: "linear",        name: "Linear" },
  { slug: "vercel",        name: "Vercel" },
  { slug: "supabase",      name: "Supabase" },
  { slug: "raycast",       name: "Raycast" },
  { slug: "infisical",     name: "Infisical" },
  { slug: "posthog",       name: "PostHog" },
];
