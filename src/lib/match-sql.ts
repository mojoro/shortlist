import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Stopwords stripped from target roles before generating ILIKE patterns.
 * Must stay in sync with the original match.ts list.
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
 * "Frontend Engineer" → ["%frontend%"]
 * "Software Engineer" → ["%software engineer%"] (all tokens were stopwords → full phrase)
 */
function roleToPatterns(role: string): string[] {
  const tokens = role
    .toLowerCase()
    .split(/[\s/\-&]+/)
    .filter((t) => t.length > 1 && !ROLE_STOPWORDS.has(t));

  if (tokens.length > 0) {
    return tokens.map((t) => `%${t}%`);
  }
  // All tokens were stopwords — use the full phrase
  return [`%${role.toLowerCase()}%`];
}

/**
 * Matches jobs in the pool against a profile entirely in SQL.
 * Returns only the IDs of matched JobPool entries — no full rows transferred.
 *
 * Replicates the logic from match.ts:
 * 1. Exclude jobs already linked to this profile
 * 2. Hard exclude by excluded keywords in title
 * 3. Location filter (target locations OR remote signals)
 * 4. Role token match in title
 * 5. Skill fallback in title
 * 6. No criteria → everything passes
 */
export async function findMatchingPoolIds(
  profileId: string,
  profile: {
    targetRoles: string[];
    requiredSkills: string[];
    excludedKeywords: string[];
    targetLocations: string[];
    remotePreference: string;
  },
): Promise<string[]> {
  // Build the WHERE clauses dynamically based on profile criteria
  const conditions: Prisma.Sql[] = [];

  // Only consider recent pool entries (last 2000 by posted date)
  // and exclude jobs already matched to this profile
  conditions.push(Prisma.sql`
    jp.id NOT IN (
      SELECT j."jobPoolId" FROM jobs j WHERE j."profileId" = ${profileId}
    )
  `);

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
      // Only accept remote-signalled locations
      conditions.push(Prisma.sql`
        LOWER(COALESCE(jp.location, '')) LIKE ANY(${remotePatterns})
      `);
    } else {
      // Must match a target location OR be remote-friendly
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

    // Role OR skill must match
    conditions.push(
      Prisma.sql`(${Prisma.join(titleConditions, " OR ")})`,
    );
  }
  // If no roles and no skills → no title filter (everything passes)

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
