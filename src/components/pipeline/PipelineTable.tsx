"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob, FieldOverrides } from "@/types";
import { StatusSelect } from "@/components/pipeline/StatusSelect";
import { ApplicationDrawer } from "@/components/pipeline/ApplicationDrawer";
import {
  TERMINAL_STATUSES,
  STATUS_LABELS,
  getDefaultFields,
  ScorePill,
} from "@/components/pipeline/shared";
import { useDashboardStore } from "@/lib/store";

const ResumePDFModal = dynamic(
  () =>
    import("@/components/pipeline/ResumePDFModal").then(
      (m) => m.ResumePDFModal
    ),
  { ssr: false }
);

interface PipelineTableProps {
  activeApplications: ApplicationWithJob[];
  closedApplications: ApplicationWithJob[];
}

function getFollowUpClass(followUpStr: string, status: ApplicationStatus): string {
  if (!followUpStr || TERMINAL_STATUSES.has(status)) return "text-[var(--text-muted)]";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(followUpStr + "T00:00:00");
  if (due < today) return "text-red-600 font-medium dark:text-red-400";
  if (due.getTime() === today.getTime()) return "text-amber-600 font-medium dark:text-amber-400";
  return "text-[var(--text)]";
}

export function PipelineTable({
  activeApplications,
  closedApplications,
}: PipelineTableProps) {
  const storeUpdateAppStatus = useDashboardStore((s) => s.updateAppStatus);
  const storeUpdateAppDetail = useDashboardStore((s) => s.updateAppDetail);
  const storeBulkRemove = useDashboardStore((s) => s.bulkRemoveApps);

  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  const [openDrawerAppId, setOpenDrawerAppId] = useState<string | null>(null);
  const [pdfPreviewFor, setPdfPreviewFor] = useState<string | null>(null);
  const [editingNotesFor, setEditingNotesFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Field overrides: display state for editable fields, keyed by appId
  const [fieldOverrides, setFieldOverrides] = useState<Map<string, FieldOverrides>>(new Map());
  // Pending saves: latest values for debounce callback (avoids stale closure)
  const pendingSaves = useRef<Map<string, FieldOverrides>>(new Map());
  const saveTimers   = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Terminal overrides: shown in UI while undo toast is active
  const [terminalOverrides, setTerminalOverrides] = useState<Map<string, ApplicationStatus>>(new Map());

  // Undo toast state
  const [undoState, setUndoState] = useState<{
    applicationId:  string;
    previousStatus: ApplicationStatus;
    newStatus:      ApplicationStatus;
    label:          string;
    timeoutId:      ReturnType<typeof setTimeout>;
  } | null>(null);

  const allApps = [...activeApplications, ...closedApplications];

  // Apply terminal overrides on top of store-provided apps
  const displayApps = allApps.map((a) =>
    terminalOverrides.has(a.id) ? { ...a, status: terminalOverrides.get(a.id)! } : a
  );

  const displayedActive = displayApps.filter((a) => !TERMINAL_STATUSES.has(a.status));
  const displayedClosed = displayApps.filter((a) => TERMINAL_STATUSES.has(a.status));

  const openDrawerApp =
    openDrawerAppId != null
      ? displayApps.find((a) => a.id === openDrawerAppId) ?? null
      : null;

  const pdfPreviewApp =
    pdfPreviewFor != null
      ? displayApps.find((a) => a.id === pdfPreviewFor) ?? null
      : null;

  function getFields(app: ApplicationWithJob): FieldOverrides {
    return fieldOverrides.get(app.id) ?? getDefaultFields(app);
  }

  function handleFieldChange(appId: string, field: keyof FieldOverrides, value: string) {
    const app = allApps.find((a) => a.id === appId);
    const defaults = app ? getDefaultFields(app) : { notes: "", appliedAt: "", followUpAt: "", recruiterName: "", recruiterEmail: "" };

    setFieldOverrides((prev) => {
      const next = new Map(prev);
      const current = prev.get(appId) ?? defaults;
      next.set(appId, { ...current, [field]: value });
      return next;
    });

    const currentPending = pendingSaves.current.get(appId) ?? defaults;
    pendingSaves.current.set(appId, { ...currentPending, [field]: value });

    const existing = saveTimers.current.get(appId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      saveTimers.current.delete(appId);
      const fields = pendingSaves.current.get(appId);
      if (!fields) return;
      storeUpdateAppDetail(appId, {
        notes:          fields.notes,
        appliedAt:      fields.appliedAt,
        followUpAt:     fields.followUpAt,
        recruiterName:  fields.recruiterName,
        recruiterEmail: fields.recruiterEmail,
      });
    }, 1500);

    saveTimers.current.set(appId, timer);
  }

  function handleStatusChange(applicationId: string, newStatus: ApplicationStatus) {
    const app = displayApps.find((a) => a.id === applicationId);
    if (!app) return;
    const previousStatus = app.status;

    if (TERMINAL_STATUSES.has(newStatus)) {
      // Dismiss any existing undo toast — commit its status via the store
      if (undoState) {
        clearTimeout(undoState.timeoutId);
        const { applicationId: prevId, newStatus: prevNew } = undoState;
        setTerminalOverrides((prev) => {
          const next = new Map(prev);
          next.delete(prevId);
          return next;
        });
        setUndoState(null);
        storeUpdateAppStatus(prevId, prevNew);
      }

      // Apply terminal override for immediate UI update
      setTerminalOverrides((prev) => new Map(prev).set(applicationId, newStatus));

      const timeoutId = setTimeout(() => {
        setUndoState(null);
        setTerminalOverrides((prev) => {
          const next = new Map(prev);
          next.delete(applicationId);
          return next;
        });
        storeUpdateAppStatus(applicationId, newStatus);
      }, 5000);

      setUndoState({
        applicationId,
        previousStatus,
        newStatus,
        label: STATUS_LABELS[newStatus],
        timeoutId,
      });
    } else {
      storeUpdateAppStatus(applicationId, newStatus);
    }
  }

  function handleUndo() {
    if (!undoState) return;
    clearTimeout(undoState.timeoutId);
    setTerminalOverrides((prev) => {
      const next = new Map(prev);
      next.delete(undoState.applicationId);
      return next;
    });
    setUndoState(null);
  }

  function handleUndoDismiss() {
    if (!undoState) return;
    clearTimeout(undoState.timeoutId);
    const { applicationId, newStatus } = undoState;
    setTerminalOverrides((prev) => {
      const next = new Map(prev);
      next.delete(applicationId);
      return next;
    });
    setUndoState(null);
    storeUpdateAppStatus(applicationId, newStatus);
  }

  const rows = activeTab === "active" ? displayedActive : displayedClosed;

  const TAB_STYLES = {
    active:     "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
    selected:   "bg-[var(--bg-card)] text-[var(--text)] shadow-sm ring-1 ring-inset ring-[var(--border)]",
    unselected: "text-[var(--text-muted)] hover:text-[var(--text)]",
  };

  return (
    <>
      <div
        id="pipeline-table"
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
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
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(rows.map((r) => r.id)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                      className="accent-[var(--accent)]"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="sticky left-0 z-10 bg-[var(--bg-card)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px] max-w-[180px]">
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
                  <th className="sm:hidden w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((app) => {
                  const fields = getFields(app);
                  return (
                    <tr
                      key={app.id}
                      onClick={() => setOpenDrawerAppId(app.id)}
                      className={[
                        "cursor-pointer transition-colors hover:bg-[var(--bg)] active:bg-[var(--bg)]",
                        openDrawerAppId === app.id ? "bg-[var(--bg)]" : "",
                        "",
                      ].join(" ")}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(app.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(app.id);
                            else next.delete(app.id);
                            setSelected(next);
                          }}
                          className="accent-[var(--accent)]"
                          aria-label={`Select ${app.job.jobPool.title}`}
                        />
                      </td>
                      {/* Job — sticky left column */}
                      <td className="sticky left-0 z-10 bg-[var(--bg-card)] px-4 py-3 w-[180px] max-w-[180px]">
                        <Link
                          href={`/jobs/${app.job.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="group block truncate"
                        >
                          <span className="truncate font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            {app.job.jobPool.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                            {app.job.jobPool.company}
                          </span>
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusSelect
                          value={app.status}
                          onChange={(s) => handleStatusChange(app.id, s)}
                          disabled={false}
                          jobId={app.id}
                        />
                      </td>

                      {/* Applied date — inline editable */}
                      <td
                        className="px-4 py-3 text-xs hidden sm:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="date"
                          value={fields.appliedAt}
                          onChange={(e) =>
                            handleFieldChange(app.id, "appliedAt", e.target.value)
                          }
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-[var(--text-muted)] focus:border-[var(--border)] focus:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        />
                      </td>

                      {/* Follow-up (inline date input) or Closed date */}
                      {activeTab === "active" ? (
                        <td
                          className="px-4 py-3 text-xs hidden md:table-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="date"
                            value={fields.followUpAt}
                            onChange={(e) =>
                              handleFieldChange(app.id, "followUpAt", e.target.value)
                            }
                            className={[
                              "rounded border border-transparent bg-transparent px-1 py-0.5 text-xs",
                              "focus:border-[var(--border)] focus:bg-[var(--bg)]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                              getFollowUpClass(fields.followUpAt, app.status),
                            ].join(" ")}
                          />
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

                      {/* Notes — click-to-edit */}
                      <td
                        className="px-4 py-3 text-xs hidden lg:table-cell max-w-[180px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editingNotesFor === app.id ? (
                          <textarea
                            autoFocus
                            value={fields.notes}
                            onChange={(e) =>
                              handleFieldChange(app.id, "notes", e.target.value)
                            }
                            onBlur={() => setEditingNotesFor(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingNotesFor(null);
                            }}
                            rows={3}
                            className="w-full resize-none rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingNotesFor(app.id)}
                            className="group flex w-full items-center gap-1 text-left text-[var(--text-muted)] hover:text-[var(--text)]"
                          >
                            <span className="block flex-1 truncate">
                              {fields.notes ? fields.notes.slice(0, 60) : "—"}
                            </span>
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                      </td>

                      {/* Score + PDF icon */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ScorePill score={app.job.aiScore} showEmpty />
                          {app.exportedResumeMarkdown && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPdfPreviewFor(app.id);
                              }}
                              title="View exported resume"
                              className="text-[var(--text-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                            >
                              <svg
                                width="14"
                                height="14"
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
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Mobile tap indicator */}
                      <td className="pr-3 text-base text-[var(--text-muted)] sm:hidden">
                        ›
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoState && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm shadow-lg">
          <span className="text-[var(--text)]">
            Moved to <strong>{undoState.label}</strong>
          </span>
          <button
            onClick={handleUndo}
            className="font-semibold text-[var(--accent)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
          >
            Undo
          </button>
          <button
            onClick={handleUndoDismiss}
            className="text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm shadow-lg">
          <span className="text-[var(--text)]">
            {selected.size} {selected.size === 1 ? "item" : "items"} selected
          </span>
          <button
            onClick={() => {
              storeBulkRemove(Array.from(selected));
              setSelected(new Set());
            }}
            className="font-semibold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
          >
            Remove from pipeline
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            aria-label="Clear selection"
          >
            ×
          </button>
        </div>
      )}

      {/* Drawer */}
      {openDrawerApp && (
        <ApplicationDrawer
          application={openDrawerApp}
          fields={getFields(openDrawerApp)}
          onFieldChange={(field, value) =>
            handleFieldChange(openDrawerApp.id, field, value)
          }
          onClose={() => setOpenDrawerAppId(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* PDF Preview Modal */}
      {pdfPreviewApp?.exportedResumeMarkdown && (
        <ResumePDFModal
          markdown={pdfPreviewApp.exportedResumeMarkdown}
          jobTitle={pdfPreviewApp.job.jobPool.title}
          company={pdfPreviewApp.job.jobPool.company}
          onClose={() => setPdfPreviewFor(null)}
        />
      )}
    </>
  );
}
