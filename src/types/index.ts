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
