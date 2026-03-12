import type { Job, Application } from "@prisma/client";
import { Prisma } from "@prisma/client";

/**
 * A job from the feed query — includes only the application status.
 * The feed needs to know whether a job has moved past INTERESTED (Applied filter).
 */
export type JobWithApplication = Job & {
  application: Pick<Application, "status"> | null;
};

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
 * A full application with its job fields — used by the pipeline table and drawer.
 */
export type ApplicationWithJob = Prisma.ApplicationGetPayload<{
  include: {
    job: {
      select: {
        id: true;
        title: true;
        company: true;
        aiScore: true;
        url: true;
      };
    };
  };
}>;
