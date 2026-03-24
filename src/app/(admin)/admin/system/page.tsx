import React from "react";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";

import { getSystemHealth } from "@/lib/admin-queries";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

export const metadata: Metadata = { title: "System Health" };

function formatSource(source: string) {
  return source
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTokens(count: number) {
  return Intl.NumberFormat("en-US", { notation: "compact" }).format(count);
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    PARTIAL:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
      }`}
    >
      {status}
    </span>
  );
}

export default async function AdminSystemPage() {
  const health = await getSystemHealth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">
          System Health
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Scraper status, failure tracking, and AI spend
        </p>
      </div>

      {/* Cron status */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Scraper Status
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Last Run</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Jobs Found</th>
                <th className="px-4 py-3 text-right">In Pool</th>
                <th className="px-4 py-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {health.scraperStatus.map((run) => (
                <React.Fragment key={run.id}>
                  <tr className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3 font-medium">
                      {formatSource(run.source)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-muted)]">
                      {formatDistanceToNow(run.createdAt, { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {run.jobsFound}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {run.jobsInPool}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted)]">
                      {formatDuration(run.durationMs)}
                    </td>
                  </tr>
                  {(run.status === "FAILED" || run.status === "PARTIAL") &&
                    run.errorMessage && (
                      <tr className="bg-[var(--bg-subtle)]">
                        <td
                          colSpan={6}
                          className="px-4 py-2 text-xs text-[var(--text-muted)]"
                        >
                          {run.errorMessage}
                        </td>
                      </tr>
                    )}
                </React.Fragment>
              ))}
              {health.scraperStatus.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--text-muted)]"
                  >
                    No scrape runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Failed runs (24h) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Failed Runs (24h)
          </h2>
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
              health.failedRuns24h > 0
                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            }`}
          >
            {health.failedRuns24h}
          </span>
        </div>
        {health.failedRuns24h === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No failures in the last 24 hours.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            {health.failedRuns24h} scrape{" "}
            {health.failedRuns24h === 1 ? "run" : "runs"} failed in the last 24
            hours. Check deployment logs for details.
          </p>
        )}
      </section>

      {/* AI spend */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          AI Token Spend
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminStatCard
            label="MTD Input"
            value={formatTokens(health.aiSpend.currentMonthInputTokens)}
            subtitle="This month"
          />
          <AdminStatCard
            label="MTD Output"
            value={formatTokens(health.aiSpend.currentMonthOutputTokens)}
            subtitle="This month"
          />
          <AdminStatCard
            label="All-time Input"
            value={formatTokens(health.aiSpend.totalInputTokens)}
            subtitle="Lifetime"
          />
          <AdminStatCard
            label="All-time Output"
            value={formatTokens(health.aiSpend.totalOutputTokens)}
            subtitle="Lifetime"
          />
        </div>
      </section>
    </div>
  );
}
