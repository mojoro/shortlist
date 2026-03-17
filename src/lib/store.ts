import { create } from "zustand";
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
} from "@/app/(dashboard)/pipeline/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfileSummary = {
  id: string;
  name: string;
  isActive: boolean;
};

export type HydrationPayload = {
  userId: string;
  activeProfile: Profile | null;
  profiles: ProfileSummary[];
  jobs: JobWithApplication[];
  applications: ApplicationWithJob[];
  followUpCount: number;
};

export interface DashboardState {
  // Data
  userId: string | null;
  activeProfile: Profile | null;
  profiles: ProfileSummary[];
  jobs: JobWithApplication[];
  applications: ApplicationWithJob[];
  followUpCount: number;

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
  (set, get) => ({
    // Initial state
    userId: null,
    activeProfile: null,
    profiles: [],
    jobs: [],
    applications: [],
    followUpCount: 0,
    hydrated: false,
    lastSyncedAt: 0,
    isSyncing: false,

    // ------------------------------------------------------------------
    // Hydrate — called once from the layout with server-fetched data
    // ------------------------------------------------------------------
    hydrate(data) {
      set({
        userId: data.userId,
        activeProfile: data.activeProfile,
        profiles: data.profiles,
        jobs: data.jobs,
        applications: data.applications,
        followUpCount: data.followUpCount,
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
        const data = await fetchDashboardData(activeProfile.id);
        set({
          jobs: data.jobs,
          applications: data.applications,
          followUpCount: data.followUpCount,
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
      // No server action — caller (analyzeJob action) already persisted
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
      // No server action — caller (discardAnalysis action) already persisted
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
  }),
);

/**
 * Non-React access to the store — same reference, works outside components.
 * Use `getDashboardStore.getState()` to read, `.subscribe()` to listen.
 */
export const getDashboardStore = useDashboardStore;
