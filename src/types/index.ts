import { Prisma } from "@prisma/client";
import type { Application } from "@prisma/client";

/**
 * A job from the feed query — includes the pool entry (content) and application status.
 */
export type JobWithApplication = Prisma.JobGetPayload<{
  include: {
    jobPool: true;
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
 * A full application with its job and pool fields — used by the pipeline table and drawer.
 */
export type ApplicationWithJob = Prisma.ApplicationGetPayload<{
  include: {
    job: {
      include: { jobPool: true };
    };
  };
}>;

// Re-export Application for convenience
export type { Application };
