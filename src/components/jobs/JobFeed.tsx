"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import {
  getMoreJobs,
  ignoreJob,
  unignoreJob,
  batchIgnoreJobs,
  batchSaveJobs,
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
    <div
      className="pointer-events-auto relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl"
      style={{
        animation: "toast-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
        boxShadow: "0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.16)",
        minWidth: "280px",
      }}
    >
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

      {/* Timer bar — drains left to right over 2s */}
      <div
        key={toast.jobId}
        className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-[var(--accent)]"
        style={{ animation: "toast-drain 2s linear forwards" }}
      />
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

interface JobFeedProps {
  initialJobs: JobWithApplication[];
  initialNextCursor: string | null;
  profileId: string;
  filter: string;
  sort: string;
}

export function JobFeed({
  initialJobs,
  initialNextCursor,
  profileId,
  filter,
  sort,
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

  function showToast(job: JobWithApplication) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ jobId: job.id, job });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2000);
  }

  function dismissToast() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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
    return (
      <div className="py-16 text-center">
        <p className="text-base text-[var(--text-muted)]">
          {filter === "new"     && "No new jobs right now."}
          {filter === "saved"   && "You haven't saved any jobs yet."}
          {filter === "applied" && "No applications yet."}
          {filter === "ignored" && "Nothing hidden yet. Tap × on a job card to hide it."}
          {(filter === "all" || !filter) && "No jobs found yet. We'll find matches for you soon."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Batch action bar */}
      {selectedIds.size > 0 && !isIgnoredView && (
        <BatchBar
          count={selectedIds.size}
          isPending={batchPending}
          onSave={() => handleBatchSave(true)}
          onUnsave={() => handleBatchSave(false)}
          onIgnore={handleBatchIgnore}
          onClear={clearSelection}
        />
      )}

      {/* Hint when no selection but in regular feed */}
      {selectedIds.size === 0 && !isIgnoredView && jobs.length > 1 && (
        <p className="mb-3 hidden text-xs text-[var(--text-muted)] sm:block">
          <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
          {" / "}
          <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
          {" click to select jobs for batch actions"}
        </p>
      )}

      {/* Job list */}
      <div className="flex flex-col gap-[18px]">
        {sort === "newest"
          ? groupJobsByDate(jobs).map(({ bucket, jobs: bucketJobs }) => (
              <div key={bucket} className="flex flex-col gap-[18px]">
                <DateDivider label={bucket} />
                {bucketJobs.map((job) => {
                  const index = jobs.indexOf(job);
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      index={index}
                      isSelected={selectedIds.has(job.id)}
                      onIgnore={handleIgnore}
                      onUnignore={handleUnignore}
                      onSelect={handleSelect}
                    />
                  );
                })}
              </div>
            ))
          : jobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                index={index}
                isSelected={selectedIds.has(job.id)}
                onIgnore={handleIgnore}
                onUnignore={handleUnignore}
                onSelect={handleSelect}
              />
            ))}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--bg)] px-6 py-2 text-sm font-medium text-[var(--text)] ring-1 ring-inset ring-[var(--border)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <p>{error}</p>
          <button
            onClick={handleLoadMore}
            className="mt-1 font-medium underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* Undo toast — fixed bottom-center */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <UndoToast
            key={toast.jobId}
            toast={toast}
            onUndo={handleUndo}
            onDismiss={dismissToast}
          />
        </div>
      )}
    </div>
  );
}
