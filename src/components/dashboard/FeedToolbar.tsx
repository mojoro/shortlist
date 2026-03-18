"use client";

interface FeedToolbarProps {
  allCount: number;
  newCount: number;
  savedCount: number;
  appliedCount: number;
  ignoredCount: number;
  avgScore: number | null;
  lastUpdatedText: string | null;
  filter: string;
  sort: string;
  dir: string;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
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


export function FeedToolbar({
  allCount,
  newCount,
  savedCount,
  appliedCount,
  ignoredCount,
  filter,
  sort,
  dir,
  onFilterChange,
  onSortChange,
}: FeedToolbarProps) {
  const currentFilter = filter as FilterKey;
  const currentSort = sort;
  const currentDir = dir;

  const counts: Record<FilterKey, number> = {
    all:     allCount,
    new:     newCount,
    saved:   savedCount,
    applied: appliedCount,
    ignored: ignoredCount,
  };

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
                onClick={() => onFilterChange(key)}
                aria-pressed={isActive}
                className={[
                  "relative cursor-pointer px-1 pb-0.5 pt-1 text-sm font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                  isActive
                    ? "text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
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
              onClick={() => onSortChange(key)}
              className={[
                "cursor-pointer inline-flex min-h-[32px] items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                isActive
                  ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)]",
              ].filter(Boolean).join(" ")}
            >
              {label}
              {isActive && showDirToggle && (
                <span aria-hidden="true">{currentDir === "desc" ? "\u2193" : "\u2191"}</span>
              )}
            </button>
          );
        })}

      </div>

    </div>
  );
}
