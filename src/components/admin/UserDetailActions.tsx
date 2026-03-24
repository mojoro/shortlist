"use client";

import { useTransition, useState } from "react";

import {
  adminAdjustUsageLimit,
  adminDisableUser,
  adminEnableUser,
  adminResetMonthlyUsage,
} from "@/app/(admin)/actions";

interface UserDetailActionsProps {
  userId: string;
  currentLimit: number;
  isDisabled: boolean;
}

export function UserDetailActions({
  userId,
  currentLimit,
  isDisabled,
}: UserDetailActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [limit, setLimit] = useState(currentLimit);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleSaveLimit() {
    startTransition(async () => {
      await adminAdjustUsageLimit({ userId, monthlyLimitInputTokens: limit });
    });
  }

  function handleToggleDisable() {
    startTransition(async () => {
      if (isDisabled) {
        await adminEnableUser({ userId });
      } else {
        await adminDisableUser({ userId });
      }
    });
  }

  function handleResetUsage() {
    startTransition(async () => {
      await adminResetMonthlyUsage({ userId });
      setConfirmReset(false);
    });
  }

  return (
    <div className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Actions
      </h2>

      {/* Adjust monthly limit */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label
            htmlFor="limit-input"
            className="mb-1 block text-sm text-[var(--text-muted)]"
          >
            Monthly token limit
          </label>
          <input
            id="limit-input"
            type="number"
            min={0}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveLimit}
          disabled={isPending || limit === currentLimit}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Disable / Enable */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">
            {isDisabled ? "User is disabled" : "User is active"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {isDisabled
              ? "Re-enable to restore access"
              : "Disable to prevent login"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleDisable}
          disabled={isPending}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
            isDisabled
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {isPending
            ? "..."
            : isDisabled
              ? "Re-enable"
              : "Disable"}
        </button>
      </div>

      {/* Reset monthly usage */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">
            Reset monthly usage
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Zeros out current month token counts
          </p>
        </div>
        {confirmReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetUsage}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={isPending}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
