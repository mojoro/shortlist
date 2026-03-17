"use client";

import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { JobDescription } from "@/components/jobs/JobDescription";

const LOCATION_TYPE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
};

const SCORE_CONFIGS = [
  { min: 90, label: "Strong match", className: "bg-green-600 text-white" },
  { min: 75, label: "Good match",   className: "bg-amber-500 text-white" },
  { min: 0,  label: "Weak match",   className: "bg-red-600 text-white" },
] as const;

function getScoreConfig(score: number) {
  return SCORE_CONFIGS.find((c) => score >= c.min) ?? SCORE_CONFIGS[2];
}

interface JobDescriptionPaneProps {
  jobId: string;
  title: string;
  company: string;
  description: string;
  jobUrl: string;
  location: string | null;
  locationType: string | null;
  jobType: string | null;
  salary: string | null;
  postedAt: string | null;
  skills: string[];
  aiScore: number | null;
  aiSummary: string | null;
  aiMatchPoints: string[];
  aiGapPoints: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function JobDescriptionPane({
  jobId,
  title,
  company,
  description,
  jobUrl,
  location,
  locationType,
  jobType,
  salary,
  postedAt,
  skills,
  aiScore,
  aiSummary,
  aiMatchPoints,
  aiGapPoints,
  isCollapsed,
  onToggleCollapse,
}: JobDescriptionPaneProps) {
  if (isCollapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center gap-4 border-r border-[var(--border)] py-4">
        <button
          onClick={onToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Expand job details"
        >
          ›
        </button>
        <span
          className="text-[10px] font-medium text-[var(--text-muted)]"
          style={{ writingMode: "vertical-rl" }}
        >
          Job Details
        </span>
      </div>
    );
  }

  const metaParts = [
    location,
    locationType ? LOCATION_TYPE_LABELS[locationType] : null,
    jobType ? JOB_TYPE_LABELS[jobType] : null,
    salary,
  ].filter(Boolean) as string[];

  const postedDateRelative = postedAt
    ? formatDistanceToNow(new Date(postedAt), { addSuffix: true })
    : null;
  const postedDateFull = postedAt ? format(new Date(postedAt), "MMM d, yyyy") : null;

  const scoreConfig = aiScore !== null ? getScoreConfig(aiScore) : null;

  return (
    <div className="flex min-w-0 w-[40%] shrink-0 flex-col border-r border-[var(--border)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <Link
            href={`/jobs/${jobId}`}
            className="mb-1 block text-xs text-[var(--text-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            ← Back to job details
          </Link>
          <h2 className="truncate text-sm font-bold text-[var(--text)]">{title}</h2>
          <p className="text-xs text-[var(--text-muted)]">{company}</p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Collapse job details"
        >
          ‹
        </button>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Meta row */}
        {(metaParts.length > 0 || postedDateRelative) && (
          <div className="space-y-1">
            {metaParts.length > 0 && (
              <p className="text-xs text-[var(--text-muted)]">{metaParts.join(" · ")}</p>
            )}
            {postedDateRelative && (
              <p className="text-xs text-[var(--text-muted)]" title={postedDateFull ?? undefined}>
                Posted {postedDateRelative}
              </p>
            )}
            <a
              href={jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-[var(--accent)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              View original posting ↗
            </a>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded px-2 py-0.5 text-xs text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* AI match panel */}
        {aiScore !== null && scoreConfig && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3 space-y-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${scoreConfig.className}`}
                aria-label={`${aiScore} — ${scoreConfig.label}`}
              >
                {aiScore}
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">{scoreConfig.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Match score</p>
              </div>
            </div>

            {aiSummary && (
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">{aiSummary}</p>
            )}

            {aiMatchPoints.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Why it fits
                </p>
                <ul className="space-y-1">
                  {aiMatchPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text)]">
                      <span className="mt-0.5 shrink-0 font-bold text-green-600 dark:text-green-400">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiGapPoints.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Gaps to address
                </p>
                <ul className="space-y-1">
                  {aiGapPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text)]">
                      <span className="mt-0.5 shrink-0 font-bold text-red-500 dark:text-red-400">✗</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Job description */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Job description
          </p>
          <JobDescription source={description} />
        </div>
      </div>
    </div>
  );
}
