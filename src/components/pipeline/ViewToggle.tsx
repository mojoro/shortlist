"use client";

interface ViewToggleProps {
  view: "table" | "board";
  onViewChange: (view: "table" | "board") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const base = "rounded-md p-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";
  const selected = "bg-[var(--bg-card)] text-[var(--text)] shadow-sm ring-1 ring-inset ring-[var(--border)]";
  const unselected = "text-[var(--text-muted)] hover:text-[var(--text)]";

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5">
      <button
        data-testid="view-toggle-table"
        onClick={() => onViewChange("table")}
        className={`${base} ${view === "table" ? selected : unselected}`}
        aria-label="Table view"
        title="Table view"
      >
        {/* Table / list icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
      <button
        data-testid="view-toggle-board"
        onClick={() => onViewChange("board")}
        className={`${base} ${view === "board" ? selected : unselected}`}
        aria-label="Board view"
        title="Board view"
      >
        {/* Kanban / columns icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="5" height="18" rx="1" />
          <rect x="10" y="3" width="5" height="12" rx="1" />
          <rect x="17" y="3" width="5" height="15" rx="1" />
        </svg>
      </button>
    </div>
  );
}
