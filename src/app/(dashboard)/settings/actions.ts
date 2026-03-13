"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { jobMatchesProfile, MAX_CANDIDATES_PER_RUN } from "@/lib/match";
import {
  updateProfileInfoSchema,
  updateSearchCriteriaSchema,
  updateResumeSchema,
  createProfileSchema,
  switchProfileSchema,
} from "@/lib/validations";

// ─── Profile info ────────────────────────────────────────────────────────────

export async function updateProfileInfo(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateProfileInfoSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const { profileId, ...fields } = parsed.data;
  await prisma.profile.update({
    where: { id: profileId },
    data:  fields,
  });

  revalidatePath("/settings");
}

// ─── Search criteria ─────────────────────────────────────────────────────────

export async function updateSearchCriteria(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateSearchCriteriaSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const { profileId, ...fields } = parsed.data;
  await prisma.profile.update({
    where: { id: profileId },
    data:  fields,
  });

  revalidatePath("/settings");
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export async function updateResume(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateResumeSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const { profileId, ...fields } = parsed.data;
  await prisma.profile.update({
    where: { id: profileId },
    data:  fields,
  });

  revalidatePath("/settings");
}

// ─── Create profile ───────────────────────────────────────────────────────────

export async function createProfile(data: unknown): Promise<{ profileId: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createProfileSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  // Upsert User row — handles the missing Clerk webhook gracefully
  await prisma.user.upsert({
    where:  { id: userId },
    create: { id: userId },
    update: {},
  });

  const profile = await prisma.profile.create({
    data: {
      userId,
      name:     parsed.data.name,
      isActive: false,
    },
  });

  revalidatePath("/settings");
  return { profileId: profile.id };
}

// ─── Switch active profile ────────────────────────────────────────────────────

export async function switchProfile(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = switchProfileSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  // Verify the target profile belongs to this user
  const target = await prisma.profile.findFirst({
    where: { id: parsed.data.profileId, userId },
  });
  if (!target) throw new Error("Profile not found");

  await prisma.$transaction([
    prisma.profile.updateMany({
      where: { userId },
      data:  { isActive: false },
    }),
    prisma.profile.update({
      where: { id: parsed.data.profileId },
      data:  { isActive: true },
    }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

// ─── Re-match from pool ───────────────────────────────────────────────────────

export async function rematchProfile(
  profileId: string,
): Promise<{ removed: number; added: number }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  // Load pool (newest 2000 — same cap as the scrape route)
  const pool = await prisma.jobPool.findMany({
    orderBy: { postedAt: "desc" },
    take:    2000,
  });

  // Load all jobs for this profile, including pool content for matching
  const existingJobs = await prisma.job.findMany({
    where:   { profileId },
    include: { jobPool: true, application: { select: { id: true } } },
  });

  // Partition: only NEW jobs with no application are removable
  const removable = existingJobs.filter(
    (j) => j.feedStatus === "NEW" && !j.application,
  );

  // Hide jobs that no longer match the (now-saved) profile criteria
  const toHide = removable.filter(
    (j) => !jobMatchesProfile(j.jobPool, profile),
  );

  if (toHide.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: toHide.map((j) => j.id) } },
      data:  { feedStatus: "HIDDEN" },
    });
  }

  // Add new matches from pool not already present in the feed
  const existingPoolIds = new Set(existingJobs.map((j) => j.jobPoolId));

  const newCandidates = pool
    .filter((p) => !existingPoolIds.has(p.id) && jobMatchesProfile(p, profile))
    .slice(0, MAX_CANDIDATES_PER_RUN);

  let added = 0;
  if (newCandidates.length > 0) {
    const result = await prisma.job.createMany({
      data: newCandidates.map((c) => ({
        profileId,
        jobPoolId:  c.id,
        feedStatus: "NEW" as const,
      })),
      skipDuplicates: true,
    });
    added = result.count;
  }

  // Fire-and-forget analyze for new matches
  if (added > 0) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analyze`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ profileId }),
    }).catch(console.error);
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { removed: toHide.length, added };
}
