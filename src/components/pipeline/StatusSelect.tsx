"use client";

import type { ApplicationStatus } from "@prisma/client";

interface StatusSelectProps {
  value: ApplicationStatus;
  onChange: (newStatus: ApplicationStatus) => void;
  disabled?: boolean;
  jobId?: string;
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

export function StatusSelect({ value, onChange, disabled, jobId }: StatusSelectProps) {
  const currentLabel = STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="relative inline-flex items-stretch">
      {/* Hidden sizer — same padding/font as the select, drives the wrapper width */}
      <span
        className="invisible whitespace-nowrap pl-2 pr-8.5 py-2 text-sm font-medium"
        aria-hidden="true"
      >
        {currentLabel}
      </span>

      {/* Select fills the wrapper exactly */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ApplicationStatus)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={disabled}
        id={"stat-" + jobId}
        className={[
          "absolute inset-0 appearance-none cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-2 pr-8 py-2 text-sm font-medium transition-colors",
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

      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${STATUS_COLORS[value]}`}
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
