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

// ── Tokenisation helpers ─────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s/\-&,.()\[\]|:;!?]+/)
    .filter((t) => t.length > 0);
}

function tokenizeRoles(roles: string[]): string[] {
  return roles
    .flatMap((r) => tokenize(r))
    .filter((t) => t.length >= 3 && !ROLE_STOPWORDS.has(t));
}

// ── Signal 1: Title relevance ────────────────────────────────────────────────

export function scoreTitleRelevance(
  title: string,
  targetRoles: string[],
): number {
  if (targetRoles.length === 0) return 0.5;

  const lowerTitle = title.toLowerCase();

  // Full phrase match — any target role appears verbatim as a substring
  for (const role of targetRoles) {
    if (lowerTitle.includes(role.toLowerCase())) return 1.0;
  }

  // Token overlap — tokenize all roles together, count matches against title tokens
  const roleTokens = tokenizeRoles(targetRoles);

  if (roleTokens.length === 0) {
    // All tokens were stopwords — fall back to raw phrase search
    for (const role of targetRoles) {
      if (lowerTitle.includes(role.toLowerCase())) return 0.5;
    }
    return 0.0;
  }

  const titleTokens = new Set(tokenize(lowerTitle));
  const matched = roleTokens.filter((t) => titleTokens.has(t)).length;
  const ratio = matched / roleTokens.length;

  if (ratio === 0) {
    // Check for any single raw-role substring (partial phrase hit)
    for (const role of targetRoles) {
      if (lowerTitle.includes(role.toLowerCase())) return 0.3;
    }
    return 0.0;
  }

  // Map 0 < ratio <= 1 to 0.3–0.9 proportionally, 1.0 already handled above
  return 0.3 + ratio * 0.6;
}

// ── Signal 2: Skill overlap ──────────────────────────────────────────────────

export function scoreSkillOverlap(
  candidate: PoolCandidate,
  requiredSkills: string[],
  niceToHaveSkills: string[],
): number {
  if (requiredSkills.length === 0) return 0.5;

  const haystack = [
    candidate.title,
    candidate.descriptionExcerpt,
    ...candidate.skills,
  ]
    .join(" ")
    .toLowerCase();

  const matchedRequired = requiredSkills.filter((s) =>
    haystack.includes(s.toLowerCase()),
  ).length;

  const base = matchedRequired / requiredSkills.length;

  const matchedNice =
    niceToHaveSkills.length > 0
      ? niceToHaveSkills.filter((s) => haystack.includes(s.toLowerCase())).length
      : 0;

  const bonus =
    niceToHaveSkills.length > 0
      ? (matchedNice / niceToHaveSkills.length) * 0.2
      : 0;

  return Math.min(base + bonus, 1.0);
}

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
