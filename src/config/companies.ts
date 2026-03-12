export type CompanyConfig = {
  slug: string;  // boards-api.greenhouse.io/v1/boards/{slug}/jobs
  name: string;  // display name used for Job.company
};

/**
 * Berlin / EU tech companies known to use Greenhouse.
 * This is the single file to edit until profile-level company management
 * is wired up through the settings UI.
 */
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
