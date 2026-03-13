"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApplicationWithJob } from "@/types";

interface FollowUpBannerProps {
  dueApplications: ApplicationWithJob[];
}

export function FollowUpBanner({ dueApplications }: FollowUpBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || dueApplications.length === 0) return null;

  const count = dueApplications.length;
  const preview = dueApplications.slice(0, 3).map((a) => a.job.jobPool.company);
  const overflow = count - preview.length;

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {count === 1
            ? "1 application is due for a follow-up"
            : `${count} applications are due for a follow-up`}
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
          {preview.join(", ")}
          {overflow > 0 && ` +${overflow} more`}
          {" — "}
          <Link
            href="#pipeline-table"
            className="underline underline-offset-2 hover:no-underline"
            onClick={() => setDismissed(false)}
          >
            view in table
          </Link>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-600 transition-colors hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        aria-label="Dismiss follow-up reminder"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
