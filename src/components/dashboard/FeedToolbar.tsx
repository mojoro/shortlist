"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface FeedToolbarProps {
  allCount: number;
  newCount: number;
  savedCount: number;
  appliedCount: number;
  ignoredCount: number;
  avgScore: number | null;
  lastUpdatedText: string | null;
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


export function FeedToolbar({
  allCount,
  newCount,
  savedCount,
  appliedCount,
  ignoredCount,
}: FeedToolbarProps) {
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
      navigate({ dir: currentDir === "desc" ? "asc" : null });
    } else {
      navigate({ sort: sort === "match" ? null : sort, dir: null });
    }
  }

  const showDirToggle = currentSort !== "match";


  return (
    <div className="flex flex-wrap items-center justify-center gap-y-3 sm:justify-between">
      {/* Filter tabs — second on mobile, first on sm+ */}
      <div className="order-2 flex items-center sm:order-1" role="group" aria-label="Filter jobs">
        {CHIPS.map(({ key, label }, index) => {
          const isActive = currentFilter === key;
          return (
            <div key={key} className="flex items-center">
              {index > 0 && (
                <span
                  className="mx-1.5 h-3.5 w-px bg-[var(--border)]"
                  aria-hidden="true"
                />
              )}
              <button
                onClick={() => handleFilterChange(key)}
                disabled={isPending}
                aria-pressed={isActive}
                className={[
                  "relative cursor-pointer px-1 pb-0.5 pt-1 text-sm font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                  isActive
                    ? "text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  isPending ? "opacity-60 !cursor-wait" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
                {key !== "all" && (
                  <span className={["ml-1 text-xs tabular-nums", isActive ? "opacity-70" : "opacity-50"].join(" ")}>
                    {counts[key]}
                  </span>
                )}
                {/* Animated underline indicator */}
                <span
                  className={[
                    "absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--accent)] transition-all duration-200",
                    isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Sort + inline stats — first on mobile, second on sm+ */}
      <div className="order-1 flex shrink-0 items-center gap-0.5 sm:order-2">
        {SORT_OPTIONS.map(({ key, label }) => {
          const isActive = currentSort === key;
          return (
            <button
              key={key}
              onClick={() => handleSortChange(key)}
              disabled={isPending}
              className={[
                "cursor-pointer inline-flex min-h-[32px] items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                isActive
                  ? "text-[var(--text)] bg-[var(--bg-subtle)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)]",
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
