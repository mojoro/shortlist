"use server";

import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/get-active-profile";
import { getFollowUpCount } from "@/app/(dashboard)/pipeline/actions";

export async function fetchDashboardData(userId: string) {
  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    return {
      userId,
      activeProfile: null,
      profiles: [],
      jobs: [],
      applications: [],
      followUpCount: 0,
    };
  }

  const [profiles, jobs, applications, followUpCount] = await Promise.all([
    prisma.profile.findMany({
      where: { userId },
      select: { id: true, name: true, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    // ALL jobs for profile (not just 25) — exclude HIDDEN
    prisma.job.findMany({
      where: { profileId: activeProfile.id },
      include: { jobPool: true, application: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // ALL applications for profile
    prisma.application.findMany({
      where: { profileId: activeProfile.id },
      include: { job: { include: { jobPool: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    getFollowUpCount(userId),
  ]);

  return { userId, activeProfile, profiles, jobs, applications, followUpCount };
}

export type HydrationPayload = Awaited<ReturnType<typeof fetchDashboardData>>;
