"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildWhereClause, buildOrderBy } from "@/lib/jobs";
import type { SortOption } from "@/lib/jobs";
import type { JobWithApplication } from "@/types";

export async function getMoreJobs(
  profileId: string,
  cursor: string,
  filter: string,
  sort: string,
): Promise<{ jobs: JobWithApplication[]; nextCursor: string | null }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the profileId belongs to the authenticated user
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const safeSort: SortOption = sort === "newest" ? "newest" : "match";

  const jobs = await prisma.job.findMany({
    where: buildWhereClause(profileId, filter),
    include: { jobPool: true, application: { select: { status: true } } },
    orderBy: buildOrderBy(safeSort),
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

  // When saving a job, ensure it appears in the pipeline at INTERESTED
  if (save) {
    await prisma.application.upsert({
      where:  { jobId },
      create: { jobId, profileId, status: "INTERESTED", statusUpdatedAt: new Date() },
      update: {}, // never downgrade an existing application
    });
    revalidatePath("/pipeline");
  }

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

export async function unignoreJob(
  jobId: string,
  profileId: string,
  restoreStatus: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const validStatuses = ["NEW", "SAVED"] as const;
  const feedStatus = (validStatuses as readonly string[]).includes(restoreStatus)
    ? (restoreStatus as "NEW" | "SAVED")
    : "NEW";

  await prisma.job.update({
    where: { id: jobId },
    data: { feedStatus },
  });
  revalidatePath("/dashboard");
}

export async function batchIgnoreJobs(
  jobIds: string[],
  profileId: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.updateMany({
    where: { id: { in: jobIds }, profileId },
    data: { feedStatus: "ARCHIVED" },
  });
  revalidatePath("/dashboard");
}

export async function batchSaveJobs(
  jobIds: string[],
  profileId: string,
  save: boolean
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.updateMany({
    where: { id: { in: jobIds }, profileId },
    data: { feedStatus: save ? "SAVED" : "NEW" },
  });
  revalidatePath("/dashboard");
}

export async function requestAnalysis(
  profileId: string,
): Promise<{ error?: "CREDITS" | "UNKNOWN" }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  try {
    // Derive the base URL from the current request host so this works correctly
    // in local dev, preview deployments, and production without relying on
    // NEXT_PUBLIC_APP_URL (which may point to a different deployment).
    const h = await headers();
    const host = h.get("host") ?? "";
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    const res = await fetch(`${proto}://${host}/api/analyze`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ profileId }),
    });
    if (res.status === 429) return { error: "CREDITS" };
    if (!res.ok)            return { error: "UNKNOWN" };
  } catch (err) {
    console.error("[requestAnalysis]", err);
    return { error: "UNKNOWN" };
  }

  return {};
}

export async function discardAnalysis(
  jobId: string,
  profileId: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const job = await prisma.job.findFirst({ where: { id: jobId, profileId } });
  if (!job) throw new Error("Job not found");

  await prisma.job.update({
    where: { id: jobId },
    data: {
      aiScore:       null,
      aiStatus:      null,
      aiSummary:     null,
      aiMatchPoints: [],
      aiGapPoints:   [],
      aiAnalyzedAt:  null,
      aiModel:       null,
      // Restore hidden jobs so they reappear after re-analysis
      ...(job.feedStatus === "HIDDEN" ? { feedStatus: "NEW" } : {}),
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
}

export async function updateJobNotes(
  jobId: string,
  profileId: string,
  notes: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.update({
    where: { id: jobId },
    data: { userNotes: notes.trim() || null },
  });
}
