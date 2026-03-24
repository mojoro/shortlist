import "server-only";

import { type Prisma, ScraperSource } from "@prisma/client";
import { startOfDay, subDays } from "date-fns";

import { prisma } from "@/lib/prisma";

// ── Overview ─────────────────────────────────────────────────────────────────

export async function getAdminOverviewStats() {
  const now = new Date();

  const [totalUsers, activeUsers7d, poolSize, totalProfiles, aiTokensMTD] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { lastActiveAt: { gte: subDays(now, 7) } },
      }),
      prisma.jobPool.count(),
      prisma.profile.count(),
      prisma.usage.aggregate({
        _sum: {
          currentMonthInputTokens: true,
          currentMonthOutputTokens: true,
        },
      }),
    ]);

  return {
    totalUsers,
    activeUsers7d,
    poolSize,
    totalProfiles,
    aiTokensMTD: {
      input: aiTokensMTD._sum.currentMonthInputTokens ?? 0,
      output: aiTokensMTD._sum.currentMonthOutputTokens ?? 0,
    },
  };
}

export async function getRecentScrapeRuns(limit = 20) {
  return prisma.scrapeRun.findMany({
    where: { profileId: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getRecentMatchRuns(limit = 20) {
  return prisma.matchRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { profile: { select: { name: true } } },
  });
}

export async function getNewUsersThisWeek() {
  return prisma.user.findMany({
    where: { createdAt: { gte: subDays(new Date(), 7) } },
    include: { _count: { select: { profiles: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getAdminUserList(opts: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const limit = opts.limit ?? 25;
  const page = opts.page ?? 1;
  const skip = (page - 1) * limit;

  const where = opts.search
    ? { email: { contains: opts.search, mode: "insensitive" as const } }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        usage: {
          select: {
            currentMonthInputTokens: true,
            monthlyLimitInputTokens: true,
          },
        },
        _count: { select: { profiles: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

export async function getAdminUserDetail(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      profiles: {
        include: {
          _count: { select: { jobs: true, applications: true } },
        },
      },
      usage: true,
      feedback: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export async function getAdminFeedbackList(opts: {
  page?: number;
  limit?: number;
}) {
  const limit = opts.limit ?? 25;
  const page = opts.page ?? 1;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
      skip,
      take: limit,
    }),
    prisma.feedback.count(),
  ]);

  return { items, total };
}

// ── Pool ─────────────────────────────────────────────────────────────────────

// Actively configured scraper sources shown in the admin pool UI
const ACTIVE_SOURCES: ScraperSource[] = [
  ScraperSource.GREENHOUSE,
  ScraperSource.ASHBY,
  ScraperSource.LEVER,
  ScraperSource.USAJOBS,
  ScraperSource.ADZUNA,
  ScraperSource.ARBEITNOW,
  ScraperSource.CUSTOM,
];

export function mergeSourceCounts(
  dbResult: { source: ScraperSource; _count: number }[]
): { source: ScraperSource; _count: number }[] {
  const bySource = new Map(dbResult.map((r) => [r.source, r._count]));
  return ACTIVE_SOURCES.map((source) => ({
    source,
    _count: bySource.get(source) ?? 0,
  }));
}

export async function getAdminPoolStats() {
  const [total, rawBySource] = await Promise.all([
    prisma.jobPool.count(),
    prisma.jobPool.groupBy({
      by: ["source"],
      _count: true,
      orderBy: { _count: { source: "desc" } },
    }),
  ]);

  const bySource = mergeSourceCounts(
    rawBySource.map((r) => ({ source: r.source, _count: r._count }))
  );

  return { total, bySource };
}

export async function getAdminPoolEntries(opts: {
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const limit = opts.limit ?? 25;
  const page = opts.page ?? 1;
  const skip = (page - 1) * limit;

  const where: Prisma.JobPoolWhereInput = {};

  if (opts.source) {
    where.source = opts.source as ScraperSource;
  }

  if (opts.search) {
    where.OR = [
      { title: { contains: opts.search, mode: "insensitive" } },
      { company: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.jobPool.findMany({
      where: where,
      include: { _count: { select: { jobs: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.jobPool.count({ where: where }),
  ]);

  return { entries, total };
}

// ── System ───────────────────────────────────────────────────────────────────

export async function getSystemHealth() {
  const [scraperStatus, failedRuns24h, aiSpend] = await Promise.all([
    prisma.scrapeRun.findMany({
      where: { profileId: null },
      orderBy: { createdAt: "desc" },
      distinct: ["source"],
    }),
    prisma.scrapeRun.count({
      where: {
        profileId: null,
        status: "FAILED",
        createdAt: { gte: subDays(new Date(), 1) },
      },
    }),
    prisma.usage.aggregate({
      _sum: {
        totalInputTokens: true,
        totalOutputTokens: true,
        currentMonthInputTokens: true,
        currentMonthOutputTokens: true,
      },
    }),
  ]);

  return {
    scraperStatus,
    failedRuns24h,
    aiSpend: {
      totalInputTokens: aiSpend._sum.totalInputTokens ?? 0,
      totalOutputTokens: aiSpend._sum.totalOutputTokens ?? 0,
      currentMonthInputTokens: aiSpend._sum.currentMonthInputTokens ?? 0,
      currentMonthOutputTokens: aiSpend._sum.currentMonthOutputTokens ?? 0,
    },
  };
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getUserGrowthData() {
  const twelveWeeksAgo = subDays(new Date(), 84);

  const rows = await prisma.$queryRaw<{ week: Date; signups: number }[]>`
    SELECT date_trunc('week', "createdAt") AS week, count(*)::int AS signups
    FROM users
    WHERE "createdAt" >= ${twelveWeeksAgo}
    GROUP BY week
    ORDER BY week
  `;

  return rows;
}

export async function getActivityData() {
  const now = new Date();

  const [dau, wau] = await Promise.all([
    prisma.user.count({
      where: { lastActiveAt: { gte: startOfDay(now) } },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: subDays(now, 7) } },
    }),
  ]);

  return { dau, wau };
}

export async function getFeatureUsageCounts() {
  const [tailoredResumes, applications, aiAnalyses, statusBreakdown] =
    await Promise.all([
      prisma.tailoredResume.count(),
      prisma.application.count(),
      prisma.job.count({ where: { aiAnalyzedAt: { not: null } } }),
      prisma.application.groupBy({ by: ["status"], _count: true }),
    ]);

  return { tailoredResumes, applications, aiAnalyses, statusBreakdown };
}
