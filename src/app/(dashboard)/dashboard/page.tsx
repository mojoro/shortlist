import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/get-active-profile";
import { buildWhereClause, buildOrderBy, type SortDir } from "@/lib/jobs";
import { formatDistanceToNow } from "date-fns";
import { FeedToolbar } from "@/components/dashboard/FeedToolbar";
import { JobFeed } from "@/components/jobs/JobFeed";
import { ProfileSwitcher } from "@/components/dashboard/ProfileSwitcher";
import { ImportJobButton } from "@/components/jobs/ImportJobModal";
import { APP_CONFIG } from "@/config/app";
import type { JobWithApplication } from "@/types";

export const metadata: Metadata = { title: "Your matches" };

const getCachedStats = unstable_cache(
  async (profileId: string) => {
    const [grouped, appliedCount, avgScoreResult] = await Promise.all([
      prisma.job.groupBy({
        by: ["feedStatus"],
        where: { profileId },
        _count: true,
      }),
      prisma.job.count({
        where: {
          profileId,
          application: { status: { not: "INTERESTED" } },
        },
      }),
      prisma.job.aggregate({
        where: {
          profileId,
          aiScore: { not: null },
          feedStatus: { notIn: ["HIDDEN", "ARCHIVED"] },
        },
        _avg: { aiScore: true },
      }),
    ]);

    const newCount = grouped.find((g) => g.feedStatus === "NEW")?._count ?? 0;
    const savedCount = grouped.find((g) => g.feedStatus === "SAVED")?._count ?? 0;
    const ignoredCount = grouped.find((g) => g.feedStatus === "ARCHIVED")?._count ?? 0;
    const allCount = newCount + savedCount;
    const avgScore = avgScoreResult._avg.aiScore;

    return { allCount, newCount, savedCount, appliedCount, ignoredCount, avgScore };
  },
  ["dashboard-stats"],
  { revalidate: 60, tags: ["dashboard-stats"] },
);

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
      getActiveProfile(userId),
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

    // Stats are cached (fast) — render shell immediately
    const stats = await getCachedStats(profile.id);
    const { allCount, newCount, savedCount, appliedCount, ignoredCount, avgScore } = stats;

    const lastUpdatedText = profile.lastScrapedAt
      ? `Updated ${formatDistanceToNow(new Date(profile.lastScrapedAt), { addSuffix: true })}`
      : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 relative">
            <ProfileSwitcher profiles={allProfiles} activeProfileId={profile.id} />
            {lastUpdatedText && (
              <span className="sm:hidden flex items-center gap-1 px-0.5 text-[10px] text-[var(--text-muted)] absolute top-[110%] left-[5%]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                {lastUpdatedText.replace(/^Updated /, "")}
              </span>
            )}
          </div>
          {avgScore !== null && (() => {
            const scoreText = avgScore >= 90 ? "text-green-600 dark:text-green-400" : avgScore >= 75 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
            const scoreBorder = avgScore >= 90 ? "border-green-300/60 bg-green-50 dark:border-green-700/50 dark:bg-green-900/20" : avgScore >= 75 ? "border-amber-300/60 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20" : "border-red-300/60 bg-red-50 dark:border-red-700/50 dark:bg-red-900/20";
            return (
              <>
                {/* Mobile: compact stacked pill */}
                <span className={`sm:hidden inline-flex flex-col items-center rounded-2xl border px-2.5 py-2 ${scoreBorder}`}>
                  <span className={`text-base font-bold tabular-nums leading-tight ${scoreText}`}>{Math.round(avgScore)}%</span>
                  <span className="text-[10px] leading-tight text-[var(--text-muted)]">Match</span>
                </span>
                {/* Desktop: prominent horizontal badge with rising bars icon */}
                <div className={`hidden sm:inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 ${scoreBorder}`}>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" className={`shrink-0 ${scoreText}`} aria-hidden="true">
                    <rect x="0" y="6" width="3" height="6" rx="0.5" />
                    <rect x="4.5" y="3" width="3" height="9" rx="0.5" />
                    <rect x="9" y="0" width="3" height="12" rx="0.5" />
                  </svg>
                  <span className={`text-base font-bold tabular-nums leading-none ${scoreText}`}>{Math.round(avgScore)}%</span>
                  <span className="text-sm text-[var(--text-muted)]">Match Score</span>
                </div>
              </>
            );
          })()}
          <ImportJobButton profileId={profile.id} />
        </div>

        <FeedToolbar
          allCount={allCount}
          newCount={newCount}
          savedCount={savedCount}
          appliedCount={appliedCount}
          ignoredCount={ignoredCount}
          avgScore={avgScore}
          lastUpdatedText={lastUpdatedText}
        />

        {/* Job feed streams in — shell above is already visible */}
        <Suspense fallback={<FeedSkeleton />}>
          <DeferredJobFeed
            profileId={profile.id}
            filter={safeFilter}
            sort={safeSort}
            dir={safeDir}
            lastUpdatedText={lastUpdatedText}
          />
        </Suspense>
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

/* ─── Deferred job feed — streamed via Suspense ──────────── */

async function DeferredJobFeed({
  profileId,
  filter,
  sort,
  dir,
  lastUpdatedText,
}: {
  profileId: string;
  filter: string;
  sort: string;
  dir: SortDir;
  lastUpdatedText: string | null;
}) {
  const safeSort: SortOption = (VALID_SORTS as readonly string[]).includes(sort)
    ? (sort as SortOption)
    : "match";

  const jobs = await prisma.job.findMany({
    where: buildWhereClause(profileId, filter),
    include: { jobPool: true, application: { select: { status: true } } },
    orderBy: buildOrderBy(safeSort, dir),
    take: 25,
  });

  const nextCursor = jobs.length === 25 ? jobs[jobs.length - 1].id : null;

  return (
    <JobFeed
      key={`${profileId}-${filter}-${sort}-${dir}`}
      initialJobs={jobs as unknown as JobWithApplication[]}
      initialNextCursor={nextCursor}
      profileId={profileId}
      filter={filter}
      sort={sort}
      lastUpdatedText={lastUpdatedText}
    />
  );
}

/* ─── Feed skeleton — shown while job list streams in ───── */

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
        >
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-md bg-[var(--bg-subtle)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-[var(--bg-subtle)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--bg-subtle)]" />
            </div>
          </div>
          <div className="mt-4 h-3 w-full rounded bg-[var(--bg-subtle)]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[var(--bg-subtle)]" />
        </div>
      ))}
    </div>
  );
}
