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
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
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
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:ring-offset-2",
              isActive
                ? "bg-[--accent] text-[--accent-fg]"
                : "bg-[--bg] text-[--text] ring-1 ring-inset ring-[--border] hover:bg-[--bg-subtle]",
              isPending ? "opacity-60 cursor-wait" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
            <span
              className={[
                "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-[--bg-subtle] text-[--text-muted]",
              ].join(" ")}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
