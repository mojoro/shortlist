"use client";

import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob } from "@/types";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  status: ApplicationStatus;
  label: string;
  dotColor: string;
  applications: ApplicationWithJob[];
  isDragOver: boolean;
  draggedId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onCardDragStart: (e: React.DragEvent, appId: string) => void;
  onCardDragEnd: () => void;
  onCardClick: (app: ApplicationWithJob) => void;
  onNotesChange: (appId: string, notes: string) => void;
  onPdfPreview: (appId: string) => void;
}

export function KanbanColumn({
  label,
  dotColor,
  applications,
  isDragOver,
  draggedId,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onCardDragStart,
  onCardDragEnd,
  onCardClick,
  onNotesChange,
  onPdfPreview,
}: KanbanColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "flex min-w-0 flex-1 flex-col rounded-xl border bg-[var(--bg)] transition-all",
        isDragOver
          ? "border-[var(--accent)] ring-2 ring-inset ring-[var(--accent)]"
          : "border-[var(--border)]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
            {label}
          </span>
        </div>
        <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
          {applications.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {applications.length === 0 ? (
          <p className="py-8 text-center text-xs italic text-[var(--text-muted)]">
            No applications
          </p>
        ) : (
          applications.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              isDragging={draggedId === app.id}
              onDragStart={(e) => onCardDragStart(e, app.id)}
              onDragEnd={onCardDragEnd}
              onClick={() => onCardClick(app)}
              onNotesChange={(notes) => onNotesChange(app.id, notes)}
              onPdfPreview={() => onPdfPreview(app.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
