"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import {
  adminAdjustUsageLimitSchema,
  adminCopyProfileSchema,
  adminUserIdSchema,
} from "@/lib/validations";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || userId !== env.ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

export async function adminAdjustUsageLimit(data: unknown) {
  await requireAdmin();
  const parsed = adminAdjustUsageLimitSchema.parse(data);
  await prisma.usage.update({
    where: { userId: parsed.userId },
    data: { monthlyLimitInputTokens: parsed.monthlyLimitInputTokens },
  });
  revalidatePath("/admin/users");
}

export async function adminDisableUser(data: unknown) {
  await requireAdmin();
  const { userId } = adminUserIdSchema.parse(data);
  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: new Date() },
  });
  revalidatePath("/admin/users");
}

export async function adminEnableUser(data: unknown) {
  await requireAdmin();
  const { userId } = adminUserIdSchema.parse(data);
  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: null },
  });
  revalidatePath("/admin/users");
}

export async function adminResetMonthlyUsage(data: unknown) {
  await requireAdmin();
  const { userId } = adminUserIdSchema.parse(data);
  await prisma.usage.update({
    where: { userId },
    data: { currentMonthInputTokens: 0, currentMonthOutputTokens: 0 },
  });
  revalidatePath("/admin/users");
}

export async function adminTriggerScrape(): Promise<{
  ok: boolean;
  message: string;
}> {
  await requireAdmin();

  const url = new URL("/api/scrape", env.NEXT_PUBLIC_APP_URL);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });

  if (!res.ok) {
    return { ok: false, message: `Scrape failed: ${res.status} ${res.statusText}` };
  }

  const body = (await res.json()) as { poolNew?: number };
  revalidatePath("/admin/system");
  return { ok: true, message: `Scrape complete — ${body.poolNew ?? 0} new to pool` };
}

export async function adminCopyProfileToAdmin(
  data: unknown,
): Promise<{ profileId: string; jobsCopied: number; applicationsCopied: number }> {
  const adminUserId = await requireAdmin();
  const { profileId, mode } = adminCopyProfileSchema.parse(data);

  const sourceProfile = await prisma.profile.findUnique({
    where: { id: profileId },
  });

  if (!sourceProfile) throw new Error("Profile not found");

  // Fetch jobs with nested relations only when copying everything
  const sourceJobs =
    mode === "full"
      ? await prisma.job.findMany({
          where: { profileId },
          include: {
            application: {
              include: { tailoredResumes: true },
            },
          },
        })
      : [];

  let jobsCopied = 0;
  let applicationsCopied = 0;

  const newProfile = await prisma.$transaction(async (tx) => {
    // Ensure admin user row exists (may not if they never onboarded)
    await tx.user.upsert({
      where: { id: adminUserId },
      create: { id: adminUserId },
      update: {},
    });

    // Deactivate all existing admin profiles
    await tx.profile.updateMany({
      where: { userId: adminUserId },
      data: { isActive: false },
    });

    // Create new profile under admin user
    const created = await tx.profile.create({
      data: {
        userId: adminUserId,
        name: `[Copy] ${sourceProfile.name}`,
        isActive: true,
        onboardingCompletedAt: new Date(),
        // Search criteria
        targetRoles: sourceProfile.targetRoles,
        targetLocations: sourceProfile.targetLocations,
        currency: sourceProfile.currency,
        targetSalaryMin: sourceProfile.targetSalaryMin,
        targetSalaryMax: sourceProfile.targetSalaryMax,
        requiredSkills: sourceProfile.requiredSkills,
        niceToHaveSkills: sourceProfile.niceToHaveSkills,
        excludedKeywords: sourceProfile.excludedKeywords,
        companySize: sourceProfile.companySize,
        remotePreference: sourceProfile.remotePreference,
        workEligibility: sourceProfile.workEligibility,
        // Resume & contact
        masterResume: sourceProfile.masterResume,
        resumeLastEdited: sourceProfile.resumeLastEdited,
        curriculumVitae: sourceProfile.curriculumVitae,
        displayName: sourceProfile.displayName,
        email: sourceProfile.email,
        phone: sourceProfile.phone,
        location: sourceProfile.location,
        linkedinUrl: sourceProfile.linkedinUrl,
        portfolioUrl: sourceProfile.portfolioUrl,
        githubUrl: sourceProfile.githubUrl,
        skills: sourceProfile.skills,
        // Writing rules
        protectedPhrases: sourceProfile.protectedPhrases,
        bannedPhrases: sourceProfile.bannedPhrases,
        verifiedMetrics: sourceProfile.verifiedMetrics,
        neverClaim: sourceProfile.neverClaim,
        // AI model overrides
        customTailorModel: sourceProfile.customTailorModel,
        customAnalyzeModel: sourceProfile.customAnalyzeModel,
        customExtractModel: sourceProfile.customExtractModel,
        // Scraper config
        scraperEnabled: sourceProfile.scraperEnabled,
        scraperSources: sourceProfile.scraperSources,
        scraperFrequency: sourceProfile.scraperFrequency,
      },
    });

    // Copy jobs + applications + tailored resumes in full mode
    for (const sourceJob of sourceJobs) {
      const newJob = await tx.job.create({
        data: {
          profileId: created.id,
          jobPoolId: sourceJob.jobPoolId,
          aiScore: sourceJob.aiScore,
          aiStatus: sourceJob.aiStatus,
          aiSummary: sourceJob.aiSummary,
          aiMatchPoints: sourceJob.aiMatchPoints,
          aiGapPoints: sourceJob.aiGapPoints,
          aiAnalyzedAt: sourceJob.aiAnalyzedAt,
          aiModel: sourceJob.aiModel,
          feedStatus: sourceJob.feedStatus,
          viewedAt: sourceJob.viewedAt,
          userNotes: sourceJob.userNotes,
          matchTier: sourceJob.matchTier,
          matchConfidence: sourceJob.matchConfidence,
        },
      });
      jobsCopied++;

      if (sourceJob.application) {
        const newApplication = await tx.application.create({
          data: {
            profileId: created.id,
            jobId: newJob.id,
            status: sourceJob.application.status,
            statusUpdatedAt: sourceJob.application.statusUpdatedAt,
            appliedAt: sourceJob.application.appliedAt,
            interviewDates: sourceJob.application.interviewDates,
            offerReceivedAt: sourceJob.application.offerReceivedAt,
            decisionAt: sourceJob.application.decisionAt,
            notes: sourceJob.application.notes,
            salaryOffered: sourceJob.application.salaryOffered,
            recruiterName: sourceJob.application.recruiterName,
            recruiterEmail: sourceJob.application.recruiterEmail,
            followUpAt: sourceJob.application.followUpAt,
            exportedResumeMarkdown:
              sourceJob.application.exportedResumeMarkdown,
            exportedAt: sourceJob.application.exportedAt,
          },
        });
        applicationsCopied++;

        for (const sourceResume of sourceJob.application.tailoredResumes) {
          await tx.tailoredResume.create({
            data: {
              applicationId: newApplication.id,
              markdown: sourceResume.markdown,
              generatedBy: sourceResume.generatedBy,
              wasExported: sourceResume.wasExported,
              exportedAt: sourceResume.exportedAt,
              promptSnapshot: sourceResume.promptSnapshot,
            },
          });
        }
      }
    }

    return created;
  }, { timeout: 30000 });

  revalidatePath("/admin/users");
  return { profileId: newProfile.id, jobsCopied, applicationsCopied };
}
