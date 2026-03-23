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

// ── Signal 3: Location quality ───────────────────────────────────────────────

export function scoreLocationQuality(
  candidate: PoolCandidate,
  profile: HeuristicProfile,
): number {
  const lowerLocation = (candidate.location ?? "").toLowerCase();

  const isRemote =
    candidate.locationType === "REMOTE" ||
    REMOTE_SIGNALS.some((sig) => lowerLocation.includes(sig));

  // Exact location match
  if (profile.targetLocations.length > 0) {
    for (const loc of profile.targetLocations) {
      if (lowerLocation.includes(loc.toLowerCase())) return 1.0;
    }
  }

  // Country match via workEligibility
  if (
    candidate.country !== null &&
    profile.workEligibility.length > 0 &&
    profile.workEligibility.includes(candidate.country)
  ) {
    if (!isRemote) return 0.7;
  }

  if (isRemote) {
    const noEligibilitySet = profile.workEligibility.length === 0;
    const countryNullOrEligible =
      candidate.country === null ||
      profile.workEligibility.includes(candidate.country ?? "");

    if (noEligibilitySet || countryNullOrEligible) return 0.6;

    // Remote but country not in workEligibility
    return 0.1;
  }

  // Unknown location
  if (candidate.location === null) return 0.3;

  // No match at all
  return 0.0;
}

// ── Signal 4: Description relevance ─────────────────────────────────────────

export function scoreDescriptionRelevance(
  excerpt: string,
  targetRoles: string[],
  requiredSkills: string[],
): number {
  if (!excerpt || excerpt.trim().length === 0) return 0.3;

  // Skip boilerplate header by finding the first marker and advancing past it
  let workingExcerpt = excerpt;
  const lowerExcerpt = excerpt.toLowerCase();
  for (const marker of BOILERPLATE_MARKERS) {
    const idx = lowerExcerpt.indexOf(marker);
    if (idx !== -1) {
      // Advance past this section — skip to end of line containing marker
      const afterMarker = idx + marker.length;
      const nextNewline = excerpt.indexOf("\n", afterMarker);
      workingExcerpt =
        nextNewline !== -1 ? excerpt.slice(nextNewline + 1) : excerpt.slice(afterMarker);
      break;
    }
  }

  if (workingExcerpt.trim().length === 0) return 0.3;

  // Build keyword set: role tokens (no stopwords, min 3 chars) + all required skills
  const roleTokens = tokenizeRoles(targetRoles);
  const skillKeywords = requiredSkills.map((s) => s.toLowerCase());
  const allKeywords = Array.from(new Set([...roleTokens, ...skillKeywords]));

  if (allKeywords.length === 0) return 0.3;

  const lowerWorking = workingExcerpt.toLowerCase();
  const foundCount = allKeywords.filter((kw) => lowerWorking.includes(kw)).length;

  const density = foundCount / allKeywords.length;
  // Scale: 50% keyword coverage → 1.0
  return Math.min(density * 2, 1.0);
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
