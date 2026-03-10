"use client";

import { useState, useTransition } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { getMoreJobs } from "@/app/(dashboard)/dashboard/actions";
import type { JobWithApplication } from "@/types";

interface JobFeedProps {
  initialJobs: JobWithApplication[];
  initialNextCursor: string | null;
  profileId: string;
  filter: string;
}

export function JobFeed({
  initialJobs,
  initialNextCursor,
  profileId,
  filter,
}: JobFeedProps) {
  const [jobs, setJobs] = useState<JobWithApplication[]>(initialJobs);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLoadMore() {
    if (!nextCursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await getMoreJobs(profileId, nextCursor, filter);
        setJobs((prev) => [...prev, ...result.jobs]);
        setNextCursor(result.nextCursor);
      } catch {
        setError("Couldn't load more jobs. Please try again.");
      }
    });
  }

  if (jobs.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-[--text-muted]">
          {filter === "new" && "No new jobs right now."}
          {filter === "saved" && "You haven't saved any jobs yet."}
          {filter === "applied" && "No applications yet."}
          {(filter === "all" || !filter) &&
            "No jobs found yet. We'll find matches for you soon."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center rounded-full bg-[--bg] px-6 py-2 text-sm font-medium text-[--text] ring-1 ring-inset ring-[--border] transition-colors hover:bg-[--bg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
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
    </div>
  );
}
