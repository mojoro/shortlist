"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { ScoreBadge } from "@/components/jobs/ScoreBadge";
import { toggleSaveJob, ignoreJob } from "@/app/(dashboard)/dashboard/actions";
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

// ─── Main component ───────────────────────────────────────────────────────────

interface JobCardProps {
  job: JobWithApplication;
  onIgnore?: (jobId: string) => void;
}

export function JobCard({ job, onIgnore }: JobCardProps) {
  const router = useRouter();
  const [savePending, startSaveTransition] = useTransition();
  const [ignorePending, startIgnoreTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(job.feedStatus === "SAVED");
  const [isIgnored, setIsIgnored] = useState(false);

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

  function handleIgnore(e: React.MouseEvent) {
    e.stopPropagation();
    setIsIgnored(true);
    startIgnoreTransition(async () => {
      try {
        await ignoreJob(job.id, job.profileId);
        onIgnore?.(job.id);
      } catch {
        setIsIgnored(false);
      }
    });
  }

  if (isIgnored) return null;

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
      className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
      style={{ boxShadow: "var(--shadow-card)" }}
      onClick={() => router.push(`/jobs/${job.id}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
      }}
    >
      {/* Top row: title + ignore button */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text)]">
            {job.title}{" "}
            <span className="font-normal text-[var(--text-muted)]">@ {job.company}</span>
          </h2>

          {/* Subtitle + source tag */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {subtitleParts.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {subtitleParts.join(" · ")}
              </span>
            )}
            <SourceTag source={job.source} />
          </div>
        </div>

        {/* Ignore button — top right */}
        <button
          onClick={handleIgnore}
          disabled={ignorePending}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/60 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-40"
          aria-label="Ignore this job"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M1 1l10 10M11 1L1 11" />
          </svg>
        </button>
      </div>

      {/* AI summary */}
      {job.aiSummary && (
        <p className="mt-3 line-clamp-1 text-sm text-[var(--text-muted)]">
          {job.aiSummary}
        </p>
      )}

      {/* Skills */}
      {displaySkills.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {displaySkills.map((skill) => (
            <SkillChip key={skill}>{skill}</SkillChip>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-[var(--text-muted)]">+{remainingCount} more</span>
          )}
        </div>
      )}

      {/* Bottom row: score badge + saved indicator on left, actions on right */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ScoreBadge score={job.aiScore} />
          {isSaved && (
            <span className="text-xs text-[var(--text-muted)]">
              <span className="mr-1 text-[var(--accent)]">•</span>saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={savePending}
            className={[
              "cursor-pointer inline-flex min-h-[32px] items-center rounded px-3 py-1 text-xs font-medium transition-colors",
              "ring-1 ring-inset ring-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)] hover:ring-[var(--border-strong)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              savePending ? "opacity-50 !cursor-wait" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isSaved ? "unsave" : "save"}
          </button>
          <Link
            href={`/tailor/${job.id}`}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer inline-flex min-h-[32px] items-center rounded bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-fg)] transition-all hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            tailor →
          </Link>
        </div>
      </div>
    </article>
  );
}
