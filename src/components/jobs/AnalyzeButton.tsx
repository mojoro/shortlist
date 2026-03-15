"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestAnalysis } from "@/app/(dashboard)/dashboard/actions";

export function AnalyzeButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "requested" | "credits" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setState("pending");
    startTransition(async () => {
      const result = await requestAnalysis(profileId);
      if (result.error === "CREDITS") {
        setState("credits");
        return;
      }
      if (result.error === "UNKNOWN") {
        setState("error");
        return;
      }
      setState("requested");
      // Refresh after ~10s to pick up completed analysis
      setTimeout(() => router.refresh(), 10_000);
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

  if (state === "requested") {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        Scoring your matches — checking for results…
      </p>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || state === "pending"}
      className="cursor-pointer inline-flex min-h-[36px] w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
    >
      {isPending || state === "pending" ? "Requesting…" : "Get match score"}
    </button>
  );
}
