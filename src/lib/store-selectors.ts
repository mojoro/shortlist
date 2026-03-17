import type { JobWithApplication, ApplicationWithJob } from "@/types";
import {
  filterJobs,
  sortJobs,
  computeStats,
  sortApplications,
  isTerminalStatus,
} from "@/lib/store-filters";
import type { Stats } from "@/lib/store-filters";
import type { DashboardState, DashboardActions } from "@/lib/store";

type Store = DashboardState & DashboardActions;

export type PipelineStats = {
  total: number;
  interested: number;
  applied: number;
  screening: number;
  interviewing: number;
  offer: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  ghosted: number;
};

/**
 * Derive dashboard stats from the full jobs list.
 */
export function selectStats(state: Store): Stats {
  return computeStats(state.jobs);
}

/**
 * Factory: returns a selector for filtered + sorted jobs.
 * Use with `useDashboardStore(makeFilteredJobsSelector("all", "match", "desc"))`.
 */
export function makeFilteredJobsSelector(
  filter: string,
  sort: string,
  dir: string,
): (state: Store) => JobWithApplication[] {
  return (state: Store) => {
    const filtered = filterJobs(state.jobs, filter);
    return sortJobs(filtered, sort, dir);
  };
}

/**
 * Factory: returns a selector for a single job by ID.
 */
export function makeJobByIdSelector(
  id: string,
): (state: Store) => JobWithApplication | null {
  return (state: Store) => state.jobs.find((j) => j.id === id) ?? null;
}

/**
 * Select active (non-terminal) applications.
 */
export function selectActiveApplications(
  state: Store,
): ApplicationWithJob[] {
  return state.applications.filter((a) => !isTerminalStatus(a.status));
}

/**
 * Select closed (terminal) applications.
 */
export function selectClosedApplications(
  state: Store,
): ApplicationWithJob[] {
  return state.applications.filter((a) => isTerminalStatus(a.status));
}

/**
 * Derive pipeline stats from all applications.
 */
export function selectPipelineStats(state: Store): PipelineStats {
  const stats: PipelineStats = {
    total: 0,
    interested: 0,
    applied: 0,
    screening: 0,
    interviewing: 0,
    offer: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    ghosted: 0,
  };

  for (const app of state.applications) {
    stats.total++;
    switch (app.status) {
      case "INTERESTED":
        stats.interested++;
        break;
      case "APPLIED":
        stats.applied++;
        break;
      case "SCREENING":
        stats.screening++;
        break;
      case "INTERVIEWING":
        stats.interviewing++;
        break;
      case "OFFER":
        stats.offer++;
        break;
      case "ACCEPTED":
        stats.accepted++;
        break;
      case "REJECTED":
        stats.rejected++;
        break;
      case "WITHDRAWN":
        stats.withdrawn++;
        break;
      case "GHOSTED":
        stats.ghosted++;
        break;
    }
  }

  return stats;
}

/**
 * Select applications with a follow-up due today or earlier (non-terminal only).
 */
export function selectFollowUpDue(state: Store): ApplicationWithJob[] {
  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);
  const cutoff = endOfToday.getTime();

  return state.applications.filter((a) => {
    if (isTerminalStatus(a.status)) return false;
    if (!a.followUpAt) return false;
    return new Date(a.followUpAt).getTime() <= cutoff;
  });
}

// Re-export for convenience
export type { Stats };
export { sortApplications };
