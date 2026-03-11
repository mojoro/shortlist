"use client";

export type SaveStatus = "saved" | "saving" | "error";

export function AutoSaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <span className="h-3 w-3 animate-spin rounded-full border border-[var(--text-muted)] border-t-transparent" />
        Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Sync failed — check connection
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Saved
    </span>
  );
}
