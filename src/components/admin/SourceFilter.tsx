"use client";

import { useRouter, useSearchParams } from "next/navigation";

function formatSource(source: string) {
  return source
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SourceFilterProps {
  sources: string[];
  current: string | undefined;
}

export function SourceFilter({ sources, current }: SourceFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClick(source: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (source) {
      params.set("source", source);
    } else {
      params.delete("source");
    }
    params.delete("page");
    router.replace(`/admin/pool?${params.toString()}`);
  }

  const activeClasses =
    "bg-[var(--accent-muted)] text-[var(--accent)]";
  const inactiveClasses =
    "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text)]";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleClick(undefined)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          !current ? activeClasses : inactiveClasses
        }`}
      >
        All
      </button>
      {sources.map((source) => (
        <button
          key={source}
          onClick={() => handleClick(source)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            current === source ? activeClasses : inactiveClasses
          }`}
        >
          {formatSource(source)}
        </button>
      ))}
    </div>
  );
}
