"use client";

const SORT_OPTIONS = [
  { key: "updated", label: "Last updated" },
  { key: "status", label: "Status" },
  { key: "applied", label: "Applied date" },
  { key: "score", label: "Match score" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

interface PipelineSortBarProps {
  sort: string;
  dir: string;
  onSortChange: (sort: string, dir: string) => void;
}

export function PipelineSortBar({ sort, dir, onSortChange }: PipelineSortBarProps) {
  const currentSort: SortKey = (
    ["updated", "status", "applied", "score"] as string[]
  ).includes(sort)
    ? (sort as SortKey)
    : "updated";
  const currentDir = dir === "asc" ? "asc" : "desc";

  function handleSortChange(key: SortKey) {
    if (key === currentSort) {
      // Toggle direction
      onSortChange(key, currentDir === "asc" ? "desc" : "asc");
    } else {
      onSortChange(key, "desc");
    }
  }

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap"
      role="group"
      aria-label="Sort applications"
    >
      <span className="mr-1 text-xs text-[var(--text-muted)]">Sort:</span>
      {SORT_OPTIONS.map(({ key, label }) => {
        const isActive = currentSort === key;
        return (
          <button
            key={key}
            onClick={() => handleSortChange(key)}
            className={[
              "cursor-pointer inline-flex min-h-[32px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              isActive
                ? "bg-[var(--bg-card)] text-[var(--text)] ring-1 ring-inset ring-[var(--border)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
            {isActive && (
              <span aria-hidden="true">
                {currentDir === "asc" ? "\u2191" : "\u2193"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
