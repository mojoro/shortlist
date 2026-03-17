"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { JobCard } from "@/components/jobs/JobCard";
import {
  getMoreJobs,
  ignoreJob,
  unignoreJob,
  batchIgnoreJobs,
  batchSaveJobs,
  type JobScoreUpdate,
} from "@/app/(dashboard)/dashboard/actions";
import type { JobWithApplication } from "@/types";
import { groupJobsByDate } from "@/lib/feed";

// ─── Undo Toast ───────────────────────────────────────────────────────────────

interface ToastState {
  jobId: string;
  job: JobWithApplication;
}

function UndoToast({
  toast,
  onUndo,
  onDismiss,
}: {
  toast: ToastState;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  // key prop on outer div triggers re-animation when a new job is ignored
  return (
    <div className="pointer-events-auto relative min-w-[280px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_8px_32px_rgba(0,0,0,0.24),0_2px_8px_rgba(0,0,0,0.16)] animate-[toast-slide-in_0.25s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
      {/* Content row */}
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-medium text-[var(--text)]">Job hidden</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onUndo}
            className="cursor-pointer text-sm font-semibold text-[var(--accent)] transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
          >
            Undo
          </button>
          <button
            onClick={onDismiss}
            className="cursor-pointer flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Dismiss"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M1 1l8 8M9 1L1 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timer bar — drains left to right over 5s */}
      <div
        key={toast.jobId}
        className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-[var(--accent)] animate-[toast-drain_5s_linear_forwards]"
      />
    </div>
  );
}

// ─── Notice Toast ─────────────────────────────────────────────────────────────

function NoticeToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-auto relative min-w-[280px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_8px_32px_rgba(0,0,0,0.24),0_2px_8px_rgba(0,0,0,0.16)] animate-[toast-slide-in_0.25s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-medium text-[var(--text)]">{message}</span>
        <button
          onClick={onDismiss}
          className="cursor-pointer flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Dismiss"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" />
          </svg>
        </button>
      </div>
      <div className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-[var(--text-muted)] animate-[toast-drain_5s_linear_forwards]" />
    </div>
  );
}

// ─── Batch action bar ─────────────────────────────────────────────────────────

function BatchBar({
  count,
  isPending,
  onSave,
  onUnsave,
  onIgnore,
  onClear,
}: {
  count: number;
  isPending: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onIgnore: () => void;
  onClear: () => void;
}) {
  return (
    <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent)] bg-[var(--bg-card)] px-4 py-3 shadow-lg">
      <span className="text-sm font-semibold text-[var(--text)]">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-fg)]">
          {count}
        </span>
        selected
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: "Save",   action: onSave,   variant: "default" },
          { label: "Unsave", action: onUnsave, variant: "default" },
          { label: "Ignore", action: onIgnore, variant: "danger"  },
        ].map(({ label, action, variant }) => (
          <button
            key={label}
            onClick={action}
            disabled={isPending}
            className={[
              "cursor-pointer inline-flex min-h-[32px] items-center rounded px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              variant === "danger"
                ? "text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 dark:text-red-400 dark:ring-red-900 dark:hover:bg-red-950/50"
                : "ring-1 ring-inset ring-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] hover:ring-[var(--border-strong)]",
              isPending ? "opacity-50 !cursor-wait" : "",
            ].filter(Boolean).join(" ")}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onClear}
          className="cursor-pointer inline-flex min-h-[32px] items-center gap-1 rounded px-2.5 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Clear selection"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" />
          </svg>
          Clear
        </button>
      </div>
      <p className="w-full text-xs text-[var(--text-muted)] sm:hidden">
        Hold Ctrl / ⌘ to select, Shift to select a range
      </p>
      <p className="hidden w-full text-xs text-[var(--text-muted)] sm:block">
        Ctrl / ⌘ click to select · Shift click to select range
      </p>
    </div>
  );
}

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <div className="flex-1 border-t border-[var(--border)]" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type VirtualItem =
  | { type: "divider"; label: string }
  | { type: "job"; job: JobWithApplication; jobIndex: number };

interface JobFeedProps {
  initialJobs: JobWithApplication[];
  initialNextCursor: string | null;
  profileId: string;
  filter: string;
  sort: string;
  lastUpdatedText?: string | null;
}

