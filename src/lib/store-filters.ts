import type { ApplicationStatus } from "@prisma/client";
import type { JobWithApplication, ApplicationWithJob } from "@/types";
import { TERMINAL_STATUSES } from "@/lib/pipeline-constants";

export type Stats = {
  allCount: number;
  newCount: number;
  savedCount: number;
  appliedCount: number;
  ignoredCount: number;
  avgScore: number | null;
};

/**
 * Client-side equivalent of buildWhereClause from @/lib/jobs.
 * Operates on an in-memory array instead of building a Prisma query.
 */
export function filterJobs(
  jobs: JobWithApplication[],
  filter: string,
): JobWithApplication[] {
  switch (filter) {
    case "new":
      return jobs.filter((j) => j.feedStatus === "NEW");
    case "saved":
      return jobs.filter((j) => j.feedStatus === "SAVED");
    case "applied":
      // Applied jobs may have feedStatus ARCHIVED (set when transitioning to APPLIED),
      // so only exclude HIDDEN here — not ARCHIVED.
      return jobs.filter(
        (j) =>
          j.feedStatus !== "HIDDEN" &&
          j.application !== null &&
          j.application.status !== "INTERESTED",
      );
    case "ignored":
      return jobs.filter((j) => j.feedStatus === "ARCHIVED");
    default:
      // "all": exclude HIDDEN and ARCHIVED
      return jobs.filter(
        (j) => j.feedStatus !== "HIDDEN" && j.feedStatus !== "ARCHIVED",
      );
  }
}

/**
 * Client-side equivalent of buildOrderBy from @/lib/jobs.
 * Sorts an array in place and returns it.
 */
export function sortJobs(
  jobs: JobWithApplication[],
  sort: string,
  dir: string,
): JobWithApplication[] {
  const sorted = [...jobs];
  const ascending = dir === "asc";

  switch (sort) {
    case "newest":
      sorted.sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return ascending ? ta - tb : tb - ta;
      });
      break;

    case "salary":
      sorted.sort((a, b) => {
        const sa = a.jobPool.salaryMax;
        const sb = b.jobPool.salaryMax;
        // Nulls last regardless of direction
        if (sa == null && sb == null) return 0;
        if (sa == null) return 1;
        if (sb == null) return -1;
        return ascending ? sa - sb : sb - sa;
      });
      break;

    case "source":
      sorted.sort((a, b) => {
        const cmp = a.jobPool.source.localeCompare(b.jobPool.source);
        return ascending ? cmp : -cmp;
      });
      break;

    default:
      // "match" — always descending, direction parameter ignored
      sorted.sort((a, b) => {
        const sa = a.aiScore;
        const sb = b.aiScore;
        // Nulls last
        if (sa == null && sb == null) return 0;
        if (sa == null) return 1;
        if (sb == null) return -1;
        return sb - sa;
      });
      break;
  }

  return sorted;
}

/**
 * Compute dashboard stats from the full jobs array.
 */
export function computeStats(jobs: JobWithApplication[]): Stats {
  let allCount = 0;
  let newCount = 0;
  let savedCount = 0;
  let appliedCount = 0;
  let ignoredCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const job of jobs) {
    if (job.feedStatus === "HIDDEN") continue;

    if (job.feedStatus === "ARCHIVED") {
      ignoredCount++;
      // Also count archived jobs with non-INTERESTED applications as applied
      if (
        job.application !== null &&
        job.application.status !== "INTERESTED"
      ) {
        appliedCount++;
      }
      continue;
    }

    // Not HIDDEN, not ARCHIVED — counts toward "all"
    allCount++;

    if (job.feedStatus === "NEW") newCount++;
    if (job.feedStatus === "SAVED") savedCount++;

    // Applied count from non-archived jobs too
    if (
      job.application !== null &&
      job.application.status !== "INTERESTED"
    ) {
      appliedCount++;
    }

    if (job.aiScore != null) {
      scoreSum += job.aiScore;
      scoreCount++;
    }
  }

  return {
    allCount,
    newCount,
    savedCount,
    appliedCount,
    ignoredCount,
    avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
  };
}

/**
 * Sort applications for the pipeline view.
 */
export function sortApplications(
  apps: ApplicationWithJob[],
  sort: string,
  dir: string,
): ApplicationWithJob[] {
  const sorted = [...apps];
  const ascending = dir === "asc";

  switch (sort) {
    case "status":
      sorted.sort((a, b) => {
        const cmp = a.status.localeCompare(b.status);
        return ascending ? cmp : -cmp;
      });
      break;

    case "applied":
      sorted.sort((a, b) => {
        const ta = a.appliedAt ? new Date(a.appliedAt).getTime() : null;
        const tb = b.appliedAt ? new Date(b.appliedAt).getTime() : null;
        // Nulls last
        if (ta == null && tb == null) return 0;
        if (ta == null) return 1;
        if (tb == null) return -1;
        return ascending ? ta - tb : tb - ta;
      });
      break;

    case "score":
      sorted.sort((a, b) => {
        const sa = a.job.aiScore;
        const sb = b.job.aiScore;
        // Nulls last
        if (sa == null && sb == null) return 0;
        if (sa == null) return 1;
        if (sb == null) return -1;
        return ascending ? sa - sb : sb - sa;
      });
      break;

    default:
      // "updated" — by updatedAt
      sorted.sort((a, b) => {
        const ta = new Date(a.updatedAt).getTime();
        const tb = new Date(b.updatedAt).getTime();
        return ascending ? ta - tb : tb - ta;
      });
      break;
  }

  return sorted;
}

/**
 * Check if an application status is terminal (closed).
 */
export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status as ApplicationStatus);
}
