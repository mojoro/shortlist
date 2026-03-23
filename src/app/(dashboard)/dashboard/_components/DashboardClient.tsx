"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { formatDistanceToNow } from "date-fns";
import { useDashboardStore } from "@/lib/store";
import { filterJobs, sortJobs, computeStats } from "@/lib/store-filters";
import { ProfileSwitcher } from "@/components/dashboard/ProfileSwitcher";
import { FeedToolbar } from "@/components/dashboard/FeedToolbar";
import { JobFeed } from "@/components/jobs/JobFeed";
import { ImportJobButton } from "@/components/jobs/ImportJobModal";
import { APP_CONFIG } from "@/config/app";
import { loadMoreMatches } from "@/app/(dashboard)/dashboard/actions";

interface DashboardClientProps {
  initialFilter: string;
  initialSort: string;
  initialDir: string;
}

export function DashboardClient({
  initialFilter,
  initialSort,
  initialDir,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState(initialSort);
  const [dir, setDir] = useState(initialDir);

  const activeProfile = useDashboardStore((s) => s.activeProfile);
  const profiles = useDashboardStore(useShallow((s) => s.profiles));
  const allJobs = useDashboardStore((s) => s.jobs);
  const pendingMatchCount = useDashboardStore((s) => s.pendingMatchCount);
  const sync = useDashboardStore((s) => s.sync);

  // First-run detection: if profile has 0 jobs and was created recently, auto-trigger pipeline
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const firstRunTriggered = useRef(false);

  useEffect(() => {
    if (!activeProfile || firstRunTriggered.current) return;
    if (allJobs.length > 0) return; // Already has jobs
    const created = activeProfile.onboardingCompletedAt;
    if (!created) return;
    const age = Date.now() - new Date(created).getTime();
    if (age > 120_000) return; // Only auto-trigger within 2 minutes of creation
    firstRunTriggered.current = true;
    setIsLoadingMatches(true);
    loadMoreMatches(activeProfile.id)
      .then(() => sync())
      .finally(() => setIsLoadingMatches(false));
  }, [activeProfile, allJobs.length, sync]);

  // Manual "load more" handler
  function handleLoadMore() {
    if (!activeProfile || isLoadingMatches) return;
    setIsLoadingMatches(true);
    loadMoreMatches(activeProfile.id)
      .then(() => sync())
      .finally(() => setIsLoadingMatches(false));
  }

  // Derive stats and filtered jobs from the raw jobs array (stable reference from store)
  const stats = computeStats(allJobs);
  const jobs = sortJobs(filterJobs(allJobs, filter), sort, dir);

  const { allCount, newCount, savedCount, appliedCount, ignoredCount, avgScore } = stats;

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  }

  function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    updateUrl({ filter: newFilter === "all" ? null : newFilter });
  }

  function handleSortChange(newSort: string) {
    const currentSort = sort;
    const currentDir = dir;

    if (newSort === currentSort) {
      const nextDir = currentDir === "desc" ? "asc" : "desc";
      setDir(nextDir);
      updateUrl({ dir: nextDir === "desc" ? null : nextDir });
    } else {
      setSort(newSort);
      setDir("desc");
      updateUrl({ sort: newSort === "match" ? null : newSort, dir: null });
    }
  }

  const hydrated = useDashboardStore((s) => s.hydrated);

  // Store not yet hydrated — show skeleton instead of empty/error state
  if (!hydrated) {
    return <DashboardSkeleton />;
  }

  if (!activeProfile) {
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

  const lastUpdatedText = activeProfile.lastScrapedAt
    ? `Updated ${formatDistanceToNow(new Date(activeProfile.lastScrapedAt), { addSuffix: true })}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 relative">
          <ProfileSwitcher profiles={profiles} activeProfileId={activeProfile.id} />
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
        <ImportJobButton profileId={activeProfile.id} />
      </div>

      <FeedToolbar
        allCount={allCount}
        newCount={newCount}
        savedCount={savedCount}
        appliedCount={appliedCount}
        ignoredCount={ignoredCount}
        avgScore={avgScore}
        lastUpdatedText={lastUpdatedText}
        filter={filter}
        sort={sort}
        dir={dir}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
      />

      {/* First-run loading state */}
      {isLoadingMatches && allJobs.length === 0 && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          <p className="text-sm text-[var(--text-muted)]">Finding your matches…</p>
        </div>
      )}

      {/* Load more banner */}
      {pendingMatchCount > 0 && !isLoadingMatches && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <p className="text-sm text-[var(--text-muted)]">
            ~{pendingMatchCount} more matches available
          </p>
          <button
            onClick={handleLoadMore}
            className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Load more
          </button>
        </div>
      )}

      {/* Loading indicator when loading more (but already have jobs) */}
      {isLoadingMatches && allJobs.length > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)]">Loading more matches…</p>
        </div>
      )}

      <JobFeed
        jobs={jobs}
        profileId={activeProfile.id}
        filter={filter}
        sort={sort}
        lastUpdatedText={lastUpdatedText}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading your matches">
      {/* Top bar: profile switcher + import button */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-9 w-48 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="h-9 w-24 rounded-lg bg-[var(--bg-subtle)]" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {[80, 48, 56, 64, 60].map((w, i) => (
          <div key={i} className={`h-8 rounded-full bg-[var(--bg-subtle)]`} style={{ width: w }} />
        ))}
      </div>

      {/* Job cards */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-md bg-[var(--bg-subtle)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-[var(--bg-subtle)]" />
                <div className="h-3 w-1/3 rounded bg-[var(--bg-subtle)]" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-3 w-full rounded bg-[var(--bg-subtle)]" />
              <div className="h-3 w-4/5 rounded bg-[var(--bg-subtle)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
