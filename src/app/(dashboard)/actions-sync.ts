"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/get-active-profile";
import { getFollowUpCount } from "@/app/(dashboard)/pipeline/actions";

/**
 * Fetches all dashboard data for the authenticated user.
 * Calls auth() internally — safe to invoke from client components.
 * Returns null if the user is not authenticated.
 */
export async function fetchDashboardData() {
  const { userId } = await auth();
  if (!userId) return null;

  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    return {
      userId,
      activeProfile: null,
      profiles: [],
      jobs: [],
      applications: [],
      followUpCount: 0,
      usage: null,
    };
  }

  const [profiles, jobs, applications, followUpCount, usageRecord] =
    await Promise.all([
      prisma.profile.findMany({
        where: { userId },
        select: { id: true, name: true, isActive: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.job.findMany({
        where: { profileId: activeProfile.id },
        include: { jobPool: true, application: { select: { status: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.application.findMany({
        where: { profileId: activeProfile.id },
        include: { job: { include: { jobPool: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      getFollowUpCount(userId),
      prisma.usage.findUnique({
        where: { userId },
        select: {
          currentMonthInputTokens: true,
          monthlyLimitInputTokens: true,
          analysisCallCount: true,
          tailorCallCount: true,
          currentMonthResetsAt: true,
        },
      }),
    ]);

  const usage = usageRecord
    ? {
        currentMonthInputTokens: usageRecord.currentMonthInputTokens,
        monthlyLimitInputTokens: usageRecord.monthlyLimitInputTokens,
        analysisCallCount: usageRecord.analysisCallCount,
        tailorCallCount: usageRecord.tailorCallCount,
        currentMonthResetsAt: usageRecord.currentMonthResetsAt,
      }
    : null;

  return { userId, activeProfile, profiles, jobs, applications, followUpCount, usage };
}

export type HydrationPayload = Awaited<ReturnType<typeof fetchDashboardData>>;
