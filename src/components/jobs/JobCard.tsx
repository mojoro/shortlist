"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState, useTransition } from "react";
import { ScoreBadge } from "@/components/jobs/ScoreBadge";
import { toggleSaveJob, requestAnalysis } from "@/app/(dashboard)/dashboard/actions";
import type { JobWithApplication } from "@/types";

// ─── Source tag styles (light + dark variants) ───────────────────────────────

const SOURCE_TAG_CLASSES: Record<string, string> = {
  GREENHOUSE:          "bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#1a2744] dark:text-[#93c5fd]",
  LEVER:               "bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#1a2744] dark:text-[#93c5fd]",
  ASHBY:               "bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#1a2744] dark:text-[#93c5fd]",
  LINKEDIN:            "bg-[#eff6ff] text-[#1e40af] dark:bg-[#172236] dark:text-[#60a5fa]",
  BERLIN_STARTUP_JOBS: "bg-[#f3e8ff] text-[#6d28d9] dark:bg-[#1e1a2e] dark:text-[#c4b5fd]",
  HONEYPOT:            "bg-[#fdf4ff] text-[#a21caf] dark:bg-[#2a1a2e] dark:text-[#e879f9]",
  YC_JOBS:             "bg-[#fff7ed] text-[#c2410c] dark:bg-[#2a1a0e] dark:text-[#fb923c]",
  NO_FLUFF_JOBS:       "bg-[#f0fdf4] text-[#15803d] dark:bg-[#1a2e1a] dark:text-[#86efac]",
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
  const classes = SOURCE_TAG_CLASSES[source];
  const label = SOURCE_LABELS[source] ?? source;

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${classes ?? "bg-[var(--bg-subtle)] text-[var(--text-muted)]"}`}
    >
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
      width="12"
      height="17"
      viewBox="4 2 16 21"
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
  const [scoreState, setScoreState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [, startScoreTransition] = useTransition();

  function handleRequestScore(e: React.MouseEvent) {
    e.stopPropagation();
    if (scoreState === "pending" || scoreState === "done") return;
    setScoreState("pending");
    startScoreTransition(async () => {
      const result = await requestAnalysis(job.profileId);
      if (result.error) {
        setScoreState("error");
        return;
      }
      setScoreState("done");
      setTimeout(() => router.refresh(), 10_000);
    });
  }

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

  const pool = job.jobPool;

  const postedDate = pool.postedAt
    ? formatDistanceToNow(new Date(pool.postedAt), { addSuffix: true })
    : null;

  const subtitleParts = [
    pool.location,
    pool.locationType ? (LOCATION_TYPE_LABELS[pool.locationType] ?? null) : null,
    pool.salary,
    postedDate,
  ].filter(Boolean);

  const displaySkills = pool.skills.slice(0, 4);
  const remainingCount = pool.skills.length - displaySkills.length;

  return (
    <article
      className={[
        "group rounded-xl border p-6 transition-all duration-200",
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
      <div className="flex items-start gap-4">
        {/* Score badge — top left */}
        {job.aiScore === null && !isIgnoredView ? (
          <button
            onClick={handleRequestScore}
            disabled={scoreState === "pending" || scoreState === "done"}
            title={
              scoreState === "done"    ? "Scoring in progress…" :
              scoreState === "error"   ? "Failed — click to retry" :
              "Request a match score"
            }
            aria-label="Request match score"
            className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {scoreState === "pending" ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : scoreState === "done" ? (
              <span className="animate-pulse text-[9px] font-semibold leading-tight text-center px-0.5">scoring</span>
            ) : scoreState === "error" ? (
              <span className="text-xs font-bold text-red-500">!</span>
            ) : (
              <span className="text-[9px] font-semibold leading-tight text-center px-0.5">Score?</span>
            )}
          </button>
        ) : (
          <ScoreBadge score={job.aiScore} />
        )}

        {/* Title + subtitle + source */}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[var(--text)]">
            {pool.title}{" "}
            <span className="font-normal text-[var(--text-muted)]">@ {pool.company}</span>
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {subtitleParts.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {subtitleParts.join(" · ")}
              </span>
            )}
            <SourceTag source={pool.source} />
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
        <p className="mt-4 line-clamp-2 text-sm text-[var(--text-muted)]">
          {job.aiSummary}
        </p>
      )}

      {/* Skills + tailor */}
      <div className="mt-4 overflow-hidden border-t border-[var(--border)] pt-4">
        {!isIgnoredView && (
          <Link
            href={`/tailor/${job.id}`}
            onClick={(e) => e.stopPropagation()}
            className="float-right ml-3 cursor-pointer inline-flex min-h-[32px] items-center rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-fg)] transition-all hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            tailor →
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {displaySkills.map((skill: string) => (
            <SkillChip key={skill}>{skill}</SkillChip>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-[var(--text-muted)]">+{remainingCount} more</span>
          )}
        </div>
      </div>
    </article>
  );
}
