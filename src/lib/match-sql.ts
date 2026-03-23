import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Stopwords stripped from target roles before generating ILIKE patterns.
 */
const ROLE_STOPWORDS = new Set([
  "engineer", "developer", "manager", "lead", "senior", "junior",
  "head", "principal", "staff", "associate", "mid", "and", "the",
  "of", "&", "/", "specialist", "expert", "architect", "software",
]);

const REMOTE_SIGNALS = ["remote", "anywhere", "worldwide", "distributed"];

const MAX_SQL_CANDIDATES = 500;

type RolePatternResult =
  | { patterns: string[]; regexFallback: null }
  | { patterns: string[]; regexFallback: string };

/**
 * Build ILIKE patterns from a target role string, stripping stopwords.
 * Always includes the full compound phrase. Discards tokens under 3 chars.
 * Returns a regex fallback pattern when all tokens were too short (e.g. "QA").
 */
function roleToPatterns(role: string): RolePatternResult {
  const lower = role.toLowerCase();

  // Always include the full compound phrase pattern
  const compoundPattern = `%${lower}%`;

  // Tokenize, strip stopwords, discard tokens under 3 chars
  const tokens = lower
    .split(/[\s/\-&]+/)
    .filter((t) => t.length >= 3 && !ROLE_STOPWORDS.has(t));

  if (tokens.length > 0) {
    // Normal case: compound phrase + individual token patterns
    const patterns = [compoundPattern, ...tokens.map((t) => `%${t}%`)];
    return { patterns, regexFallback: null };
  }

  // All tokens were discarded (all < 3 chars or all stopwords).
  // The compound phrase alone would be too broad for short roles like "QA".
  // Use a PostgreSQL word-boundary regex instead.
  return {
    patterns: [],
    regexFallback: `\\m${lower}\\M`,
  };
}

type ProfileCriteria = {
  targetRoles: string[];
  requiredSkills: string[];
  excludedKeywords: string[];
  targetLocations: string[];
  remotePreference: string;
  workEligibility: string[];
};

/**
 * Build the matching WHERE conditions as Prisma.Sql fragments.
 * Shared by both findMatchingPoolIds and findNonMatchingJobIds.
 * These conditions apply to the job_pool table aliased as `jp`.
 */
function buildMatchConditions(profile: ProfileCriteria): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  // 1. Hard exclude — any excluded keyword in title
  if (profile.excludedKeywords.length > 0) {
    const excludePatterns = profile.excludedKeywords.map(
      (kw) => `%${kw.toLowerCase()}%`,
    );
    conditions.push(Prisma.sql`
      NOT (LOWER(jp.title) LIKE ANY(${excludePatterns}))
    `);
  }

  // 2. Eligibility — pass jobs with unknown country; reject known-ineligible
  if (profile.workEligibility.length > 0) {
    conditions.push(Prisma.sql`
      (jp.country IS NULL OR jp.country = ANY(${profile.workEligibility}))
    `);
  }

  // 3. Location filter
  if (profile.targetLocations.length > 0) {
    const locationPatterns = profile.targetLocations.map(
      (loc) => `%${loc.toLowerCase()}%`,
    );
    const remotePatterns = REMOTE_SIGNALS.map((s) => `%${s}%`);

    if (profile.remotePreference === "REMOTE_ONLY") {
      conditions.push(Prisma.sql`
        LOWER(COALESCE(jp.location, '')) LIKE ANY(${remotePatterns})
      `);
    } else {
      conditions.push(Prisma.sql`
        (LOWER(COALESCE(jp.location, '')) LIKE ANY(${locationPatterns})
         OR LOWER(COALESCE(jp.location, '')) LIKE ANY(${remotePatterns}))
      `);
    }
  }

  // 4 + 5. Role match OR skill fallback
  const hasRoles = profile.targetRoles.length > 0;
  const hasSkills = profile.requiredSkills.length > 0;

  if (hasRoles || hasSkills) {
    const titleConditions: Prisma.Sql[] = [];

    if (hasRoles) {
      // Collect ILIKE patterns and regex fallbacks separately
      const allIlikePatterns: string[] = [];
      const regexPatterns: string[] = [];

      for (const role of profile.targetRoles) {
        const result = roleToPatterns(role);
        if (result.patterns.length > 0) {
          allIlikePatterns.push(...result.patterns);
        }
        if (result.regexFallback !== null) {
          regexPatterns.push(result.regexFallback);
        }
      }

      if (allIlikePatterns.length > 0) {
        titleConditions.push(Prisma.sql`
          LOWER(jp.title) LIKE ANY(${allIlikePatterns})
        `);
      }

      // Regex fallback for short-token roles (e.g. "QA", "IT") — word boundary match
      for (const pattern of regexPatterns) {
        titleConditions.push(Prisma.sql`
          jp.title ~* ${pattern}
        `);
      }
    }

    if (hasSkills) {
      const skillPatterns = profile.requiredSkills.map(
        (s) => `%${s.toLowerCase()}%`,
      );
      titleConditions.push(Prisma.sql`
        LOWER(jp.title) LIKE ANY(${skillPatterns})
      `);
    }

    conditions.push(
      Prisma.sql`(${Prisma.join(titleConditions, " OR ")})`,
    );
  }

  return conditions;
}

