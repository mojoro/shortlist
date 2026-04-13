"use server";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { findStaleJobIds } from "@/lib/match-sql";
import { runMatchPipelineForProfile } from "@/lib/match-pipeline";
import { requireProfile } from "@/lib/auth-helpers";
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

// ─── Shared rematch helper ────────────────────────────────────────────────────

type RematchProfile = Parameters<typeof findStaleJobIds>[1] &
  Parameters<typeof runMatchPipelineForProfile>[1];

async function rematchAndRevalidate(
  profileId: string,
  profile: RematchProfile,
): Promise<{ removed: number; added: number }> {
  const staleIds = await findStaleJobIds(profileId, profile);
  let removed = 0;
  if (staleIds.length > 0) {
    const { count } = await prisma.job.updateMany({
      where: { id: { in: staleIds } },
      data: { feedStatus: "HIDDEN" },
    });
    removed = count;
  }

  const pipelineResult = await runMatchPipelineForProfile(profileId, profile);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { removed, added: pipelineResult.jobsCreated };
}

// ─── Profile info ────────────────────────────────────────────────────────────

export async function updateProfileInfo(data: unknown): Promise<void> {
  const parsed = updateProfileInfoSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  await requireProfile(parsed.data.profileId);

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateProfileInfo entry — profileId:", parsed.data.profileId);
  }

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

export async function updateSearchCriteria(
  data: unknown,
): Promise<{ removed: number; added: number }> {
  const parsed = updateSearchCriteriaSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  await requireProfile(parsed.data.profileId);

  const { profileId, ...fields } = parsed.data;
  const updated = await prisma.profile.update({
    where: { id: profileId },
    data:  fields,
  });

  return rematchAndRevalidate(profileId, updated);
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export async function updateResume(data: unknown): Promise<void> {
  const parsed = updateResumeSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  await requireProfile(parsed.data.profileId);

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] updateResume entry — profileId:", parsed.data.profileId);
  }

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
  const parsed = updateResumeWritingRulesSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  await requireProfile(parsed.data.profileId);

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

  // Copy personal info and resume data from the active profile (if one exists)
  // Search criteria starts blank so the user configures it for the new context
  const activeProfile = await prisma.profile.findFirst({
    where: { userId, isActive: true },
  });

  // Deactivate all existing profiles before creating the new one as active
  await prisma.profile.updateMany({
    where: { userId },
    data: { isActive: false },
  });

  const profile = await prisma.profile.create({
    data: {
      userId,
      name:     parsed.data.name,
      isActive: true,
      onboardingCompletedAt: new Date(),
      ...(activeProfile && {
        displayName:      activeProfile.displayName,
        email:            activeProfile.email,
        phone:            activeProfile.phone,
        location:         activeProfile.location,
        linkedinUrl:      activeProfile.linkedinUrl,
        portfolioUrl:     activeProfile.portfolioUrl,
        githubUrl:        activeProfile.githubUrl,
        skills:           activeProfile.skills,
        masterResume:     activeProfile.masterResume,
        resumeLastEdited: activeProfile.resumeLastEdited,
        curriculumVitae:  activeProfile.curriculumVitae,
        protectedPhrases: activeProfile.protectedPhrases,
        bannedPhrases:    activeProfile.bannedPhrases,
        verifiedMetrics:  activeProfile.verifiedMetrics,
        neverClaim:       activeProfile.neverClaim,
        styleGuide:       activeProfile.styleGuide,
        currency:         activeProfile.currency,
      }),
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
  const parsed = switchProfileSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  const { userId } = await requireProfile(parsed.data.profileId);

  if (process.env.NODE_ENV === "development") {
    console.log("[settings/actions] switchProfile entry — userId:", userId);
  }

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
  const parsed = deleteProfileSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data");

  const { userId, profile } = await requireProfile(parsed.data.profileId);

  const profileCount = await prisma.profile.count({ where: { userId } });

  if (profileCount === 1) {
    // Last profile — delete and send user through onboarding again
    await prisma.profile.delete({ where: { id: parsed.data.profileId } });
    const cookieStore = await cookies();
    cookieStore.delete("shortlist-onboarded");
    redirect("/onboarding");
  }

  // If active, promote another profile before deleting
  if (profile.isActive) {
    const next = await prisma.profile.findFirst({
      where: { userId, id: { not: parsed.data.profileId } },
    });
    if (next) {
      await prisma.profile.update({
        where: { id: next.id },
        data:  { isActive: true },
      });
    }
  }

  await prisma.profile.delete({ where: { id: parsed.data.profileId } });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

// ─── Complete onboarding ─────────────────────────────────────────────────────

export async function completeOnboarding(
  data: unknown,
): Promise<{ profileId: string }> {
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

  // Set the onboarded cookie server-side (HttpOnly — not client-settable)
  const cookieStore = await cookies();
  cookieStore.set("shortlist-onboarded", "true", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  // Pipeline runs in the background after dashboard loads — not here.
  // This keeps onboarding fast (< 1 second).
  revalidatePath("/dashboard");
  return { profileId: profile.id };
}

// ─── Re-match from pool ───────────────────────────────────────────────────────

export async function rematchProfile(
  profileId: string,
): Promise<{ removed: number; added: number }> {
  const { profile } = await requireProfile(profileId);

  return rematchAndRevalidate(profileId, profile);
}
