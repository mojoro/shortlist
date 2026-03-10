"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState, useTransition } from "react";
import { ScoreBadge } from "@/components/jobs/ScoreBadge";
import { toggleSaveJob } from "@/app/(dashboard)/dashboard/actions";
import type { JobWithApplication } from "@/types";

// ─── Source tag styles ────────────────────────────────────────────────────────

const SOURCE_TAG_STYLES: Record<string, { bg: string; color: string }> = {
  GREENHOUSE:          { bg: "#1a2744", color: "#93c5fd" },
  LEVER:               { bg: "#1a2744", color: "#93c5fd" },
  ASHBY:               { bg: "#1a2744", color: "#93c5fd" },
  LINKEDIN:            { bg: "#172236", color: "#60a5fa" },
  BERLIN_STARTUP_JOBS: { bg: "#1e1a2e", color: "#c4b5fd" },
  HONEYPOT:            { bg: "#2a1a2e", color: "#e879f9" },
  YC_JOBS:             { bg: "#2a1a0e", color: "#fb923c" },
  NO_FLUFF_JOBS:       { bg: "#1a2e1a", color: "#86efac" },
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
  const style = SOURCE_TAG_STYLES[source];
  const label = SOURCE_LABELS[source] ?? source;
  if (style) {
    return (
      <span
        className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-[--bg-subtle] px-1.5 py-0.5 text-xs font-medium text-[--text-muted]">
      {label}
    </span>
  );
}

function SkillChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs text-[--text-muted] ring-1 ring-inset ring-[--border]">
      {children}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface JobCardProps {
  job: JobWithApplication;
}

export function JobCard({ job }: JobCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(job.feedStatus === "SAVED");

  function handleSave() {
    const next = !isSaved;
    setIsSaved(next);
    startTransition(async () => {
      try {
        await toggleSaveJob(job.id, job.profileId, next);
      } catch {
        setIsSaved(!next); // revert on error
      }
    });
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
    <article className="rounded-xl border border-[--border] bg-[--bg-card] p-5 transition-shadow hover:shadow-sm">
      {/* Top row: title + score badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[--text]">
            {job.title}{" "}
            <span className="font-normal text-[--text-muted]">@ {job.company}</span>
          </h2>

          {/* Subtitle + source tag */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {subtitleParts.length > 0 && (
              <span className="text-xs text-[--text-muted]">
                {subtitleParts.join(" · ")}
              </span>
            )}
            <SourceTag source={job.source} />
          </div>
        </div>
        <ScoreBadge score={job.aiScore} />
      </div>

      {/* AI summary */}
      {job.aiSummary && (
        <p className="mt-3 line-clamp-1 text-sm text-[--text-muted]">
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
            <span className="text-xs text-[--text-muted]">+{remainingCount} more</span>
          )}
        </div>
      )}

      {/* Bottom row: saved indicator + action buttons */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          {isSaved && (
            <span className="text-xs text-[--text-muted]">
              <span className="mr-1 text-[--accent]">•</span>saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className={[
              "inline-flex min-h-[32px] items-center rounded px-3 py-1 text-xs font-medium transition-colors",
              "ring-1 ring-inset ring-[--border] text-[--text-muted] hover:text-[--text]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]",
              isPending ? "opacity-50 cursor-wait" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isSaved ? "unsave" : "save"}
          </button>
          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex min-h-[32px] items-center rounded px-3 py-1 text-xs font-medium text-[--text-muted] ring-1 ring-inset ring-[--border] transition-colors hover:text-[--text] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
          >
            view
          </Link>
          <Link
            href={`/tailor/${job.id}`}
            className="inline-flex min-h-[32px] items-center rounded bg-[--accent] px-3 py-1 text-xs font-medium text-[--accent-fg] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
          >
            tailor →
          </Link>
        </div>
      </div>
    </article>
  );
}
