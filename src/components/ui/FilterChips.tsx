"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface FilterChipsProps {
  allCount: number;
  newCount: number;
  savedCount: number;
  appliedCount: number;
}

const CHIPS = [
  { key: "all", label: "all" },
  { key: "new", label: "new" },
  { key: "saved", label: "saved" },
  { key: "applied", label: "applied" },
] as const;

type FilterKey = (typeof CHIPS)[number]["key"];

export function FilterChips({
  allCount,
  newCount,
  savedCount,
  appliedCount,
}: FilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentFilter = (searchParams.get("filter") ?? "all") as FilterKey;

  const counts: Record<FilterKey, number> = {
    all: allCount,
    new: newCount,
    saved: savedCount,
    applied: appliedCount,
  };

  function handleFilterChange(filter: FilterKey) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (filter === "all") {
        params.delete("filter");
      } else {
        params.set("filter", filter);
      }
      router.replace(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter jobs">
        {CHIPS.map(({ key, label }) => {
          const isActive = currentFilter === key;
          return (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              disabled={isPending}
              aria-pressed={isActive}
              className={[
                "cursor-pointer inline-flex min-h-[36px] items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                isActive
                  ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)] hover:text-[var(--text)] hover:ring-[var(--border-strong)]",
                isPending ? "opacity-60 !cursor-wait" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {label}
              {key !== "all" && (
                <span
                  className={[
                    "ml-1.5 text-xs tabular-nums",
                    isActive ? "opacity-75" : "opacity-60",
                  ].join(" ")}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <span className="shrink-0 text-xs text-[var(--text-muted)]">
        Sort: Match ↓
      </span>
    </div>
  );
}
