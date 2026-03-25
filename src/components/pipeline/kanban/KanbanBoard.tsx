"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob } from "@/types";
import { ApplicationDrawer } from "@/components/pipeline/ApplicationDrawer";
import { TERMINAL_STATUSES } from "@/components/pipeline/shared";
import { usePipelineEditing } from "@/components/pipeline/use-pipeline-editing";
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
  const allApps = [...activeApplications, ...closedApplications];
  const {
    displayApps,
    getFields,
    handleFieldChange,
    handleStatusChange,
    handleUndo,
    handleUndoDismiss,
    undoState,
    storeUpdateAppStatus,
  } = usePipelineEditing(allApps);

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<ApplicationStatus>("INTERESTED");

  // Drawer
  const [openDrawerAppId, setOpenDrawerAppId] = useState<string | null>(null);

  // PDF preview
  const [pdfPreviewFor, setPdfPreviewFor] = useState<string | null>(null);

  // Closed section
  const [closedOpen, setClosedOpen] = useState(false);

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
      handleStatusChange(appId, newStatus);
    } else {
      storeUpdateAppStatus(appId, newStatus);
    }
  }

  const dnd = useKanbanDnd(handleDrop);

  // Notes change from card (not drawer)
  function handleCardNotesChange(appId: string, notes: string) {
    handleFieldChange(appId, "notes", notes);
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
        {/* -- Desktop: horizontal columns -- */}
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

        {/* -- Mobile: tab per column -- */}
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

        {/* -- Closed section -- */}
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
