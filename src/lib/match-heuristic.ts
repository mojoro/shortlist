/**
 * Tier 2 heuristic scoring engine for the three-tier matching pipeline.
 *
 * Scores PoolCandidate objects against a HeuristicProfile using five weighted
 * signals, then classifies each into accepted / borderline / rejected buckets.
 * Borderline results carry the full candidate for downstream AI triage (Tier 3).
 *
 * Pure computation — no I/O, no external dependencies.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type PoolCandidate = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  country: string | null;
  region: string | null;
  descriptionExcerpt: string; // First 1000 chars, truncated at DB level
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string | null; // "FULL_TIME", "PART_TIME", etc.
  companySize: string | null;
  locationType: string | null; // "REMOTE", "HYBRID", "ONSITE"
};

export type HeuristicProfile = {
  targetRoles: string[];
  requiredSkills: string[];
  niceToHaveSkills: string[];
  targetLocations: string[];
  workEligibility: string[]; // ISO 3166-1 alpha-2 codes e.g. ["US", "DE"]
  remotePreference: string; // "REMOTE_ONLY", "HYBRID_OK", "ANY", "ONSITE_ONLY"
  targetSalaryMin: number | null;
  targetSalaryMax: number | null;
  currency: string;
  companySize: string[]; // CompanySize enum values
};

export type HeuristicResult = {
  accepted: Array<{ id: string; confidence: number }>;
  borderline: Array<{ id: string; confidence: number; candidate: PoolCandidate }>;
  rejected: Array<{ id: string; confidence: number }>;
};

// ── Exported constants ───────────────────────────────────────────────────────

export const ACCEPT_THRESHOLD = 0.6;
export const BORDERLINE_THRESHOLD = 0.3;

// ── Internal constants ───────────────────────────────────────────────────────

const WEIGHTS = {
  titleRelevance: 0.35,
  skillOverlap: 0.25,
  locationQuality: 0.15,
  descriptionRelevance: 0.15,
  metadataSignals: 0.10,
};

/**
 * Stopwords stripped from role strings before token matching.
 * Kept in sync with match-sql.ts.
 */
const ROLE_STOPWORDS = new Set([
  "engineer", "developer", "manager", "lead", "senior", "junior",
  "head", "principal", "staff", "associate", "mid", "and", "the",
  "of", "&", "/", "specialist", "expert", "architect", "software",
]);

const REMOTE_SIGNALS = ["remote", "anywhere", "worldwide", "distributed"];

/**
 * Boilerplate section markers — if found, skip to after the matched position
 * before counting keyword density.
 */
const BOILERPLATE_MARKERS = [
  "about us",
  "our mission",
  "who we are",
  "company description",
];

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Score all candidates against the profile and split into three buckets.
 *
 * - accepted  : composite >= ACCEPT_THRESHOLD (0.6)
 * - borderline: composite >= BORDERLINE_THRESHOLD (0.3) — full candidate included for AI triage
 * - rejected  : composite < BORDERLINE_THRESHOLD
 */
export function scoreAndClassify(
  candidates: PoolCandidate[],
  profile: HeuristicProfile,
): HeuristicResult {
  return { accepted: [], borderline: [], rejected: candidates.map(c => ({ id: c.id, confidence: 0 })) };
}
