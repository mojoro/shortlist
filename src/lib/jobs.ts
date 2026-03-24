import type { FeedStatus, ApplicationStatus, Prisma } from "@prisma/client";

export type SortOption = "match" | "newest" | "salary" | "source";
export type SortDir = "asc" | "desc";

export function buildOrderBy(
  sort: SortOption,
  dir: SortDir = "desc"
): Prisma.JobOrderByWithRelationInput {
  const order = dir;
  switch (sort) {
    case "newest":
      return { createdAt: order };
    case "salary":
      return { jobPool: { salaryMax: { sort: order, nulls: "last" } } };
    case "source":
      return { jobPool: { source: order } };
    default:
      // match score — always desc (higher is better), direction toggle ignored
      return { aiScore: { sort: "desc", nulls: "last" } };
  }
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
      // Applied jobs may have feedStatus ARCHIVED (set when transitioning to APPLIED),
      // so only exclude HIDDEN here — not ARCHIVED.
      return {
        profileId,
        feedStatus: { not: "HIDDEN" as FeedStatus },
        application: {
          status: { not: "INTERESTED" as ApplicationStatus },
        },
      };
    default:
      return base;
  }
}
