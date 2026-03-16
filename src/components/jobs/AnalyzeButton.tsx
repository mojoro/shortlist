"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeJob } from "@/app/(dashboard)/dashboard/actions";

export function AnalyzeButton({ jobId, profileId }: { jobId: string; profileId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "credits" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setState("pending");
    startTransition(async () => {
      const result = await analyzeJob(jobId, profileId);
      if (result.error === "CREDITS") {
        setState("credits");
        return;
      }
      if (result.error === "UNKNOWN") {
        setState("error");
        return;
      }
      router.refresh();
    });
  }

  if (state === "credits") {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Insufficient AI credits — top up your OpenRouter account to enable scoring.
      </p>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs text-red-500 dark:text-red-400">Scoring failed.</p>
        <button
          onClick={handleClick}
          className="text-xs text-[var(--accent)] underline hover:opacity-80"
        >
          Try again
        </button>
      </div>
    );
  }

  const isLoading = isPending || state === "pending";
  const label = isLoading ? "Analyzing…" : "Get match score";

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="cursor-pointer inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {label}
    </button>
  );
}
