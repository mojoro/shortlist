import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Profile } from "@prisma/client";
import type { JobWithApplication, ApplicationWithJob, FieldOverrides } from "@/types";
import {
  toggleSaveJob as serverToggleSave,
  ignoreJob as serverIgnore,
  unignoreJob as serverUnignore,
  batchIgnoreJobs as serverBatchIgnore,
  batchSaveJobs as serverBatchSave,
  updateJobNotes as serverUpdateNotes,
} from "@/app/(dashboard)/dashboard/actions";
import {
  updateApplicationStatus as serverUpdateAppStatus,
  updateApplicationDetail as serverUpdateAppDetail,
  bulkRemoveApplications as serverBulkRemoveApps,
} from "@/app/(dashboard)/pipeline/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfileSummary = {
  id: string;
  name: string;
  isActive: boolean;
};

export type UsageSummary = {
  currentMonthInputTokens: number;
  monthlyLimitInputTokens: number;
  analysisCallCount: number;
  tailorCallCount: number;
  currentMonthResetsAt: Date | null;
};

export type HydrationPayload = {
  userId: string;
  activeProfile: Profile | null;
  profiles: ProfileSummary[];
  jobs: JobWithApplication[];
  applications: ApplicationWithJob[];
  followUpCount: number;
  usage: UsageSummary | null;
  pendingMatchCount: number;
};

export interface DashboardState {
  // Data
  userId: string | null;
  activeProfile: Profile | null;
  profiles: ProfileSummary[];
  jobs: JobWithApplication[];
  applications: ApplicationWithJob[];
  followUpCount: number;
  usage: UsageSummary | null;
  pendingMatchCount: number;

  // Sync state
  hydrated: boolean;
  lastSyncedAt: number;
  isSyncing: boolean;
}

export interface DashboardActions {
  hydrate: (data: HydrationPayload) => void;
  sync: () => Promise<void>;

  // Job mutations
  toggleSaveJob: (jobId: string, profileId: string, save: boolean) => void;
  ignoreJob: (jobId: string, profileId: string) => void;
  unignoreJob: (jobId: string, profileId: string, restoreStatus: string) => void;
  batchIgnoreJobs: (jobIds: string[], profileId: string) => void;
  batchSaveJobs: (jobIds: string[], profileId: string, save: boolean) => void;
  updateJobAiFields: (
    jobId: string,
    fields: {
      score: number;
      status: string;
      summary: string;
      matchPoints: string[];
      gapPoints: string[];
      hidden: boolean;
    },
  ) => void;
  clearJobAiFields: (jobId: string) => void;
  updateJobNotes: (jobId: string, notes: string) => void;

