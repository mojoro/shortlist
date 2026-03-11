"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildWhereClause } from "@/lib/jobs";
import type { JobWithApplication } from "@/types";

export async function getMoreJobs(
  profileId: string,
  cursor: string,
  filter: string
): Promise<{ jobs: JobWithApplication[]; nextCursor: string | null }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the profileId belongs to the authenticated user
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const jobs = await prisma.job.findMany({
    where: buildWhereClause(profileId, filter),
    include: { application: { select: { status: true } } },
    orderBy: { aiScore: { sort: "desc", nulls: "last" } },
    take: 25,
    cursor: { id: cursor },
    skip: 1,
  });

  return {
    jobs: jobs as unknown as JobWithApplication[],
    nextCursor: jobs.length === 25 ? jobs[jobs.length - 1].id : null,
  };
}

export async function toggleSaveJob(
  jobId: string,
  profileId: string,
  save: boolean
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.update({
    where: { id: jobId },
    data: { feedStatus: save ? "SAVED" : "NEW" },
  });
  revalidatePath("/dashboard");
}

export async function ignoreJob(
  jobId: string,
  profileId: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.update({
    where: { id: jobId },
    data: { feedStatus: "ARCHIVED" },
  });
  revalidatePath("/dashboard");
}
