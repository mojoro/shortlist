"use client";

import type { ApplicationWithJob } from "@/types";
import { CardNotes } from "./CardNotes";

interface KanbanCardProps {
  application: ApplicationWithJob;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onNotesChange: (notes: string) => void;
  onPdfPreview: () => void;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 90
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
      : score >= 75
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {score}
    </span>
  );
}

function FollowUpBadge({ followUpAt }: { followUpAt: Date | null }) {
  if (!followUpAt) return null;
  const due = new Date(followUpAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const isOverdue = due < today;
  const isToday = due.getTime() === today.getTime();

  if (!isOverdue && !isToday) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${
        isOverdue
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isOverdue ? "bg-red-500" : "bg-amber-500"}`}
      />
      {isOverdue ? "Overdue" : "Today"}
    </span>
  );
}

export function KanbanCard({
  application,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  onNotesChange,
  onPdfPreview,
}: KanbanCardProps) {
  const { jobPool } = application.job;
  const skills = jobPool.skills?.slice(0, 3) ?? [];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={[
        "cursor-grab rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 transition-all active:cursor-grabbing",
        "hover:border-[var(--border-strong)]",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Company */}
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {jobPool.company}
      </p>

      {/* Title */}
      <p className="mt-0.5 truncate text-sm font-semibold leading-snug text-[var(--text)]">
        {jobPool.title}
      </p>

      {/* Location */}
      {jobPool.location && (
        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 opacity-50"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">{jobPool.location}</span>
        </p>
      )}

      {/* Notes */}
      <div className="mt-2">
        <CardNotes notes={application.notes} onNotesChange={onNotesChange} />
      </div>

      {/* Skill tags */}
      {skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Footer: score, follow-up, PDF */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ScorePill score={application.job.aiScore} />
          <FollowUpBadge followUpAt={application.followUpAt} />
        </div>

        {application.exportedResumeMarkdown && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPdfPreview();
            }}
            title="View exported resume"
            className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
