import type { Job, Application } from "@prisma/client";

/**
 * A job from the feed query — includes only the application status.
 * The feed needs to know whether a job has moved past INTERESTED (Applied filter).
 */
export type JobWithApplication = Job & {
  application: Pick<Application, "status"> | null;
};
