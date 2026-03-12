"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  updateApplicationStatusSchema,
  updateApplicationDetailSchema,
} from "@/lib/validations";

export async function updateApplicationStatus(
  applicationId: string,
  status: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const application = await prisma.application.findFirst({
    where: { id: applicationId, profile: { userId } },
    select: { id: true, appliedAt: true },
  });
  if (!application) throw new Error("Application not found");

  const parsed = updateApplicationStatusSchema.safeParse({ applicationId, status });
  if (!parsed.success) throw new Error("Invalid status");

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: parsed.data.status,
      statusUpdatedAt: new Date(),
    },
  });

  // Auto-set appliedAt when first transitioning to APPLIED
  if (parsed.data.status === "APPLIED" && !application.appliedAt) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { appliedAt: new Date() },
    });
  }

  revalidatePath("/pipeline");
}

export async function updateApplicationDetail(
  applicationId: string,
  fields: {
    notes?: string;
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
  // No revalidatePath — auto-save should not trigger a full page re-render.
}

export async function createApplication(
  jobId: string,
  profileId: string
): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: { id: true },
  });
  if (!profile) throw new Error("Profile not found");

  const application = await prisma.application.upsert({
    where: { jobId },
    create: { jobId, profileId, status: "INTERESTED" },
    update: {},
    select: { id: true },
  });

  revalidatePath("/pipeline");
  return application.id;
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
        notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED"],
      },
    },
  });
}
