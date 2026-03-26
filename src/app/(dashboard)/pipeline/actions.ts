"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  updateApplicationStatusSchema,
  updateApplicationDetailSchema,
} from "@/lib/validations";
import { TERMINAL_STATUSES_ARRAY } from "@/lib/pipeline-constants";
import { requireProfile } from "@/lib/auth-helpers";

export async function updateApplicationStatus(
  applicationId: string,
  status: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const application = await prisma.application.findFirst({
    where: { id: applicationId, profile: { userId } },
    select: { id: true, jobId: true, appliedAt: true },
  });
  if (!application) throw new Error("Application not found");

  const parsed = updateApplicationStatusSchema.safeParse({ applicationId, status });
  if (!parsed.success) throw new Error("Invalid status");

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: parsed.data.status,
        statusUpdatedAt: new Date(),
        // Auto-set appliedAt when first transitioning to APPLIED
        ...(parsed.data.status === "APPLIED" && !application.appliedAt
          ? { appliedAt: new Date() }
          : {}),
      },
    });

    // Archive the job from the feed when moving to APPLIED
    if (parsed.data.status === "APPLIED") {
      await tx.job.updateMany({
        where: {
          id: application.jobId,
          feedStatus: { in: ["NEW", "SAVED"] },
        },
        data: { feedStatus: "ARCHIVED" },
      });
    }
  });

  revalidatePath("/pipeline");
  revalidateTag("dashboard-stats");
}

export async function updateApplicationDetail(
  applicationId: string,
  fields: {
    notes?: string;
    appliedAt?: string | null;
    followUpAt?: string | null;
    recruiterName?: string | null;
    recruiterEmail?: string | null;
  }
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const application = await prisma.application.findFirst({
    where: { id: applicationId, profile: { userId } },
    select: { id: true },
  });
  if (!application) throw new Error("Application not found");

  const parsed = updateApplicationDetailSchema.safeParse({
    applicationId,
    ...fields,
  });
  if (!parsed.success) throw new Error("Invalid input");

  const data: Record<string, unknown> = {};
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;
  if (parsed.data.appliedAt !== undefined) {
    data.appliedAt = parsed.data.appliedAt
      ? new Date(parsed.data.appliedAt + "T00:00:00.000Z")
      : null;
  }
  if (parsed.data.followUpAt !== undefined) {
    data.followUpAt = parsed.data.followUpAt
      ? new Date(parsed.data.followUpAt + "T00:00:00.000Z")
      : null;
  }
  if (parsed.data.recruiterName !== undefined)
    data.recruiterName = parsed.data.recruiterName;
  if (parsed.data.recruiterEmail !== undefined)
    data.recruiterEmail = parsed.data.recruiterEmail;

  await prisma.application.update({ where: { id: applicationId }, data });

  // Bust the cached follow-up count when followUpAt changes
  if (parsed.data.followUpAt !== undefined) {
    revalidateTag("follow-up-count");
  }
  // No revalidatePath — auto-save should not trigger a full page re-render.
}

export async function createApplication(
  jobId: string,
  profileId: string
): Promise<string> {
  await requireProfile(profileId);

  // Verify the job belongs to this profile before creating an application
  const job = await prisma.job.findFirst({
    where: { id: jobId, profileId },
    select: { id: true },
  });
  if (!job) throw new Error("Job not found");

  const application = await prisma.application.upsert({
    where: { jobId },
    create: { jobId, profileId, status: "INTERESTED", statusUpdatedAt: new Date() },
    update: {},
    select: { id: true },
  });

  revalidatePath("/pipeline");
  return application.id;
}

/**
 * Remove applications from the pipeline and hide their jobs so they
 * won't be re-matched by the scrape pipeline. Deletes the Application
 * row and sets the underlying Job to feedStatus HIDDEN.
 */
export async function bulkRemoveApplications(
  applicationIds: string[],
): Promise<number> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (applicationIds.length === 0) return 0;

  // Verify all applications belong to this user and collect their jobIds
  const apps = await prisma.application.findMany({
    where: { id: { in: applicationIds }, profile: { userId } },
    select: { id: true, jobId: true },
  });

  if (apps.length === 0) return 0;

  const jobIds = apps.map((a) => a.jobId);

  // Delete applications and hide jobs in a transaction
  await prisma.$transaction([
    prisma.application.deleteMany({
      where: { id: { in: apps.map((a) => a.id) } },
    }),
    prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: { feedStatus: "HIDDEN" },
    }),
  ]);

  revalidatePath("/pipeline");
  revalidateTag("dashboard-stats");
  return apps.length;
}

/**
 * Returns the count of applications with a follow-up date due today or earlier,
 * across all non-terminal applications for this user.
 * Called from the layout server component for the nav badge.
 */
export async function getFollowUpCount(userId: string): Promise<number> {
  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);

  return prisma.application.count({
    where: {
      profile: { userId },
      followUpAt: { lte: endOfToday },
      status: {
        notIn: TERMINAL_STATUSES_ARRAY,
      },
    },
  });
}
