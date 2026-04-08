"use client";

import { format } from "date-fns";
import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob, FieldOverrides } from "@/types";
import { TERMINAL_STATUSES } from "@/lib/pipeline-constants";

export { TERMINAL_STATUSES };

// ── Human-readable status labels ────────────────────────────────────────────

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  INTERESTED:   "Interested",
  APPLIED:      "Applied",
  SCREENING:    "Screening",
  INTERVIEWING: "Interviewing",
  OFFER:        "Offer",
  ACCEPTED:     "Accepted",
  REJECTED:     "Rejected",
  WITHDRAWN:    "Withdrawn",
  GHOSTED:      "Ghosted",
};

// ── Field defaults from an application ──────────────────────────────────────

export function getDefaultFields(app: ApplicationWithJob): FieldOverrides {
  return {
    notes:          app.notes ?? "",
    appliedAt:      app.appliedAt
      ? format(new Date(app.appliedAt), "yyyy-MM-dd")
      : "",
    followUpAt:     app.followUpAt
      ? format(new Date(app.followUpAt), "yyyy-MM-dd")
      : "",
    recruiterName:  app.recruiterName ?? "",
    recruiterEmail: app.recruiterEmail ?? "",
  };
}

// ── Score pill ──────────────────────────────────────────────────────────────

export function ScorePill({ score, showEmpty = false }: { score: number | null; showEmpty?: boolean }) {
  if (score === null) {
    return showEmpty ? <span className="text-[var(--text-muted)]">—</span> : null;
  }
  const color =
    score >= 90 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
    score >= 75 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${color}`}>
      {score}
    </span>
  );
}