export function JobFeed({
  initialJobs,
  initialNextCursor,
  profileId,
  filter,
  sort,
  lastUpdatedText,
}: JobFeedProps) {
  const [jobs, setJobs] = useState<JobWithApplication[]>(initialJobs);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isPending, startTransition] = useTransition();
  const [batchPending, startBatchTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // ── Undo toast ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notice toast ─────────────────────────────────────────────────────────
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(message: string) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 5000);
  }

  function dismissNotice() {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(null);
  }

  function showToast(job: JobWithApplication) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ jobId: job.id, job });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 5000);
  }

  function dismissToast() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // ── Ignore / unignore ────────────────────────────────────────────────────
  function handleIgnore(jobId: string) {
    const removed = jobs.find((j) => j.id === jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    if (removed) showToast(removed);
    startTransition(async () => {
      try {
        await ignoreJob(jobId, profileId);
      } catch {
        // restore on failure
        if (removed) setJobs((prev) => [removed, ...prev]);
        dismissToast();
      }
    });
  }

  function handleUndo() {
    if (!toast) return;
    dismissToast();
    const { job } = toast;
    setJobs((prev) => [job, ...prev]);
    startTransition(async () => {
      await unignoreJob(job.id, profileId, job.feedStatus);
    });
  }

  // Score update — update job in place or remove if hidden (NO_GO)
  function handleScored(jobId: string, update: JobScoreUpdate) {
    if (update.hidden) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      showNotice("Weak match — removed from feed");
    } else {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, aiScore: update.score, aiStatus: update.status, aiSummary: update.summary, aiMatchPoints: update.matchPoints, aiGapPoints: update.gapPoints }
            : j
        )
      );
    }
  }

  // Unignore from ignored view — just remove from visible list
  function handleUnignore(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    startTransition(async () => {
      try {
        await unignoreJob(jobId, profileId, "NEW");
      } catch {
        if (job) setJobs((prev) => [job, ...prev]);
      }
    });
  }

  // ── Selection ────────────────────────────────────────────────────────────
  function handleSelect(jobId: string, e: React.MouseEvent, index: number) {
    const isShift = e.shiftKey;
    const currentLast = lastSelectedIndex;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isShift && currentLast !== null) {
        const start = Math.min(currentLast, index);
        const end = Math.max(currentLast, index);
        for (let i = start; i <= end; i++) {
          if (jobs[i]) next.add(jobs[i].id);
        }
      } else {
        if (next.has(jobId)) {
          next.delete(jobId);
        } else {
          next.add(jobId);
        }
      }
      return next;
    });
    setLastSelectedIndex(index);
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }

  // ── Batch actions ────────────────────────────────────────────────────────
  function handleBatchIgnore() {
    const ids = Array.from(selectedIds);
    setJobs((prev) => prev.filter((j) => !selectedIds.has(j.id)));
    clearSelection();
    startBatchTransition(async () => {
      await batchIgnoreJobs(ids, profileId);
    });
  }

  function handleBatchSave(save: boolean) {
    const ids = Array.from(selectedIds);
    clearSelection();
    startBatchTransition(async () => {
      await batchSaveJobs(ids, profileId, save);
    });
  }

  // ── Load more ────────────────────────────────────────────────────────────
  function handleLoadMore() {
    if (!nextCursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await getMoreJobs(profileId, nextCursor, filter, sort);
        setJobs((prev) => [...prev, ...result.jobs]);
        setNextCursor(result.nextCursor);
      } catch {
        setError("Couldn't load more jobs. Please try again.");
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const isIgnoredView = filter === "ignored";

  if (jobs.length === 0) {
    const isAll = filter === "all" || !filter;
    return (
      <div className="py-16 text-center">
        <p className="text-base font-medium text-[var(--text)]">
          {filter === "new"     && "No new jobs right now."}
          {filter === "saved"   && "No saved jobs yet."}
          {filter === "applied" && "No applications yet."}
          {filter === "ignored" && "Nothing hidden."}
          {isAll                && "No jobs matched your profile."}
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {filter === "new"     && "Check back soon — new listings are added daily."}
          {filter === "saved"   && "Bookmark a job you like and it'll appear here."}
          {filter === "applied" && "Move a job to Applied in the pipeline to track it here."}
          {filter === "ignored" && "Tap × on a job card to hide it from your feed."}
          {isAll                && "Try adjusting your search criteria in Settings, or check back after the next daily update."}
        </p>
        {isAll && (
          <a
            href="/settings"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            Open Settings
          </a>
        )}
      </div>
    );
  }

  // ── Build flat virtual items array ─────────────────────────────────────
  const virtualItems: VirtualItem[] = [];
  if (sort === "newest") {
    for (const { bucket, jobs: bucketJobs } of groupJobsByDate(jobs)) {
      virtualItems.push({ type: "divider", label: bucket });
      for (const job of bucketJobs) {
        virtualItems.push({ type: "job", job, jobIndex: jobs.indexOf(job) });
      }
    }
  } else {
    for (let i = 0; i < jobs.length; i++) {
      virtualItems.push({ type: "job", job: jobs[i], jobIndex: i });
    }
  }

  return (
    <VirtualizedJobList
      virtualItems={virtualItems}
      jobs={jobs}
      nextCursor={nextCursor}
      isPending={isPending}
      batchPending={batchPending}
      error={error}
      isIgnoredView={isIgnoredView}
      selectedIds={selectedIds}
      lastUpdatedText={lastUpdatedText}
      toast={toast}
      notice={notice}
      onLoadMore={handleLoadMore}
      onIgnore={handleIgnore}
      onUnignore={handleUnignore}
      onSelect={handleSelect}
      onScored={handleScored}
      onBatchSave={handleBatchSave}
      onBatchIgnore={handleBatchIgnore}
      onClearSelection={clearSelection}
      onUndo={handleUndo}
      onDismissToast={dismissToast}
      onDismissNotice={dismissNotice}
    />
  );
}

// ─── Virtualized list ──────────────────────────────────────────────────────

interface VirtualizedJobListProps {
  virtualItems: VirtualItem[];
  jobs: JobWithApplication[];
  nextCursor: string | null;
  isPending: boolean;
  batchPending: boolean;
  error: string | null;
  isIgnoredView: boolean;
  selectedIds: Set<string>;
  lastUpdatedText?: string | null;
  toast: ToastState | null;
  notice: string | null;
  onLoadMore: () => void;
  onIgnore: (jobId: string) => void;
  onUnignore: (jobId: string) => void;
  onSelect: (jobId: string, e: React.MouseEvent, index: number) => void;
  onScored: (jobId: string, update: JobScoreUpdate) => void;
  onBatchSave: (save: boolean) => void;
  onBatchIgnore: () => void;
  onClearSelection: () => void;
  onUndo: () => void;
  onDismissToast: () => void;
  onDismissNotice: () => void;
}

function VirtualizedJobList({
  virtualItems,
  jobs,
  nextCursor,
  isPending,
  batchPending,
  error,
  isIgnoredView,
  selectedIds,
  lastUpdatedText,
  toast,
  notice,
  onLoadMore,
  onIgnore,
  onUnignore,
  onSelect,
  onScored,
  onBatchSave,
  onBatchIgnore,
  onClearSelection,
  onUndo,
  onDismissToast,
  onDismissNotice,
}: VirtualizedJobListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => virtualItems[index].type === "divider" ? 40 : 220,
    overscan: 5,
  });

  return (
    <div className="relative">
      {/* Batch action bar — outside virtual container so it stays fixed */}
      {selectedIds.size > 0 && !isIgnoredView && (
        <BatchBar
          count={selectedIds.size}
          isPending={batchPending}
          onSave={() => onBatchSave(true)}
          onUnsave={() => onBatchSave(false)}
          onIgnore={onBatchIgnore}
          onClear={onClearSelection}
        />
      )}

      {/* Hint when no selection but in regular feed — outside virtual container */}
      {selectedIds.size === 0 && !isIgnoredView && jobs.length > 1 && (
        <div className="mb-3 hidden sm:flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            {" / "}
            <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
            {" click to select jobs for batch actions"}
          </p>
          {lastUpdatedText && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              {lastUpdatedText.replace(/^Updated /, "")}
            </span>
          )}
        </div>
      )}

      {/* Virtualized scroll container */}
      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] overflow-y-auto"
      >
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = virtualItems[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
              >
                {item.type === "divider" ? (
                  <DateDivider label={item.label} />
                ) : (
                  <div className="pb-[18px]">
                    <JobCard
                      job={item.job}
                      index={item.jobIndex}
                      isSelected={selectedIds.has(item.job.id)}
                      onIgnore={onIgnore}
                      onUnignore={onUnignore}
                      onSelect={onSelect}
                      onScored={onScored}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Load more — inside scroll container at the bottom */}
        {nextCursor && (
          <div className="flex justify-center py-6">
            <button
              onClick={onLoadMore}
              disabled={isPending}
              className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--bg)] px-6 py-2 text-sm font-medium text-[var(--text)] ring-1 ring-inset ring-[var(--border)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {isPending ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-4 max-w-lg rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            <p>{error}</p>
            <button
              onClick={onLoadMore}
              className="mt-1 font-medium underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Toast portal — fixed bottom-center, stacked — outside virtual container */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center gap-2">
        {notice && (
          <NoticeToast
            key={notice}
            message={notice}
            onDismiss={onDismissNotice}
          />
        )}
        {toast && (
          <UndoToast
            key={toast.jobId}
            toast={toast}
            onUndo={onUndo}
            onDismiss={onDismissToast}
          />
        )}
      </div>
    </div>
  );
}
