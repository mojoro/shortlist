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
        const prev = get().jobs;
        set({
          jobs: updateJob(prev, jobId, (j) => ({
            ...j,
            feedStatus: save ? "SAVED" : "NEW",
          })),
        });

        serverToggleSave(jobId, profileId, save).catch(() => {
          set({ jobs: prev });
        });
      },

      ignoreJob(jobId, profileId) {
        const prev = get().jobs;
        set({
          jobs: updateJob(prev, jobId, (j) => ({
            ...j,
            feedStatus: "ARCHIVED",
          })),
        });

        serverIgnore(jobId, profileId).catch(() => {
          set({ jobs: prev });
        });
      },

      unignoreJob(jobId, profileId, restoreStatus) {
        const prev = get().jobs;
        const feedStatus =
          restoreStatus === "SAVED" ? ("SAVED" as const) : ("NEW" as const);

        set({
          jobs: updateJob(prev, jobId, (j) => ({ ...j, feedStatus })),
        });

        serverUnignore(jobId, profileId, restoreStatus).catch(() => {
          set({ jobs: prev });
        });
      },

      batchIgnoreJobs(jobIds, profileId) {
        const prev = get().jobs;
        const idSet = new Set(jobIds);
        set({
          jobs: prev.map((j) =>
            idSet.has(j.id) ? { ...j, feedStatus: "ARCHIVED" as const } : j,
          ),
        });

        serverBatchIgnore(jobIds, profileId).catch(() => {
          set({ jobs: prev });
        });
      },

      batchSaveJobs(jobIds, profileId, save) {
        const prev = get().jobs;
        const idSet = new Set(jobIds);
        const feedStatus = save ? ("SAVED" as const) : ("NEW" as const);
        set({
          jobs: prev.map((j) => (idSet.has(j.id) ? { ...j, feedStatus } : j)),
        });

        serverBatchSave(jobIds, profileId, save).catch(() => {
          set({ jobs: prev });
        });
      },

      updateJobAiFields(jobId, fields) {
        set({
          jobs: updateJob(get().jobs, jobId, (j) => ({
            ...j,
            aiScore: fields.score,
            aiStatus: fields.status as JobWithApplication["aiStatus"],
            aiSummary: fields.summary,
            aiMatchPoints: fields.matchPoints,
            aiGapPoints: fields.gapPoints,
            aiAnalyzedAt: new Date(),
            ...(fields.hidden ? { feedStatus: "HIDDEN" as const } : {}),
          })),
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
        const prev = get().jobs;
        set({
          jobs: updateJob(prev, jobId, (j) => ({
            ...j,
            userNotes: notes.trim() || null,
          })),
        });

        const profileId = get().activeProfile?.id;
        if (!profileId) return;

        serverUpdateNotes(jobId, profileId, notes).catch(() => {
          set({ jobs: prev });
        });
      },

      // ------------------------------------------------------------------
      // Application mutations — optimistic update, then fire server action
      // ------------------------------------------------------------------
      updateAppStatus(appId, status) {
        const prev = get().applications;
        set({
          applications: updateApp(prev, appId, (a) => ({
            ...a,
            status: status as ApplicationWithJob["status"],
            statusUpdatedAt: new Date(),
            ...(status === "APPLIED" && !a.appliedAt
              ? { appliedAt: new Date() }
              : {}),
          })),
        });

        serverUpdateAppStatus(appId, status).catch(() => {
          set({ applications: prev });
        });
      },

      updateAppDetail(appId, fields) {
        const prev = get().applications;
        set({
          applications: updateApp(prev, appId, (a) => {
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

        serverUpdateAppDetail(appId, fields).catch(() => {
          set({ applications: prev });
        });
      },

      bulkRemoveApps(appIds) {
        const prevApps = get().applications;
        const prevJobs = get().jobs;
        const idSet = new Set(appIds);

        // Find the jobIds linked to these applications
        const jobIds = new Set(
          prevApps.filter((a) => idSet.has(a.id)).map((a) => a.jobId),
        );

        // Optimistic: remove apps and hide their jobs
        set({
          applications: prevApps.filter((a) => !idSet.has(a.id)),
          jobs: prevJobs.map((j) =>
            jobIds.has(j.id) ? { ...j, feedStatus: "HIDDEN" as const } : j,
          ),
        });

        serverBulkRemoveApps(appIds).catch(() => {
          set({ applications: prevApps, jobs: prevJobs });
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
        jobs: state.jobs.map((j) => ({
          ...j,
          jobPool: { ...j.jobPool, rawData: null },
        })),
        applications: state.applications,
        followUpCount: state.followUpCount,
        usage: state.usage,
        lastSyncedAt: state.lastSyncedAt,
        // hydrated / isSyncing intentionally excluded
      }),
    },
  ),
);

