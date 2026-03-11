"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { ScoreBadge } from "@/components/jobs/ScoreBadge";
import { toggleSaveJob } from "@/app/(dashboard)/dashboard/actions";
import type { JobWithApplication } from "@/types";

// ─── Source tag styles (light + dark variants) ───────────────────────────────

const SOURCE_TAG_STYLES: Record<
  string,
  { lightBg: string; lightColor: string; darkBg: string; darkColor: string }
> = {
  GREENHOUSE:          { lightBg: "#dbeafe", lightColor: "#1d4ed8", darkBg: "#1a2744", darkColor: "#93c5fd" },
  LEVER:               { lightBg: "#dbeafe", lightColor: "#1d4ed8", darkBg: "#1a2744", darkColor: "#93c5fd" },
  ASHBY:               { lightBg: "#dbeafe", lightColor: "#1d4ed8", darkBg: "#1a2744", darkColor: "#93c5fd" },
  LINKEDIN:            { lightBg: "#eff6ff", lightColor: "#1e40af", darkBg: "#172236", darkColor: "#60a5fa" },
  BERLIN_STARTUP_JOBS: { lightBg: "#f3e8ff", lightColor: "#6d28d9", darkBg: "#1e1a2e", darkColor: "#c4b5fd" },
  HONEYPOT:            { lightBg: "#fdf4ff", lightColor: "#a21caf", darkBg: "#2a1a2e", darkColor: "#e879f9" },
  YC_JOBS:             { lightBg: "#fff7ed", lightColor: "#c2410c", darkBg: "#2a1a0e", darkColor: "#fb923c" },
  NO_FLUFF_JOBS:       { lightBg: "#f0fdf4", lightColor: "#15803d", darkBg: "#1a2e1a", darkColor: "#86efac" },
};

const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN:            "LinkedIn",
  GREENHOUSE:          "Greenhouse",
  LEVER:               "Lever",
  ASHBY:               "Ashby",
  INDEED:              "Indeed",
  BERLIN_STARTUP_JOBS: "Berlin Startup Jobs",
  HONEYPOT:            "Honeypot",
  YC_JOBS:             "Y Combinator",
  NO_FLUFF_JOBS:       "No Fluff Jobs",
  CUSTOM:              "Custom",
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceTag({ source }: { source: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const style = SOURCE_TAG_STYLES[source];
  const label = SOURCE_LABELS[source] ?? source;

  if (style) {
    const bg = isDark ? style.darkBg : style.lightBg;
    const color = isDark ? style.darkColor : style.lightColor;
    return (
      <span
        className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: bg, color }}
      >
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
      {label}
    </span>
  );
}

function SkillChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]">
      {children}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface JobCardProps {
  job: JobWithApplication;
  index: number;
  isSelected?: boolean;
  onIgnore?: (jobId: string) => void;
  onUnignore?: (jobId: string) => void;
  onSelect?: (jobId: string, e: React.MouseEvent, index: number) => void;
}

export function JobCard({
  job,
  index,
  isSelected = false,
  onIgnore,
  onUnignore,
  onSelect,
}: JobCardProps) {
  const router = useRouter();
  const [savePending, startSaveTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(job.feedStatus === "SAVED");

  const isIgnoredView = job.feedStatus === "ARCHIVED";

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !isSaved;
    setIsSaved(next);
    startSaveTransition(async () => {
      try {
        await toggleSaveJob(job.id, job.profileId, next);
      } catch {
        setIsSaved(!next);
      }
    });
  }

  function handleCardClick(e: React.MouseEvent) {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      onSelect?.(job.id, e, index);
      return;
    }
    router.push(`/jobs/${job.id}`);
  }

  const postedDate = job.postedAt
    ? formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })
    : null;

  const subtitleParts = [
    job.location,
    job.locationType ? (LOCATION_TYPE_LABELS[job.locationType] ?? null) : null,
    job.salary,
    postedDate,
  ].filter(Boolean);

  const displaySkills = job.skills.slice(0, 4);
  const remainingCount = job.skills.length - displaySkills.length;

  return (
    <article
      className={[
        "group rounded-xl border p-5 transition-all duration-200",
        isSelected
          ? "cursor-default border-[var(--accent)] bg-[var(--accent-muted)]"
          : isIgnoredView
            ? "cursor-pointer border-[var(--border)] bg-[var(--bg-card)] opacity-80 hover:border-[var(--border-strong)] hover:opacity-100"
            : "cursor-pointer border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]",
      ].join(" ")}
      style={{ boxShadow: "var(--shadow-card)" }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
      }}
    >
      {/* Top row: score · title/subtitle/source · bookmark · ×/✓ */}
      <div className="flex items-start gap-3">
        {/* Score badge — top left */}
        <ScoreBadge score={job.aiScore} />

        {/* Title + subtitle + source */}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[var(--text)]">
            {job.title}{" "}
            <span className="font-normal text-[var(--text-muted)]">@ {job.company}</span>
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {subtitleParts.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {subtitleParts.join(" · ")}
              </span>
            )}
            <SourceTag source={job.source} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-0.5">
          {/* Bookmark — feed view only */}
          {!isIgnoredView && (
            <button
              onClick={handleSave}
              disabled={savePending}
              className={[
                "cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                isSaved
                  ? "text-[var(--accent)] hover:opacity-70"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
                savePending ? "opacity-50 !cursor-wait" : "",
              ].filter(Boolean).join(" ")}
              aria-label={isSaved ? "Unsave job" : "Save job"}
            >
              <BookmarkIcon filled={isSaved} />
            </button>
          )}

          {/* Ignore (×) or Unignore (✓) */}
          {isIgnoredView ? (
            <button
              onClick={(e) => { e.stopPropagation(); onUnignore?.(job.id); }}
              className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/50 dark:hover:text-green-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              aria-label="Restore this job"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1.5 7L5 10.5L11.5 2.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onIgnore?.(job.id); }}
              className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/60 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Ignore this job"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* AI summary */}
      {job.aiSummary && (
        <p className="mt-3 line-clamp-1 text-sm text-[var(--text-muted)]">
          {job.aiSummary}
        </p>
      )}

      {/* Skills + tailor on the same row */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {displaySkills.map((skill) => (
            <SkillChip key={skill}>{skill}</SkillChip>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-[var(--text-muted)]">+{remainingCount} more</span>
          )}
        </div>

        {!isIgnoredView && (
          <Link
            href={`/tailor/${job.id}`}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer shrink-0 inline-flex min-h-[32px] items-center rounded bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-fg)] transition-all hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            tailor →
          </Link>
        )}
      </div>
    </article>
  );
}
