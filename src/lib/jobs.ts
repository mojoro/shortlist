import type { FeedStatus, ApplicationStatus, Prisma } from "@prisma/client";

export type SortOption = "match" | "newest";

export function buildOrderBy(sort: SortOption): Prisma.JobOrderByWithRelationInput {
  return sort === "newest"
    ? { createdAt: "desc" }
    : { aiScore: { sort: "desc", nulls: "last" } };
}

/**
 * Builds a Prisma `where` clause for the job feed.
 * All filters exclude HIDDEN jobs.
 * "applied" finds jobs with an Application whose status moved past INTERESTED.
 *
 * @param profileId - must already be verified as belonging to the authed user
 * @param filter - "all" | "new" | "saved" | "applied"
 */
export function buildWhereClause(
  profileId: string,
  filter: string
): Prisma.JobWhereInput {
  // "ignored" view shows only archived jobs — handle before base clause
  if (filter === "ignored") {
    return { profileId, feedStatus: "ARCHIVED" as FeedStatus };
  }

  // Default feed excludes both HIDDEN (auto-filtered) and ARCHIVED (user-dismissed)
  const base: Prisma.JobWhereInput = {
    profileId,
    feedStatus: { notIn: ["HIDDEN", "ARCHIVED"] as FeedStatus[] },
  };

  switch (filter) {
    case "new":
      return { ...base, feedStatus: "NEW" as FeedStatus };
    case "saved":
      return { ...base, feedStatus: "SAVED" as FeedStatus };
    case "applied":
      return {
        ...base,
        application: {
          status: { not: "INTERESTED" as ApplicationStatus },
        },
      };
    default:
      return base;
  }
}
