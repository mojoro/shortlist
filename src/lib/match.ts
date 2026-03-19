// Generic words that appear in almost every job title and carry no role-specific signal.
// When building match tokens from a target role, these are stripped so we only match
// on the meaningful part (e.g. "Frontend Engineer" → ["frontend"]).
// "software" is included because it appears in virtually every tech job title and
// would cause "Software Engineer" to match sales/support/management roles via the
// single token "software". The full phrase "software engineer" is used as fallback instead.
const ROLE_STOPWORDS = new Set([
  "engineer", "developer", "manager", "lead", "senior", "junior",
  "head", "principal", "staff", "associate", "mid", "and", "the",
  "of", "&", "/", "specialist", "expert", "architect", "software",
]);

// Words in a job location string that indicate the job is remote-friendly.
const REMOTE_SIGNALS = ["remote", "anywhere", "worldwide", "distributed"];

/**
 * Returns true if the job should be included in this profile's candidate set.
 *
 * Matching rules:
 * 1. Hard exclude: any excludedKeyword appears in the title → false
 * 2. Location filter: if targetLocations is set and remotePreference is not REMOTE_ONLY,
 *    exclude jobs whose location doesn't match any target location and isn't remote
 * 3. Role match: any significant token from any targetRole appears in title → true
 *    (all tokens are stopwords → fall back to full-phrase match)
 * 4. Skill fallback: any requiredSkill appears in title → true
 * 5. No criteria at all → true (let everything through until profile is configured)
 */
export function jobMatchesProfile(
  job: { title: string; location: string | null },
  profile: {
    targetRoles: string[];
    requiredSkills: string[];
    excludedKeywords: string[];
    targetLocations: string[];
    remotePreference: string;
  },
): boolean {
  const title = job.title.toLowerCase();

  // 1. Hard exclude
  if (profile.excludedKeywords.some((kw) => title.includes(kw.toLowerCase()))) {
    return false;
  }

  // 2. Location filter — only applied when the profile specifies target locations
  if (profile.targetLocations.length > 0) {
    const loc = (job.location ?? "").toLowerCase();
    const isRemoteFriendly = REMOTE_SIGNALS.some((s) => loc.includes(s));
    const matchesTargetLocation = profile.targetLocations.some((t) =>
      loc.includes(t.toLowerCase()),
    );

    // REMOTE_ONLY profiles: only accept remote-signalled locations
    if (profile.remotePreference === "REMOTE_ONLY") {
      if (!isRemoteFriendly) return false;
    } else {
      // Otherwise: must match a target location OR be remote-friendly
      if (!matchesTargetLocation && !isRemoteFriendly) return false;
    }
  }

  // No role/skill criteria → let everything through
  if (profile.targetRoles.length === 0 && profile.requiredSkills.length === 0) {
    return true;
  }

  // 3. Role match: strip stopwords, match remaining tokens against title
  const roleMatch = profile.targetRoles.some((role) => {
    const tokens = role
      .toLowerCase()
      .split(/[\s/\-&]+/)
      .filter((t) => t.length > 1 && !ROLE_STOPWORDS.has(t));
    // All tokens were stopwords → fall back to exact phrase match
    const candidates = tokens.length > 0 ? tokens : [role.toLowerCase()];
    return candidates.some((token) => title.includes(token));
  });
  if (roleMatch) return true;

  // 4. Skill fallback: catches "React Developer" for a "Frontend Engineer" seeker
  return profile.requiredSkills.some((skill) =>
    title.includes(skill.toLowerCase()),
  );
}
