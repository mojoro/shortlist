"use client";

import { useState } from "react";
import type { ApplicationStatus } from "@prisma/client";

export function useKanbanDnd(
  onDrop: (appId: string, newStatus: ApplicationStatus) => void,
) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] =
    useState<ApplicationStatus | null>(null);

  function handleDragStart(e: React.DragEvent, appId: string) {
    e.dataTransfer.setData("text/plain", appId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(appId);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverColumn(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDragEnter(e: React.DragEvent, status: ApplicationStatus) {
    e.preventDefault();
    // Only set if we're entering the column from outside, not from a child
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverColumn(status);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if we're leaving the column entirely, not entering a child
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverColumn(null);
    }
  }

  function handleColumnDrop(e: React.DragEvent, status: ApplicationStatus) {
    e.preventDefault();
    const appId = e.dataTransfer.getData("text/plain");
    if (appId && appId !== "") {
      onDrop(appId, status);
    }
    setDraggedId(null);
    setDragOverColumn(null);
  }

  return {
    draggedId,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleColumnDrop,
  };
}
