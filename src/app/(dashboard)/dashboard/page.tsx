import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildWhereClause, buildOrderBy, type SortDir } from "@/lib/jobs";
import { formatDistanceToNow } from "date-fns";
import { FilterChips } from "@/components/ui/FilterChips";
import { JobFeed } from "@/components/jobs/JobFeed";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { ProfileSwitcher } from "@/components/dashboard/ProfileSwitcher";
import { APP_CONFIG } from "@/config/app";
import type { JobWithApplication } from "@/types";

export const metadata: Metadata = { title: "Your matches" };

const VALID_FILTERS = ["all", "new", "saved", "applied", "ignored"] as const;
const VALID_SORTS   = ["match", "newest", "salary"] as const;
const VALID_DIRS    = ["asc", "desc"] as const;
type SortOption = (typeof VALID_SORTS)[number];

interface PageProps {
  searchParams: Promise<{ filter?: string; sort?: string; dir?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { filter = "all", sort = "match", dir = "desc" } = await searchParams;
  const safeFilter = (VALID_FILTERS as readonly string[]).includes(filter)
    ? filter
    : "all";
  const safeSort: SortOption = (VALID_SORTS as readonly string[]).includes(sort)
    ? (sort as SortOption)
    : "match";
  const safeDir: SortDir = (VALID_DIRS as readonly string[]).includes(dir)
    ? (dir as SortDir)
    : "desc";

  try {
    const [profile, allProfiles] = await Promise.all([
      prisma.profile.findFirst({
        where: { userId },
        orderBy: { isActive: "desc" },
      }),
      prisma.profile.findMany({
        where: { userId },
        select: { id: true, name: true, isActive: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!profile) {
      return (
        <div className="py-16 text-center">
          <h1 className="text-xl font-semibold text-[var(--text)]">
            Welcome to {APP_CONFIG.name}
          </h1>
          <p className="mt-2 text-base text-[var(--text-muted)]">
            You haven&apos;t set up a profile yet. Head to Settings to get started.
          </p>
        </div>
      );
    }

    const [allCount, newCount, savedCount, appliedCount, ignoredCount, avgScoreResult, jobs] =
      await Promise.all([
        prisma.job.count({
          where: { profileId: profile.id, feedStatus: { notIn: ["HIDDEN", "ARCHIVED"] } },
        }),
        prisma.job.count({
          where: { profileId: profile.id, feedStatus: "NEW" },
        }),
        prisma.job.count({
          where: { profileId: profile.id, feedStatus: "SAVED" },
        }),
        prisma.job.count({
          where: {
            profileId: profile.id,
            application: { status: { not: "INTERESTED" } },
          },
        }),
        prisma.job.count({
          where: { profileId: profile.id, feedStatus: "ARCHIVED" },
        }),
        prisma.job.aggregate({
          where: {
            profileId: profile.id,
            aiScore: { not: null },
            feedStatus: { notIn: ["HIDDEN", "ARCHIVED"] },
          },
          _avg: { aiScore: true },
        }),
        prisma.job.findMany({
          where: buildWhereClause(profile.id, safeFilter),
          include: { jobPool: true, application: { select: { status: true } } },
          orderBy: buildOrderBy(safeSort, safeDir),
          take: 25,
        }),
      ]);

    const nextCursor = jobs.length === 25 ? jobs[jobs.length - 1].id : null;
    const avgScore = avgScoreResult._avg.aiScore;
    const lastUpdatedText = profile.lastScrapedAt
      ? `Updated ${formatDistanceToNow(new Date(profile.lastScrapedAt), { addSuffix: true })}`
      : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Job Feed
          </h1>
          <ProfileSwitcher profiles={allProfiles} activeProfileId={profile.id} />
        </div>

        <StatsRow
          newCount={newCount}
          savedCount={savedCount}
          appliedCount={appliedCount}
          avgScore={avgScore}
        />

        {lastUpdatedText && (
          <p className="text-right text-xs text-[var(--text-muted)]">{lastUpdatedText}</p>
        )}

        <FilterChips
          allCount={allCount}
          newCount={newCount}
          savedCount={savedCount}
          appliedCount={appliedCount}
          ignoredCount={ignoredCount}
        />

        <JobFeed
          key={`${profile.id}-${safeFilter}-${safeSort}-${safeDir}`}
          initialJobs={jobs as unknown as JobWithApplication[]}
          initialNextCursor={nextCursor}
          profileId={profile.id}
          filter={safeFilter}
          sort={safeSort}
        />
      </div>
    );
  } catch {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-[var(--text)]">
          Couldn&apos;t load your jobs right now
        </h1>
        <p className="mt-2 text-base text-[var(--text-muted)]">
          We&apos;re having trouble connecting to the database. Try refreshing in a moment.
        </p>
      </div>
    );
  }
}
