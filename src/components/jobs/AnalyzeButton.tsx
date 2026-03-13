"use client";

import { useState, useTransition } from "react";
import { requestAnalysis } from "@/app/(dashboard)/dashboard/actions";

export function AnalyzeButton({ profileId }: { profileId: string }) {
  const [requested, setRequested] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await requestAnalysis(profileId);
      setRequested(true);
    });
  }

  if (requested) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        Scoring your matches — check back in a moment.
      </p>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="cursor-pointer inline-flex min-h-[36px] w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
    >
      {isPending ? "Requesting…" : "Get match score"}
    </button>
  );
}
