"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob, FieldOverrides } from "@/types";
import { useDashboardStore } from "@/lib/store";
import { ApplicationDrawer } from "@/components/pipeline/ApplicationDrawer";
import {
  TERMINAL_STATUSES,
  STATUS_LABELS,
  getDefaultFields,
} from "@/components/pipeline/shared";
import { useKanbanDnd } from "./use-kanban-dnd";
import { KANBAN_COLUMNS, getClosedLabel, groupByStatus } from "./constants";
import { KanbanColumn } from "./KanbanColumn";

const ResumePDFModal = dynamic(
  () =>
    import("@/components/pipeline/ResumePDFModal").then(
      (m) => m.ResumePDFModal,
    ),
  { ssr: false },
);

interface KanbanBoardProps {
  activeApplications: ApplicationWithJob[];
  closedApplications: ApplicationWithJob[];
}

export function KanbanBoard({
  activeApplications,
  closedApplications,
}: KanbanBoardProps) {
  const storeUpdateAppStatus = useDashboardStore((s) => s.updateAppStatus);
  const storeUpdateAppDetail = useDashboardStore((s) => s.updateAppDetail);

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<ApplicationStatus>("INTERESTED");

  // Drawer
  const [openDrawerAppId, setOpenDrawerAppId] = useState<string | null>(null);

  // PDF preview
  const [pdfPreviewFor, setPdfPreviewFor] = useState<string | null>(null);

  // Closed section
  const [closedOpen, setClosedOpen] = useState(false);

  // Terminal overrides (undo toast)
  const [terminalOverrides, setTerminalOverrides] = useState<
    Map<string, ApplicationStatus>
  >(new Map());
  const [undoState, setUndoState] = useState<{
    applicationId: string;
    previousStatus: ApplicationStatus;
    newStatus: ApplicationStatus;
    label: string;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Field overrides for drawer editing
  const [fieldOverrides, setFieldOverrides] = useState<
    Map<string, FieldOverrides>
  >(new Map());
  const pendingSaves = useRef<Map<string, FieldOverrides>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Apply terminal overrides
  const allApps = [...activeApplications, ...closedApplications];
  const displayApps = allApps.map((a) =>
    terminalOverrides.has(a.id)
      ? { ...a, status: terminalOverrides.get(a.id)! }
      : a,
  );
  const displayActive = displayApps.filter(
    (a) => !TERMINAL_STATUSES.has(a.status),
  );
  const displayClosed = displayApps.filter((a) =>
    TERMINAL_STATUSES.has(a.status),
  );

  // Group active apps by status for columns
  const grouped = groupByStatus(displayActive);

  // Drag and drop
  function handleDrop(appId: string, newStatus: ApplicationStatus) {
    const app = displayApps.find((a) => a.id === appId);
    if (!app || app.status === newStatus) return;

    if (TERMINAL_STATUSES.has(newStatus)) {
      handleTerminalTransition(appId, app.status, newStatus);
    } else {
      storeUpdateAppStatus(appId, newStatus);
    }
  }

  const dnd = useKanbanDnd(handleDrop);

  function handleTerminalTransition(
    applicationId: string,
    previousStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
  ) {
    // Dismiss existing undo
    if (undoState) {
      clearTimeout(undoState.timeoutId);
      setTerminalOverrides((prev) => {
        const next = new Map(prev);
        next.delete(undoState.applicationId);
        return next;
      });
      storeUpdateAppStatus(undoState.applicationId, undoState.newStatus);
      setUndoState(null);
    }

    setTerminalOverrides((prev) =>
      new Map(prev).set(applicationId, newStatus),
    );

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

  // Field overrides for drawer
  function getFields(app: ApplicationWithJob): FieldOverrides {
    return fieldOverrides.get(app.id) ?? getDefaultFields(app);
  }

  function handleFieldChange(
    appId: string,
    field: keyof FieldOverrides,
    value: string,
  ) {
    const app = allApps.find((a) => a.id === appId);
    const defaults = app
      ? getDefaultFields(app)
      : {
          notes: "",
          appliedAt: "",
          followUpAt: "",
          recruiterName: "",
          recruiterEmail: "",
        };

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
      pendingSaves.current.delete(appId);
      storeUpdateAppDetail(appId, {
        notes: fields.notes,
        appliedAt: fields.appliedAt,
        followUpAt: fields.followUpAt,
        recruiterName: fields.recruiterName,
        recruiterEmail: fields.recruiterEmail,
      });
      // Clear override — store now holds the optimistic value.
      // If a server revert happens later, the UI will reflect it.
      setFieldOverrides((prev) => {
        const next = new Map(prev);
        next.delete(appId);
        return next;
      });
    }, 1500);

    saveTimers.current.set(appId, timer);
  }

  // Notes change from card (not drawer)
  function handleCardNotesChange(appId: string, notes: string) {
    handleFieldChange(appId, "notes", notes);
  }

  // Status change from drawer
  function handleStatusChange(
    applicationId: string,
    newStatus: ApplicationStatus,
  ) {
    const app = displayApps.find((a) => a.id === applicationId);
    if (!app) return;

    if (TERMINAL_STATUSES.has(newStatus)) {
      handleTerminalTransition(applicationId, app.status, newStatus);
    } else {
      storeUpdateAppStatus(applicationId, newStatus);
    }
  }

  // Resolve drawer/PDF apps
  const openDrawerApp = openDrawerAppId
    ? displayApps.find((a) => a.id === openDrawerAppId) ?? null
    : null;
  const pdfPreviewApp = pdfPreviewFor
    ? displayApps.find((a) => a.id === pdfPreviewFor) ?? null
    : null;

  const TAB_STYLES = {
    base: "rounded-md px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
    selected:
      "bg-[var(--bg-card)] text-[var(--text)] shadow-sm ring-1 ring-inset ring-[var(--border)]",
    unselected: "text-[var(--text-muted)] hover:text-[var(--text)]",
  };

  return (
    <>
      <div data-testid="kanban-board">
        {/* ── Desktop: horizontal columns ── */}
        <div className="hidden sm:flex sm:gap-3 sm:pb-2">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              dotColor={col.dotColor}
              applications={grouped.get(col.status) ?? []}
              isDragOver={dnd.dragOverColumn === col.status}
              draggedId={dnd.draggedId}
              onDragOver={dnd.handleDragOver}
              onDragEnter={(e) => dnd.handleDragEnter(e, col.status)}
              onDragLeave={dnd.handleDragLeave}
              onDrop={(e) => dnd.handleColumnDrop(e, col.status)}
              onCardDragStart={dnd.handleDragStart}
              onCardDragEnd={dnd.handleDragEnd}
              onCardClick={(app) => setOpenDrawerAppId(app.id)}
              onNotesChange={handleCardNotesChange}
              onPdfPreview={(id) => setPdfPreviewFor(id)}
            />
          ))}
        </div>

        {/* ── Mobile: tab per column ── */}
        <div className="sm:hidden">
          {/* Tab bar */}
          <nav
            className="mb-3 flex items-center gap-0.5 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5"
            aria-label="Kanban column tabs"
          >
            {KANBAN_COLUMNS.map((col) => {
              const count = grouped.get(col.status)?.length ?? 0;
              return (
                <button
                  key={col.status}
                  onClick={() => setMobileTab(col.status)}
                  className={[
                    TAB_STYLES.base,
                    mobileTab === col.status
                      ? TAB_STYLES.selected
                      : TAB_STYLES.unselected,
                  ].join(" ")}
                >
                  {col.label} ({count})
                </button>
              );
            })}
          </nav>

          {/* Single column */}
          <KanbanColumn
            status={mobileTab}
            label={
              KANBAN_COLUMNS.find((c) => c.status === mobileTab)?.label ??
              mobileTab
            }
            dotColor={
              KANBAN_COLUMNS.find((c) => c.status === mobileTab)?.dotColor ??
              "bg-[var(--text-muted)]"
            }
            applications={grouped.get(mobileTab) ?? []}
            isDragOver={false}
            draggedId={null}
            onDragOver={() => {}}
            onDragEnter={() => {}}
            onDragLeave={() => {}}
            onDrop={() => {}}
            onCardDragStart={() => {}}
            onCardDragEnd={() => {}}
            onCardClick={(app) => setOpenDrawerAppId(app.id)}
            onNotesChange={handleCardNotesChange}
            onPdfPreview={(id) => setPdfPreviewFor(id)}
          />
        </div>

        {/* ── Closed section ── */}
        {displayClosed.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setClosedOpen((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${closedOpen ? "rotate-90" : ""}`}
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              Closed ({displayClosed.length})
            </button>

            {closedOpen && (
              <div className="mt-3 space-y-2">
                {displayClosed.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setOpenDrawerAppId(app.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-left transition-colors hover:border-[var(--border-strong)]"
                  >
                    <div className="min-w-0">
                      <p title={app.job.jobPool.title} className="truncate text-sm font-medium text-[var(--text)]">
                        {app.job.jobPool.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {app.job.jobPool.company}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                      {getClosedLabel(app.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
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
