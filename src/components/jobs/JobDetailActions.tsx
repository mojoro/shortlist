"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSaveJob, ignoreJob } from "@/app/(dashboard)/dashboard/actions";

interface JobDetailActionsProps {
  jobId: string;
  profileId: string;
  feedStatus: string;
  externalUrl: string;
}

export function JobDetailActions({
  jobId,
  profileId,
  feedStatus,
  externalUrl,
}: JobDetailActionsProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(feedStatus === "SAVED");
  const [savePending, startSaveTransition] = useTransition();
  const [ignorePending, startIgnoreTransition] = useTransition();

  function handleSave() {
    const next = !isSaved;
    setIsSaved(next);
    startSaveTransition(async () => {
      try {
        await toggleSaveJob(jobId, profileId, next);
      } catch {
        setIsSaved(!next);
      }
    });
  }

  function handleIgnore() {
    startIgnoreTransition(async () => {
      try {
        await ignoreJob(jobId, profileId);
        router.push("/dashboard");
      } catch {
        // silently fail — job stays visible
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Link
        href={`/tailor/${jobId}`}
        className="flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] transition-all hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Tailor resume →
      </Link>

      <button
        onClick={handleSave}
        disabled={savePending}
        className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-50"
      >
        {isSaved ? "Unsave job" : "Save job"}
      </button>

      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        View original listing ↗
      </a>

      <button
        onClick={handleIgnore}
        disabled={ignorePending}
        className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-wait disabled:opacity-50"
      >
        {ignorePending ? "Hiding…" : "Hide this job"}
      </button>
    </div>
  );
}
