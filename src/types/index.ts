import { Prisma } from "@prisma/client";

/**
 * Fields selected from JobPool for dashboard/pipeline display.
 * Excludes heavy columns (description, rawData) that are only needed on the detail page.
 */
export const jobPoolSummarySelect = {
  id: true,
  title: true,
  company: true,
  location: true,
  locationType: true,
  url: true,
  source: true,
  postedAt: true,
  skills: true,
  salary: true,
  salaryMin: true,
  salaryMax: true,
  currency: true,
  jobType: true,
  country: true,
} satisfies Prisma.JobPoolSelect;

/**
 * A job from the feed query — includes pool summary (no description/rawData) and application status.
 */
export type JobWithApplication = Prisma.JobGetPayload<{
  include: {
    jobPool: { select: typeof jobPoolSummarySelect };
    application: { select: { status: true } };
  };
}>;

/**
 * Editable fields managed by PipelineTable and passed down to ApplicationDrawer.
 */
export type FieldOverrides = {
  notes:          string;
  appliedAt:      string; // "yyyy-MM-dd" or ""
  followUpAt:     string; // "yyyy-MM-dd" or ""
  recruiterName:  string;
  recruiterEmail: string;
};

/**
 * A full application with its job and pool summary — used by the pipeline table and drawer.
 */
export type ApplicationWithJob = Prisma.ApplicationGetPayload<{
  include: {
    job: {
      include: { jobPool: { select: typeof jobPoolSummarySelect } };
    };
  };
}>;
