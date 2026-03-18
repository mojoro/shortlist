"use client";

import { useState, useRef, useEffect } from "react";

interface CardNotesProps {
  notes: string | null;
  onNotesChange: (notes: string) => void;
}

type Mode = "collapsed" | "expanded" | "editing";

export function CardNotes({ notes, onNotesChange }: CardNotesProps) {
  const [mode, setMode] = useState<Mode>("collapsed");
  const [draft, setDraft] = useState(notes ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when notes prop changes externally
  useEffect(() => {
    if (mode === "collapsed") {
      setDraft(notes ?? "");
    }
  }, [notes, mode]);

  // Click-outside to collapse
  useEffect(() => {
    if (mode === "collapsed") return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (mode === "editing") {
          onNotesChange(draft);
        }
        setMode("collapsed");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mode, draft, onNotesChange]);

  function handlePreviewClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!notes) {
      // Empty notes — skip straight to editing
      setMode("editing");
    } else {
      setMode("expanded");
    }
  }

  function handleExpandedClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMode("editing");
  }

  function handleEditorKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onNotesChange(draft);
      setMode("collapsed");
    }
  }

  function handleEditorBlur() {
    onNotesChange(draft);
    setMode("collapsed");
  }

  // Empty state
  if (!notes && mode === "collapsed") {
    return (
      <button
        data-testid="card-notes-empty"
        onClick={handlePreviewClick}
        className="w-full text-left text-xs text-[var(--text-muted)] italic hover:text-[var(--text)] transition-colors"
      >
        Add notes...
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Collapsed: 2-line clamped preview */}
      {mode === "collapsed" && (
        <button
          data-testid="card-notes-preview"
          onClick={handlePreviewClick}
          className="w-full text-left text-xs leading-relaxed text-[var(--text-muted)] line-clamp-2 hover:text-[var(--text)] transition-colors"
        >
          {notes}
        </button>
      )}

      {/* Expanded: full notes text */}
      {mode === "expanded" && (
        <div
          data-testid="card-notes-expanded"
          onClick={handleExpandedClick}
          className="absolute left-0 right-0 top-0 z-20 cursor-text rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2 text-xs leading-relaxed text-[var(--text-muted)] shadow-lg"
          style={{ boxShadow: "var(--shadow-card-hover)" }}
        >
          {notes}
        </div>
      )}

      {/* Editing: inline textarea */}
      {mode === "editing" && (
        <div
          className="absolute left-0 right-0 top-0 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={editorRef}
            data-testid="card-notes-editor"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            onBlur={handleEditorBlur}
            rows={4}
            placeholder="Add notes..."
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-xs leading-relaxed text-[var(--text)] shadow-lg placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{ boxShadow: "var(--shadow-card-hover)" }}
          />
        </div>
      )}
    </div>
  );
}
