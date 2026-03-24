"use client";

import { useState, useTransition } from "react";

import { adminTriggerScrape } from "@/app/(admin)/actions";

export function TriggerScrapeButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await adminTriggerScrape();
      setResult(res);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
      >
        {isPending ? "Scraping…" : "Trigger Scrape"}
      </button>
      {result && (
        <span
          className={`text-sm ${
            result.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
