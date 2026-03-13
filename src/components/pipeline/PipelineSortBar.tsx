"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const SORT_OPTIONS = [
  { key: "updated",  label: "Last updated" },
  { key: "status",   label: "Status" },
  { key: "applied",  label: "Applied date" },
  { key: "score",    label: "Match score" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

export function PipelineSortBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const rawSort = searchParams.get("sort") ?? "updated";
  const currentSort: SortKey = (["updated", "status", "applied", "score"] as string[]).includes(rawSort)
    ? (rawSort as SortKey)
    : "updated";
  const currentDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  function handleSortChange(sort: SortKey) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (sort === currentSort) {
        // Toggle direction
        if (currentDir === "asc") params.delete("dir");
        else params.set("dir", "asc");
      } else {
        if (sort === "updated") params.delete("sort");
        else params.set("sort", sort);
        params.delete("dir");
      }
      router.replace(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Sort applications">
      <span className="mr-1 text-xs text-[var(--text-muted)]">Sort:</span>
      {SORT_OPTIONS.map(({ key, label }) => {
        const isActive = currentSort === key;
        return (
          <button
            key={key}
            onClick={() => handleSortChange(key)}
            disabled={isPending}
            className={[
              "cursor-pointer inline-flex min-h-[32px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              isActive
                ? "bg-[var(--bg-card)] text-[var(--text)] ring-1 ring-inset ring-[var(--border)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]",
              isPending ? "opacity-60 !cursor-wait" : "",
            ].filter(Boolean).join(" ")}
          >
            {label}
            {isActive && (
              <span aria-hidden="true">{currentDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