  // Application mutations
  updateAppStatus: (appId: string, status: string) => void;
  updateAppDetail: (appId: string, fields: Partial<FieldOverrides>) => void;
  bulkRemoveApps: (appIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateJob(
  jobs: JobWithApplication[],
  jobId: string,
  updater: (job: JobWithApplication) => JobWithApplication,
): JobWithApplication[] {
  return jobs.map((j) => (j.id === jobId ? updater(j) : j));
}

function updateApp(
  apps: ApplicationWithJob[],
  appId: string,
  updater: (app: ApplicationWithJob) => ApplicationWithJob,
): ApplicationWithJob[] {
  return apps.map((a) => (a.id === appId ? updater(a) : a));
}

/**
 * Retry a server action with exponential backoff.
 * Returns the action result on success, or null if all retries exhausted.
 */
async function retryServerAction<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000,
): Promise<T | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, baseDelay * 2 ** attempt));
      } else {
        console.error("[store] Server action failed after retries:", err);
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  persist(
    (set, get) => ({
      // Initial state
      userId: null,
      activeProfile: null,
      profiles: [],
      jobs: [],
      applications: [],
      followUpCount: 0,
      usage: null,
      pendingMatchCount: 0,
      hydrated: false,
      lastSyncedAt: 0,
      isSyncing: false,

      // ------------------------------------------------------------------
      // Hydrate — called with server-fetched data
      // ------------------------------------------------------------------
      hydrate(data) {
        set({
          userId: data.userId,
          activeProfile: data.activeProfile,
          profiles: data.profiles,
          jobs: data.jobs,
          applications: data.applications,
          followUpCount: data.followUpCount,
          usage: data.usage,
          pendingMatchCount: data.pendingMatchCount,
          hydrated: true,
          lastSyncedAt: Date.now(),
        });
      },

      // ------------------------------------------------------------------
      // Sync — re-fetch all data from the server
      // ------------------------------------------------------------------
      async sync() {
        const { activeProfile } = get();
        if (!activeProfile) return;

        set({ isSyncing: true });
        try {
          const { fetchDashboardData } = await import(
            "@/app/(dashboard)/actions-sync"
          );
          const data = await fetchDashboardData();
          if (!data) return;
          set({
            jobs: data.jobs,
            applications: data.applications,
            followUpCount: data.followUpCount,
            usage: data.usage,
            pendingMatchCount: data.pendingMatchCount,
            lastSyncedAt: Date.now(),
          });
        } catch (err) {
          console.error("[store.sync]", err);
        } finally {
          set({ isSyncing: false });
        }
      },

      // ------------------------------------------------------------------
      // Job mutations — optimistic update, then fire server action
      // ------------------------------------------------------------------
      toggleSaveJob(jobId, profileId, save) {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return;
        const prevStatus = job.feedStatus;
        const hadApplication = get().applications.some((a) => a.jobId === jobId);

        // Optimistic: update feed status
        set({
          jobs: updateJob(get().jobs, jobId, (j) => ({
            ...j,
            feedStatus: save ? "SAVED" : "NEW",
          })),
        });

        // Optimistic: add application entry so pipeline updates immediately
        if (save && !hadApplication) {
          const now = new Date();
          set({
            applications: [
              ...get().applications,
              {
                id: `optimistic-${jobId}`,
                jobId,
                profileId,
                status: "INTERESTED",
                statusUpdatedAt: now,
                notes: null,
                appliedAt: null,
                followUpAt: null,
                recruiterName: null,
                recruiterEmail: null,
                interviewDates: [],
                offerReceivedAt: null,
                decisionAt: null,
                salaryOffered: null,
                exportedResumeMarkdown: null,
                exportedAt: null,
                createdAt: now,
                updatedAt: now,
                job: { ...job, application: { status: "INTERESTED" } },
              } as unknown as ApplicationWithJob,
            ],
          });
        }

        retryServerAction(() => serverToggleSave(jobId, profileId, save)).then(
          (result) => {
            if (!result) {
              set({
                jobs: updateJob(get().jobs, jobId, (j) => ({
                  ...j,
                  feedStatus: prevStatus,
                })),
              });
              if (save && !hadApplication) {
                set({
                  applications: get().applications.filter(
                    (a) => a.id !== `optimistic-${jobId}`,
                  ),
                });
              }
              return;
            }
            // Replace optimistic ID with real one from server
            if (result.applicationId) {
              set({
                applications: get().applications.map((a) =>
                  a.id === `optimistic-${jobId}`
                    ? { ...a, id: result.applicationId! }
                    : a,
                ),
              });
            }
          },
        );
      },

      ignoreJob(jobId, profileId) {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return;
        const prevStatus = job.feedStatus;

        set({
          jobs: updateJob(get().jobs, jobId, (j) => ({
            ...j,
            feedStatus: "ARCHIVED",
          })),
        });

        retryServerAction(() => serverIgnore(jobId, profileId)).then((result) => {
          if (result === null) {
            set({
              jobs: updateJob(get().jobs, jobId, (j) => ({
                ...j,
                feedStatus: prevStatus,
              })),
            });
          }
        });
      },

      unignoreJob(jobId, profileId, restoreStatus) {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return;
        const prevStatus = job.feedStatus;
        const feedStatus =
          restoreStatus === "SAVED" ? ("SAVED" as const) : ("NEW" as const);

        set({
          jobs: updateJob(get().jobs, jobId, (j) => ({ ...j, feedStatus })),
        });

        retryServerAction(() =>
          serverUnignore(jobId, profileId, restoreStatus),
        ).then((result) => {
          if (result === null) {
            set({
              jobs: updateJob(get().jobs, jobId, (j) => ({
                ...j,
                feedStatus: prevStatus,
              })),
            });
          }
        });
      },

      batchIgnoreJobs(jobIds, profileId) {
        const idSet = new Set(jobIds);
        const prevStatuses = new Map(
          get()
            .jobs.filter((j) => idSet.has(j.id))
            .map((j) => [j.id, j.feedStatus]),
        );

        set({
          jobs: get().jobs.map((j) =>
            idSet.has(j.id) ? { ...j, feedStatus: "ARCHIVED" as const } : j,
          ),
        });

        retryServerAction(() => serverBatchIgnore(jobIds, profileId)).then(
          (result) => {
            if (result === null) {
              set({
                jobs: get().jobs.map((j) => {
                  const prev = prevStatuses.get(j.id);
                  return prev !== undefined ? { ...j, feedStatus: prev } : j;
                }),
              });
            }
          },
        );
      },

      batchSaveJobs(jobIds, profileId, save) {
        const idSet = new Set(jobIds);
        const prevStatuses = new Map(
          get()
            .jobs.filter((j) => idSet.has(j.id))
            .map((j) => [j.id, j.feedStatus]),
        );
        const feedStatus = save ? ("SAVED" as const) : ("NEW" as const);

        set({
          jobs: get().jobs.map((j) =>
            idSet.has(j.id) ? { ...j, feedStatus } : j,
          ),
        });

        retryServerAction(() =>
          serverBatchSave(jobIds, profileId, save),
        ).then((result) => {
          if (result === null) {
            set({
              jobs: get().jobs.map((j) => {
                const prev = prevStatuses.get(j.id);
                return prev !== undefined ? { ...j, feedStatus: prev } : j;
              }),
            });
          }
        });
      },

      updateJobAiFields(jobId, fields) {
        const aiUpdate = {
          aiScore: fields.score,
          aiStatus: fields.status as JobWithApplication["aiStatus"],
          aiSummary: fields.summary,
          aiMatchPoints: fields.matchPoints,
          aiGapPoints: fields.gapPoints,
          aiAnalyzedAt: new Date(),
          ...(fields.hidden ? { feedStatus: "HIDDEN" as const } : {}),
        };
        set({
          jobs: updateJob(get().jobs, jobId, (j) => ({ ...j, ...aiUpdate })),
          // Also update the nested job inside applications so the pipeline
          // reflects the new score without needing a full sync
          applications: get().applications.map((a) =>
            a.jobId === jobId
              ? { ...a, job: { ...a.job, ...aiUpdate } }
              : a,
          ),
        });
      },

      clearJobAiFields(jobId) {
        set({
          jobs: updateJob(get().jobs, jobId, (j) => ({
            ...j,
            aiScore: null,
            aiStatus: null,
            aiSummary: null,
            aiMatchPoints: [],
            aiGapPoints: [],
            aiAnalyzedAt: null,
            aiModel: null,
            ...(j.feedStatus === "HIDDEN"
              ? { feedStatus: "NEW" as const }
              : {}),
          })),
        });
      },

      updateJobNotes(jobId, notes) {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return;
        const prevNotes = job.userNotes;

        set({
          jobs: updateJob(get().jobs, jobId, (j) => ({
            ...j,
            userNotes: notes.trim() || null,
          })),
        });

        const profileId = get().activeProfile?.id;
        if (!profileId) return;

        retryServerAction(() =>
          serverUpdateNotes(jobId, profileId, notes),
        ).then((result) => {
          if (result === null) {
            set({
              jobs: updateJob(get().jobs, jobId, (j) => ({
                ...j,
                userNotes: prevNotes,
              })),
            });
          }
        });
      },

      // ------------------------------------------------------------------
      // Application mutations — optimistic update, then fire server action
      // ------------------------------------------------------------------
      updateAppStatus(appId, status) {
        const app = get().applications.find((a) => a.id === appId);
        if (!app) return;
        const prevStatus = app.status;
        const prevUpdatedAt = app.statusUpdatedAt;
        const prevAppliedAt = app.appliedAt;

        // Capture jobId before optimistic update for feedStatus mirror
        const jobId = app.jobId;

        set({
          applications: updateApp(get().applications, appId, (a) => ({
            ...a,
            status: status as ApplicationWithJob["status"],
            statusUpdatedAt: new Date(),
            ...(status === "APPLIED" && !a.appliedAt
              ? { appliedAt: new Date() }
              : {}),
          })),
        });

        // Mirror server-side behavior: archive job from feed when APPLIED
        if (status === "APPLIED") {
          set({
            jobs: get().jobs.map((j) =>
              j.id === jobId && (j.feedStatus === "NEW" || j.feedStatus === "SAVED")
                ? { ...j, feedStatus: "ARCHIVED" as const }
                : j
            ),
          });
        }

        retryServerAction(() => serverUpdateAppStatus(appId, status)).then(
          (result) => {
            if (result === null) {
              set({
                applications: updateApp(get().applications, appId, (a) => ({
                  ...a,
                  status: prevStatus,
                  statusUpdatedAt: prevUpdatedAt,
                  appliedAt: prevAppliedAt,
                })),
              });
              // Revert the feed status change on failure
              if (status === "APPLIED") {
                const job = get().jobs.find((j) => j.id === jobId);
                if (job && job.feedStatus === "ARCHIVED") {
                  set({
                    jobs: updateJob(get().jobs, jobId, (j) => ({
                      ...j,
                      feedStatus: "NEW" as const,
                    })),
                  });
                }
              }
            }
          },
        );
      },

      updateAppDetail(appId, fields) {
        const app = get().applications.find((a) => a.id === appId);
        if (!app) return;
        const prevSnapshot = {
          notes: app.notes,
          appliedAt: app.appliedAt,
          followUpAt: app.followUpAt,
          recruiterName: app.recruiterName,
          recruiterEmail: app.recruiterEmail,
        };

        set({
          applications: updateApp(get().applications, appId, (a) => {
            const updated = { ...a };
            if (fields.notes !== undefined) updated.notes = fields.notes || null;
            if (fields.appliedAt !== undefined) {
              updated.appliedAt = fields.appliedAt
                ? new Date(fields.appliedAt + "T00:00:00.000Z")
                : null;
            }
            if (fields.followUpAt !== undefined) {
              updated.followUpAt = fields.followUpAt
                ? new Date(fields.followUpAt + "T00:00:00.000Z")
                : null;
            }
            if (fields.recruiterName !== undefined) {
              updated.recruiterName = fields.recruiterName;
            }
            if (fields.recruiterEmail !== undefined) {
              updated.recruiterEmail = fields.recruiterEmail;
            }
            return updated;
          }),
        });

        retryServerAction(() => serverUpdateAppDetail(appId, fields)).then(
          (result) => {
            if (result === null) {
              set({
                applications: updateApp(get().applications, appId, (a) => ({
                  ...a,
                  ...prevSnapshot,
                })),
              });
            }
          },
        );
      },

      bulkRemoveApps(appIds) {
        const idSet = new Set(appIds);
        const removedApps = get().applications.filter((a) => idSet.has(a.id));
        const jobIds = new Set(removedApps.map((a) => a.jobId));
        const prevJobStatuses = new Map(
          get()
            .jobs.filter((j) => jobIds.has(j.id))
            .map((j) => [j.id, j.feedStatus]),
        );

        // Optimistic: remove apps and hide their jobs
        set({
          applications: get().applications.filter((a) => !idSet.has(a.id)),
          jobs: get().jobs.map((j) =>
            jobIds.has(j.id) ? { ...j, feedStatus: "HIDDEN" as const } : j,
          ),
        });

        retryServerAction(() => serverBulkRemoveApps(appIds)).then((result) => {
          if (result === null) {
            set({
              applications: [...get().applications, ...removedApps],
              jobs: get().jobs.map((j) => {
                const prev = prevJobStatuses.get(j.id);
                return prev !== undefined ? { ...j, feedStatus: prev } : j;
              }),
            });
          }
        });
      },
    }),
    {
      name: "shortlist-dashboard",
      // Don't auto-rehydrate on module load — DashboardDataProvider
      // controls when to rehydrate (after verifying userId matches)
      skipHydration: true,
      storage: createJSONStorage(() => {
        // Safe in SSR: return a no-op storage on the server
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      // Exclude rawData (scraped HTML, can be 10s of KB per job)
      // and non-serialisable sync flags — everything else persists
      partialize: (state) => ({
        userId: state.userId,
        activeProfile: state.activeProfile,
        profiles: state.profiles,
        jobs: state.jobs,
        applications: state.applications,
        followUpCount: state.followUpCount,
        usage: state.usage,
        pendingMatchCount: state.pendingMatchCount,
        lastSyncedAt: state.lastSyncedAt,
        // hydrated / isSyncing intentionally excluded
      }),
    },
  ),
);

