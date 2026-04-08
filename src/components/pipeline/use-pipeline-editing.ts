"use client";

import { useState, useRef } from "react";
import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob, FieldOverrides } from "@/types";
import { TERMINAL_STATUSES, STATUS_LABELS, getDefaultFields } from "@/components/pipeline/shared";
import { useDashboardStore } from "@/lib/store";

export type UndoState = {
  applicationId: string;
  previousStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  label: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

/**
 * Shared editing logic for PipelineTable and KanbanBoard.
 * Manages field overrides (debounced saves), terminal status transitions (undo toast),
 * and status changes.
 */
export function usePipelineEditing(allApps: ApplicationWithJob[]) {
  const storeUpdateAppStatus = useDashboardStore((s) => s.updateAppStatus);
  const storeUpdateAppDetail = useDashboardStore((s) => s.updateAppDetail);

  // Field overrides: display state for editable fields, keyed by appId
  const [fieldOverrides, setFieldOverrides] = useState<Map<string, FieldOverrides>>(new Map());
  const pendingSaves = useRef<Map<string, FieldOverrides>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Terminal overrides: shown in UI while undo toast is active
  const [terminalOverrides, setTerminalOverrides] = useState<Map<string, ApplicationStatus>>(new Map());

  // Undo toast state
  const [undoState, setUndoState] = useState<UndoState | null>(null);

  // Apply terminal overrides on top of store-provided apps
  const displayApps = allApps.map((a) =>
    terminalOverrides.has(a.id) ? { ...a, status: terminalOverrides.get(a.id)! } : a,
  );

  function getFields(app: ApplicationWithJob): FieldOverrides {
    return fieldOverrides.get(app.id) ?? getDefaultFields(app);
  }

  function handleFieldChange(appId: string, field: keyof FieldOverrides, value: string) {
    const app = allApps.find((a) => a.id === appId);
    const defaults = app
      ? getDefaultFields(app)
      : { notes: "", appliedAt: "", followUpAt: "", recruiterName: "", recruiterEmail: "" };

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
      setFieldOverrides((prev) => {
        const next = new Map(prev);
        next.delete(appId);
        return next;
      });
    }, 1500);

    saveTimers.current.set(appId, timer);
  }

  function commitTerminalTransition(applicationId: string, newStatus: ApplicationStatus) {
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

    const app = displayApps.find((a) => a.id === applicationId);
    const previousStatus = app?.status ?? ("INTERESTED" as ApplicationStatus);

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

  function handleStatusChange(applicationId: string, newStatus: ApplicationStatus) {
    const app = displayApps.find((a) => a.id === applicationId);
    if (!app) return;

    if (TERMINAL_STATUSES.has(newStatus)) {
      commitTerminalTransition(applicationId, newStatus);
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

  return {
    displayApps,
    getFields,
    handleFieldChange,
    handleStatusChange,
    handleUndo,
    handleUndoDismiss,
    terminalOverrides,
    undoState,
    storeUpdateAppStatus,
  };
}
