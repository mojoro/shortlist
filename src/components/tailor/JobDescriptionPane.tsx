"use client";

import Link from "next/link";

interface JobDescriptionPaneProps {
  jobId: string;
  title: string;
  company: string;
  description: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function JobDescriptionPane({
  jobId,
  title,
  company,
  description,
  isCollapsed,
  onToggleCollapse,
}: JobDescriptionPaneProps) {
  if (isCollapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center gap-4 border-r border-[var(--border)] py-4">
        <button
          onClick={onToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Expand job description"
        >
          ›
        </button>
        <span
          className="text-[10px] font-medium text-[var(--text-muted)]"
          style={{ writingMode: "vertical-rl" }}
        >
          Job Description
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-[40%] shrink-0 flex-col border-r border-[var(--border)]">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <Link
            href={`/jobs/${jobId}`}
            className="mb-1 block text-xs text-[var(--text-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            ← View full details
          </Link>
          <h2 className="truncate text-sm font-bold text-[var(--text)]">{title}</h2>
          <p className="text-xs text-[var(--text-muted)]">{company}</p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Collapse job description"
        >
          ‹
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
          {description}
        </div>
      </div>
    </div>
  );
}
