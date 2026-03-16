"use server";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { jobMatchesProfile } from "@/lib/match";
import {
  updateProfileInfoSchema,
  updateSearchCriteriaSchema,
  updateResumeSchema,
  updateResumeWritingRulesSchema,
  createProfileSchema,
  switchProfileSchema,
  deleteProfileSchema,
  completeOnboardingSchema,
} from "@/lib/validations";

// ─── Profile info ────────────────────────────────────────────────────────────

export async function updateProfileInfo(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateProfileInfo entry — userId:", userId);
  }

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

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateProfileInfo success — profileId:", profileId);
  }

  revalidatePath("/settings");
}

// ─── Search criteria ─────────────────────────────────────────────────────────

export async function updateSearchCriteria(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateSearchCriteria entry — userId:", userId);
  }

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

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateSearchCriteria success — profileId:", profileId);
  }

  revalidatePath("/settings");
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export async function updateResume(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateResume entry — userId:", userId);
  }

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

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateResume success — profileId:", profileId);
  }

  revalidatePath("/settings");
}

// ─── Resume writing rules ─────────────────────────────────────────────────────

export async function updateResumeWritingRules(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateResumeWritingRulesSchema.safeParse(data);
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

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] createProfile entry — userId:", userId);
  }

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

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] createProfile success — profileId:", profile.id);
  }

  revalidatePath("/settings");
  return { profileId: profile.id };
}

// ─── Switch active profile ────────────────────────────────────────────────────

export async function switchProfile(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] switchProfile entry — userId:", userId);
  }

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

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] switchProfile success — profileId:", parsed.data.profileId);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

// ─── Delete profile ───────────────────────────────────────────────────────────

export async function deleteProfile(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = deleteProfileSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const allProfiles = await prisma.profile.findMany({ where: { userId } });

  if (allProfiles.length === 1) {
    // Last profile — delete and send user through onboarding again
    await prisma.profile.delete({ where: { id: parsed.data.profileId } });
    const cookieStore = await cookies();
    cookieStore.delete("shortlist-onboarded");
    redirect("/onboarding");
  }

  // If active, promote another profile before deleting
  if (profile.isActive) {
    const next = allProfiles.find((p) => p.id !== parsed.data.profileId)!;
    await prisma.profile.update({
      where: { id: next.id },
      data:  { isActive: true },
    });
  }

  await prisma.profile.delete({ where: { id: parsed.data.profileId } });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

// ─── Complete onboarding ─────────────────────────────────────────────────────

export async function completeOnboarding(
  data: unknown,
): Promise<{ profileId: string; jobsFound: number }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] completeOnboarding entry — userId:", userId);
  }

  const parsed = completeOnboardingSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  // Upsert User row — handles missing Clerk webhook
  await prisma.user.upsert({
    where:  { id: userId },
    create: { id: userId },
    update: {},
  });

  // Mark any existing profiles inactive, then create the new one
  await prisma.profile.updateMany({
    where: { userId },
    data:  { isActive: false },
  });

  const profile = await prisma.profile.create({
    data: {
      userId,
      name:                 parsed.data.name,
      targetRoles:          parsed.data.targetRoles,
      targetLocations:      parsed.data.targetLocations,
      remotePreference:     parsed.data.remotePreference,
      currency:             parsed.data.currency,
      targetSalaryMin:      parsed.data.targetSalaryMin,
      targetSalaryMax:      parsed.data.targetSalaryMax,
      masterResume:         parsed.data.masterResume ?? null,
      // Contact details
      displayName:          parsed.data.displayName ?? null,
      email:                parsed.data.email ?? null,
      phone:                parsed.data.phone ?? null,
      location:             parsed.data.contactLocation ?? null,
      linkedinUrl:          parsed.data.linkedinUrl || null,
      portfolioUrl:         parsed.data.portfolioUrl || null,
      githubUrl:            parsed.data.githubUrl || null,
      // Full CV
      curriculumVitae:      parsed.data.curriculumVitae ?? null,
      // Excluded keywords
      excludedKeywords:     parsed.data.excludedKeywords ?? [],
      isActive:             true,
      onboardingCompletedAt: new Date(),
    },
  });

  // Match new profile against the existing pool — no re-scrape needed
  const pool = await prisma.jobPool.findMany({
    orderBy: { postedAt: "desc" },
    take:    2000,
  });

  const matches = pool.filter((p) => jobMatchesProfile(p, profile));

  let jobsFound = 0;
  if (matches.length > 0) {
    const result = await prisma.job.createMany({
      data: matches.map((c) => ({
        profileId:  profile.id,
        jobPoolId:  c.id,
        feedStatus: "NEW" as const,
      })),
      skipDuplicates: true,
    });
    jobsFound = result.count;
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[settings/actions] completeOnboarding success — profileId: ${profile.id}, jobsFound: ${jobsFound}`);
  }

  revalidatePath("/dashboard");
  return { profileId: profile.id, jobsFound };
}

// ─── Re-match from pool ───────────────────────────────────────────────────────

export async function rematchProfile(
  profileId: string,
): Promise<{ removed: number; added: number }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (process.env.NODE_ENV === "development") {
    console.log(`[settings/actions] rematchProfile entry — userId: ${userId}, profileId: ${profileId}`);
  }

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
    .filter((p) => !existingPoolIds.has(p.id) && jobMatchesProfile(p, profile));

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

  if (process.env.NODE_ENV === "development") {
    console.log(`[settings/actions] rematchProfile success — profileId: ${profileId}, removed: ${toHide.length}, added: ${added}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { removed: toHide.length, added };
}
