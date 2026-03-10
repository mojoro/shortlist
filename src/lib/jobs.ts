import type { FeedStatus, ApplicationStatus, Prisma } from "@prisma/client";

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
  const base: Prisma.JobWhereInput = {
    profileId,
    feedStatus: { not: "HIDDEN" as FeedStatus },
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
