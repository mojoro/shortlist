"use client";

import type { ApplicationStatus } from "@prisma/client";

interface StatusSelectProps {
  value: ApplicationStatus;
  onChange: (newStatus: ApplicationStatus) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "INTERESTED",   label: "Interested" },
  { value: "APPLIED",      label: "Applied" },
  { value: "SCREENING",    label: "Screening" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFER",        label: "Offer" },
  { value: "ACCEPTED",     label: "Accepted" },
  { value: "REJECTED",     label: "Rejected" },
  { value: "WITHDRAWN",    label: "Withdrawn" },
  { value: "GHOSTED",      label: "Ghosted" },
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  INTERESTED:   "text-[var(--text-muted)]",
  APPLIED:      "text-blue-600 dark:text-blue-400",
  SCREENING:    "text-purple-600 dark:text-purple-400",
  INTERVIEWING: "text-amber-600 dark:text-amber-400",
  OFFER:        "text-green-600 dark:text-green-400",
  ACCEPTED:     "text-green-700 dark:text-green-300",
  REJECTED:     "text-red-600 dark:text-red-400",
  WITHDRAWN:    "text-[var(--text-muted)]",
  GHOSTED:      "text-[var(--text-muted)]",
};

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ApplicationStatus)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={disabled}
      className={[
        "min-h-[36px] cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        STATUS_COLORS[value],
      ].join(" ")}
    >
      {STATUS_OPTIONS.map(({ value: v, label }) => (
        <option key={v} value={v} className="text-[var(--text)]">
          {label}
        </option>
      ))}
    </select>
  );
}
