"use client";

import { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob } from "@/types";
import { StatusSelect } from "@/components/pipeline/StatusSelect";
import { ApplicationDrawer } from "@/components/pipeline/ApplicationDrawer";
import { updateApplicationStatus } from "@/app/(dashboard)/pipeline/actions";

interface PipelineTableProps {
  activeApplications: ApplicationWithJob[];
  closedApplications: ApplicationWithJob[];
}

const TERMINAL_STATUSES = new Set<ApplicationStatus>([
  "ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED",
]);

const STATUS_LABELS: Record<ApplicationStatus, string> = {
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

function getFollowUpClass(followUpAt: Date | null, status: ApplicationStatus): string {
  if (!followUpAt || TERMINAL_STATUSES.has(status)) return "text-[var(--text-muted)]";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(followUpAt);
  due.setHours(0, 0, 0, 0);

  if (due < today) return "text-red-600 font-medium dark:text-red-400";
  if (due.getTime() === today.getTime()) return "text-amber-600 font-medium dark:text-amber-400";
  return "text-[var(--text)]";
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[var(--text-muted)]">—</span>;
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

export function PipelineTable({
  activeApplications,
  closedApplications,
}: PipelineTableProps) {
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  const [openDrawerAppId, setOpenDrawerAppId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticApps, applyOptimisticUpdate] = useOptimistic(
    [...activeApplications, ...closedApplications],
    (
      state: ApplicationWithJob[],
      update: { id: string; status: ApplicationStatus }
    ) => state.map((a) => (a.id === update.id ? { ...a, status: update.status } : a))
  );

  const displayedActive = optimisticApps.filter(
    (a) => !TERMINAL_STATUSES.has(a.status)
  );
  const displayedClosed = optimisticApps.filter((a) =>
    TERMINAL_STATUSES.has(a.status)
  );

  const openDrawerApp =
    openDrawerAppId != null
      ? optimisticApps.find((a) => a.id === openDrawerAppId) ?? null
      : null;

  function handleStatusChange(applicationId: string, newStatus: ApplicationStatus) {
    if (TERMINAL_STATUSES.has(newStatus)) {
      const confirmed = window.confirm(
        `Move this application to "${STATUS_LABELS[newStatus]}"? This will close it.`
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      applyOptimisticUpdate({ id: applicationId, status: newStatus });
      try {
        await updateApplicationStatus(applicationId, newStatus);
        setErrorMessage(null);
      } catch {
        setErrorMessage("Couldn't update status. Please try again.");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    });
  }

  const rows = activeTab === "active" ? displayedActive : displayedClosed;

  const TAB_STYLES = {
    active: "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
    selected: "bg-[var(--bg-card)] text-[var(--text)] shadow-sm ring-1 ring-inset ring-[var(--border)]",
    unselected: "text-[var(--text-muted)] hover:text-[var(--text)]",
  };

  return (
    <>
      <div
        id="pipeline-table"
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <nav
            className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5"
            aria-label="Pipeline filter"
          >
            {(["active", "closed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  TAB_STYLES.active,
                  activeTab === tab ? TAB_STYLES.selected : TAB_STYLES.unselected,
                ].join(" ")}
              >
                {tab === "active"
                  ? `Active (${displayedActive.length})`
                  : `Closed (${displayedClosed.length})`}
              </button>
            ))}
          </nav>
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-[var(--text)]">
              {activeTab === "active"
                ? "No active applications yet"
                : "No closed applications yet"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {activeTab === "active"
                ? "Save a job and tailor your resume to start tracking it here."
                : "Closed applications will appear here when you mark them as accepted, rejected, withdrawn, or ghosted."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Job
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] hidden sm:table-cell">
                    Applied
                  </th>
                  {activeTab === "active" ? (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] hidden md:table-cell">
                      Follow-up
                    </th>
                  ) : (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] hidden sm:table-cell">
                      Closed
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] hidden lg:table-cell">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => setOpenDrawerAppId(app.id)}
                    className={[
                      "cursor-pointer transition-colors hover:bg-[var(--bg)]",
                      openDrawerAppId === app.id ? "bg-[var(--bg)]" : "",
                      isPending ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    {/* Job */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/jobs/${app.job.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-[var(--text)] hover:text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                      >
                        {app.job.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {app.job.company}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={app.status}
                        onChange={(s) => handleStatusChange(app.id, s)}
                        disabled={isPending}
                      />
                    </td>

                    {/* Applied date */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden sm:table-cell">
                      {app.appliedAt ? (
                        <span title={format(new Date(app.appliedAt), "MMM d, yyyy")}>
                          {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Follow-up or Closed date */}
                    {activeTab === "active" ? (
                      <td className="px-4 py-3 text-xs hidden md:table-cell">
                        {app.followUpAt ? (
                          <span
                            className={getFollowUpClass(app.followUpAt, app.status)}
                            title={format(new Date(app.followUpAt), "MMM d, yyyy")}
                          >
                            {format(new Date(app.followUpAt), "MMM d")}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    ) : (
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden sm:table-cell">
                        {app.decisionAt
                          ? format(new Date(app.decisionAt), "MMM d, yyyy")
                          : app.statusUpdatedAt
                          ? format(new Date(app.statusUpdatedAt), "MMM d, yyyy")
                          : "—"}
                      </td>
                    )}

                    {/* Notes preview */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden lg:table-cell max-w-[180px]">
                      <span className="block truncate">
                        {app.notes ? app.notes.slice(0, 60) : "—"}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      <ScorePill score={app.job.aiScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error toast */}
      {errorMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-lg dark:border-red-800/50 dark:bg-red-950/60 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Drawer */}
      {openDrawerApp && (
        <ApplicationDrawer
          application={openDrawerApp}
          onClose={() => setOpenDrawerAppId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
