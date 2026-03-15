"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface FilterChipsProps {
  allCount: number;
  newCount: number;
  savedCount: number;
  appliedCount: number;
  ignoredCount: number;
}

const CHIPS = [
  { key: "all",     label: "all" },
  { key: "new",     label: "new" },
  { key: "saved",   label: "saved" },
  { key: "applied", label: "applied" },
  { key: "ignored", label: "ignored" },
] as const;

const SORT_OPTIONS = [
  { key: "match",   label: "Match" },
  { key: "newest",  label: "Newest" },
  { key: "salary",  label: "Salary" },
] as const;

type FilterKey = (typeof CHIPS)[number]["key"];
type SortKey = (typeof SORT_OPTIONS)[number]["key"];

export function FilterChips({
  allCount,
  newCount,
  savedCount,
  appliedCount,
  ignoredCount,
}: FilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentFilter = (searchParams.get("filter") ?? "all") as FilterKey;
  const rawSort = searchParams.get("sort") ?? "match";
  const currentSort: SortKey = (["match", "newest", "salary"] as string[]).includes(rawSort)
    ? (rawSort as SortKey)
    : "match";
  const currentDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const counts: Record<FilterKey, number> = {
    all:     allCount,
    new:     newCount,
    saved:   savedCount,
    applied: appliedCount,
    ignored: ignoredCount,
  };

  function navigate(updates: Record<string, string | null>) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      router.replace(`?${params.toString()}`);
    });
  }

  function handleFilterChange(filter: FilterKey) {
    navigate({ filter: filter === "all" ? null : filter });
  }

  function handleSortChange(sort: SortKey) {
    if (sort === currentSort) {
      // Toggle direction
      navigate({ dir: currentDir === "desc" ? "asc" : null });
    } else {
      // Switch to new sort (reset dir to default desc)
      navigate({ sort: sort === "match" ? null : sort, dir: null });
    }
  }

  const showDirToggle = currentSort !== "match";

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter jobs">
        {CHIPS.map(({ key, label }) => {
          const isActive = currentFilter === key;
          const isIgnored = key === "ignored";
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
                  ? isIgnored
                    ? "bg-[var(--text-muted)] text-[var(--bg-card)] shadow-sm"
                    : "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
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

      <div className="flex shrink-0 items-center gap-1">
        {SORT_OPTIONS.map(({ key, label }) => {
          const isActive = currentSort === key;
          return (
            <button
              key={key}
              onClick={() => handleSortChange(key)}
              disabled={isPending}
              className={[
                "cursor-pointer inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                isActive
                  ? "ring-1 ring-inset ring-[var(--border)] text-[var(--text)] bg-[var(--bg-card)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
                isPending ? "opacity-60 !cursor-wait" : "",
              ].filter(Boolean).join(" ")}
            >
              {label}
              {isActive && showDirToggle && (
                <span aria-hidden="true">{currentDir === "desc" ? "↓" : "↑"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
