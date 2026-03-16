"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardAnalysis, analyzeJob } from "@/app/(dashboard)/dashboard/actions";

interface ReanalyzeButtonProps {
  jobId:     string;
  profileId: string;
}

type State = "idle" | "clearing" | "pending" | "error";

const LABELS: Record<State, string> = {
  idle:     "Re-analyze based on current profile",
  clearing: "Clearing previous results…",
  pending:  "Analyzing…",
  error:    "Something went wrong.",
};

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function ReanalyzeButton({ jobId, profileId }: ReanalyzeButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [, startTransition] = useTransition();

  function handleClick() {
    if (state !== "idle" && state !== "error") return;
    setState("clearing");
    startTransition(async () => {
      try {
        await discardAnalysis(jobId, profileId);
      } catch {
        setState("error");
        return;
      }

      setState("pending");
      const result = await analyzeJob(jobId, profileId);

      if (result.error) {
        setState("error");
        return;
      }

      setState("idle");
      router.refresh();
    });
  }

  const isLoading = state === "clearing" || state === "pending";

  if (state === "idle") {
    return (
      <button
        onClick={handleClick}
        className="mt-4 w-full text-center text-xs text-[var(--text-muted)] underline underline-offset-2 transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Re-analyze based on current profile
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="inline-flex w-full items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
        {isLoading && <Spinner />}
        <span>{LABELS[state]}</span>
        {state === "error" && (
          <button
            onClick={handleClick}
            className="ml-1 text-[var(--accent)] underline hover:opacity-80"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
