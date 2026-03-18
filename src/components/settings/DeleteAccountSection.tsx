"use client";

import { useState, useTransition, useEffect } from "react";
import { APP_CONFIG } from "@/config/app";
import { deleteAccount } from "@/app/(dashboard)/settings/delete-account-actions";

export function DeleteAccountSection() {
  const [showDialog, setShowDialog] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Escape key closes the dialog
  useEffect(() => {
    if (!showDialog) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        setShowDialog(false);
        setConfirmation("");
        setError(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDialog, isPending]);

  function handleDelete() {
    if (confirmation !== "DELETE" || isPending) return;
    startTransition(async () => {
      try {
        await deleteAccount({ confirmation });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    });
  }

  function handleClose() {
    if (isPending) return;
    setShowDialog(false);
    setConfirmation("");
    setError(null);
  }

  return (
    <>
      <section>
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
          Danger zone
        </h2>
        <p className="mt-1 mb-4 text-sm text-[var(--text-muted)]">
          Permanently delete your {APP_CONFIG.name} account and all associated
          data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDialog(true)}
          className="inline-flex min-h-[36px] items-center rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Delete account
        </button>
      </section>

      {/* Confirmation dialog */}
      {showDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete account confirmation"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            style={{ boxShadow: "var(--shadow-card-hover)" }}
          >
            <h3 className="text-lg font-semibold text-[var(--text)]">
              Are you sure?
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This will permanently delete:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
              <li>- All your profiles and search criteria</li>
              <li>- All saved jobs and match scores</li>
              <li>- All applications and pipeline data</li>
              <li>- All tailored resumes</li>
            </ul>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Your usage statistics will be retained for billing records.
            </p>

            <div className="mt-4">
              <label
                htmlFor="delete-confirm"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirm"
                autoFocus
                type="text"
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDelete();
                }}
                placeholder="DELETE"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              />
            </div>

            {error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="inline-flex min-h-[36px] items-center rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmation !== "DELETE" || isPending}
                className="inline-flex min-h-[36px] items-center rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {isPending ? "Deleting..." : "Delete my account"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
