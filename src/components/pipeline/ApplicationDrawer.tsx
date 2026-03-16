"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob, FieldOverrides } from "@/types";
import { StatusSelect } from "@/components/pipeline/StatusSelect";

interface ApplicationDrawerProps {
  application: ApplicationWithJob;
  fields: FieldOverrides;
  onFieldChange: (field: keyof FieldOverrides, value: string) => void;
  onClose: () => void;
  onStatusChange: (applicationId: string, status: ApplicationStatus) => void;
}

export function ApplicationDrawer({
  application,
  fields,
  onFieldChange,
  onClose,
  onStatusChange,
}: ApplicationDrawerProps) {
  // Visual save feedback — shows "Saving…" briefly after any field edit
  const [showSaving, setShowSaving] = useState(false);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset saving indicator when a different application is opened
  useEffect(() => {
    setShowSaving(false);
  }, [application.id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    };
  }, []);

  function handleChange(field: keyof FieldOverrides, value: string) {
    onFieldChange(field, value);
    setShowSaving(true);
    if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    savingTimerRef.current = setTimeout(() => setShowSaving(false), 2000);
  }

  const keyDates: { label: string; value: Date | null }[] = [
    { label: "Added to pipeline", value: application.createdAt },
    { label: "Offer received",    value: application.offerReceivedAt },
    { label: "Decision",          value: application.decisionAt },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg-card)]"
        style={{ boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
        aria-label="Application details"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {application.job.jobPool.company}
            </p>
            <h2 className="mt-0.5 text-base font-bold leading-snug text-[var(--text)]">
              {application.job.jobPool.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]]"
            aria-label="Close panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status row */}
        <div className="shrink-0 border-b border-[var(--border)] px-5 py-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Status
          </p>
          <StatusSelect
            value={application.status}
            onChange={(s) => onStatusChange(application.id, s)}
          />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Notes */}
          <div>
            <label
              htmlFor="app-notes"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Your notes
            </label>
            <textarea
              id="app-notes"
              value={fields.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={5}
              placeholder="Add notes about this application…"
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
          </div>

          {/* Applied date */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Applied date
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fields.appliedAt}
                onChange={(e) => handleChange("appliedAt", e.target.value)}
                className="min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
              {fields.appliedAt && (
                <button
                  onClick={() => handleChange("appliedAt", "")}
                  className="text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Follow-up date */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Follow-up reminder
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fields.followUpAt}
                onChange={(e) => handleChange("followUpAt", e.target.value)}
                className="min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
              {fields.followUpAt && (
                <button
                  onClick={() => handleChange("followUpAt", "")}
                  className="text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Recruiter info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Recruiter
            </p>
            <div>
              <label
                htmlFor="recruiter-name"
                className="mb-1 block text-xs text-[var(--text-muted)]"
              >
                Name
              </label>
              <input
                id="recruiter-name"
                type="text"
                value={fields.recruiterName}
                onChange={(e) => handleChange("recruiterName", e.target.value)}
                placeholder="e.g. Jane Smith"
                className="w-full min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label
                htmlFor="recruiter-email"
                className="mb-1 block text-xs text-[var(--text-muted)]"
              >
                Email
              </label>
              <input
                id="recruiter-email"
                type="email"
                value={fields.recruiterEmail}
                onChange={(e) => handleChange("recruiterEmail", e.target.value)}
                placeholder="e.g. jane@company.com"
                className="w-full min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
          </div>

          {/* Key dates */}
          {keyDates.some((d) => d.value) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Key dates
              </p>
              <ul className="space-y-1.5">
                {keyDates
                  .filter((d) => d.value)
                  .map(({ label, value }) => (
                    <li key={label} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{label}</span>
                      <span className="font-medium text-[var(--text)]">
                        {format(new Date(value!), "MMM d, yyyy")}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Quick links */}
          <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
            <Link
              href={`/jobs/${application.job.id}`}
              className="text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              View job listing
            </Link>
            <Link
              href={`/tailor/${application.job.id}`}
              className="text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              Tailor resume
            </Link>
            <a
              href={application.job.jobPool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              Open original posting ↗
            </a>
          </div>
        </div>

        {/* Save indicator */}
        <div className="shrink-0 border-t border-[var(--border)] px-5 py-3">
          <p className="text-xs text-[var(--text-muted)]">
            {showSaving ? "Saving…" : "All changes saved"}
          </p>
        </div>
      </aside>
    </>
  );
}
