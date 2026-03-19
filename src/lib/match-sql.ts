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

const MAX_CANDIDATES_PER_RUN = 30;

/**
 * Build ILIKE patterns from a target role string, stripping stopwords.
 */
function roleToPatterns(role: string): string[] {
  const tokens = role
    .toLowerCase()
    .split(/[\s/\-&]+/)
    .filter((t) => t.length > 1 && !ROLE_STOPWORDS.has(t));

  if (tokens.length > 0) {
    return tokens.map((t) => `%${t}%`);
  }
  return [`%${role.toLowerCase()}%`];
}

type ProfileCriteria = {
  targetRoles: string[];
  requiredSkills: string[];
  excludedKeywords: string[];
  targetLocations: string[];
  remotePreference: string;
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

  // 2. Location filter
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

  // 3 + 4. Role match OR skill fallback
  const hasRoles = profile.targetRoles.length > 0;
  const hasSkills = profile.requiredSkills.length > 0;

  if (hasRoles || hasSkills) {
    const titleConditions: Prisma.Sql[] = [];

    if (hasRoles) {
      const rolePatterns = profile.targetRoles.flatMap(roleToPatterns);
      titleConditions.push(Prisma.sql`
        LOWER(jp.title) LIKE ANY(${rolePatterns})
      `);
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

  const result = await prisma.$queryRaw<{ id: string }[]>`
    SELECT jp.id
    FROM job_pool jp
    ${whereClause}
    ORDER BY jp."postedAt" DESC NULLS LAST
    LIMIT ${MAX_CANDIDATES_PER_RUN}
  `;

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