/**
 * Find pool entries that match a profile's criteria, excluding jobs
 * already linked to this profile. Returns only IDs.
 */
export async function findMatchingPoolIds(
  profileId: string,
  profile: ProfileCriteria,
): Promise<string[]> {
  const conditions = buildMatchConditions(profile);

  // Exclude jobs already matched to this profile
  conditions.unshift(Prisma.sql`
    jp.id NOT IN (
      SELECT j."jobPoolId" FROM jobs j WHERE j."profileId" = ${profileId}
    )
  `);

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  // Soft-rank: jobs with required skills in description come first
  const hasSkills = profile.requiredSkills.length > 0;

  let result: { id: string }[];

  if (hasSkills) {
    const skillPatterns = profile.requiredSkills.map(
      (s) => `%${s.toLowerCase()}%`,
    );
    result = await prisma.$queryRaw<{ id: string }[]>`
      SELECT jp.id
      FROM job_pool jp
      ${whereClause}
      ORDER BY
        CASE WHEN LOWER(jp.description) LIKE ANY(${skillPatterns}) THEN 0 ELSE 1 END,
        jp."postedAt" DESC NULLS LAST
      LIMIT ${MAX_SQL_CANDIDATES}
    `;
  } else {
    result = await prisma.$queryRaw<{ id: string }[]>`
      SELECT jp.id
      FROM job_pool jp
      ${whereClause}
      ORDER BY jp."postedAt" DESC NULLS LAST
      LIMIT ${MAX_SQL_CANDIDATES}
    `;
  }

  return result.map((r) => r.id);
}

/**
 * Find Job IDs in a profile's feed that NO LONGER match the profile's
 * criteria. Only considers NEW jobs with no application (safe to hide).
 * Used by rematch to clean up stale matches after criteria changes.
 */
export async function findStaleJobIds(
  profileId: string,
  profile: ProfileCriteria,
): Promise<string[]> {
  const matchConditions = buildMatchConditions(profile);

  // Build the positive match clause — jobs that DO match
  const matchWhere =
    matchConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(matchConditions, " AND ")}`
      : Prisma.empty;

  // Find NEW jobs with no application whose pool entry does NOT match
  const result = await prisma.$queryRaw<{ id: string }[]>`
    SELECT j.id
    FROM jobs j
    JOIN job_pool jp ON jp.id = j."jobPoolId"
    WHERE j."profileId" = ${profileId}
      AND j."feedStatus" = 'NEW'
      AND j.id NOT IN (SELECT "jobId" FROM applications WHERE "jobId" = j.id)
      AND jp.id NOT IN (
        SELECT jp2.id FROM job_pool jp2
        WHERE jp2.id = jp.id ${matchWhere}
      )
  `;

  return result.map((r) => r.id);
}

/**
 * Full rematch: hide stale jobs + add new matches. Returns counts.
 * All done in SQL — no pool data transferred over the network.
 */
export async function rematchProfileSql(
  profileId: string,
  profile: ProfileCriteria,
): Promise<{ removed: number; added: number }> {
  // Hide jobs that no longer match
  const staleIds = await findStaleJobIds(profileId, profile);
  let removed = 0;
  if (staleIds.length > 0) {
    const { count } = await prisma.job.updateMany({
      where: { id: { in: staleIds } },
      data: { feedStatus: "HIDDEN" },
    });
    removed = count;
  }

  // Add new matches from pool
  const newIds = await findMatchingPoolIds(profileId, profile);
  let added = 0;
  if (newIds.length > 0) {
    const { count } = await prisma.job.createMany({
      data: newIds.map((poolId) => ({
        profileId,
        jobPoolId: poolId,
        feedStatus: "NEW" as const,
      })),
      skipDuplicates: true,
    });
    added = count;
  }

  return { removed, added };
}
