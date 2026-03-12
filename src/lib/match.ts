export const MAX_CANDIDATES_PER_RUN = 30;

// Generic words that appear in almost every job title and carry no role-specific signal.
// When building match tokens from a target role, these are stripped so we only match
// on the meaningful part (e.g. "Frontend Engineer" → ["frontend"]).
const ROLE_STOPWORDS = new Set([
  "engineer", "developer", "manager", "lead", "senior", "junior",
  "head", "principal", "staff", "associate", "mid", "and", "the",
  "of", "&", "/", "specialist", "expert", "architect",
]);

/**
 * Returns true if the job should be included in this profile's candidate set.
 *
 * Matching rules (title-only — description matching is intentionally excluded
 * to avoid false positives where an unrelated job mentions a keyword in passing):
 *
 * 1. Hard exclude: any excludedKeyword appears in the title → false
 * 2. Role match: any significant token from any targetRole appears in title → true
 * 3. Skill fallback: any requiredSkill appears in title → true
 *    (catches titles like "React Developer" for a "Frontend Engineer" seeker)
 * 4. No criteria at all → true (let everything through until profile is configured)
 */
export function jobMatchesProfile(
  job: { title: string },
  profile: {
    targetRoles: string[];
    requiredSkills: string[];
    excludedKeywords: string[];
  },
): boolean {
  const title = job.title.toLowerCase();

  // Hard exclude — no AI call needed
  if (profile.excludedKeywords.some((kw) => title.includes(kw.toLowerCase()))) {
    return false;
  }

  // No criteria configured → let everything through
  if (profile.targetRoles.length === 0 && profile.requiredSkills.length === 0) {
    return true;
  }

  // Role match: strip stopwords, match any remaining token against title
  const roleMatch = profile.targetRoles.some((role) => {
    const tokens = role
      .toLowerCase()
      .split(/[\s/\-&]+/)
      .filter((t) => t.length > 1 && !ROLE_STOPWORDS.has(t));
    // If all tokens were stopwords (e.g. "Senior Engineer"), fall back to full phrase
    const candidates = tokens.length > 0 ? tokens : [role.toLowerCase()];
    return candidates.some((token) => title.includes(token));
  });
  if (roleMatch) return true;

  // Skill fallback
  return profile.requiredSkills.some((skill) =>
    title.includes(skill.toLowerCase()),
  );
}
