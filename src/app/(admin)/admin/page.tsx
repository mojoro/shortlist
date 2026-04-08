import { formatDistanceToNow } from "date-fns";
import type { Metadata } from "next";

import { AdminStatCard } from "@/components/admin/AdminStatCard";

export const metadata: Metadata = { title: "Admin Overview" };
import {
  getAdminOverviewStats,
  getRecentScrapeRuns,
  getRecentMatchRuns,
  getNewUsersThisWeek,
} from "@/lib/admin-queries";

const tokenFmt = new Intl.NumberFormat("en-US", { notation: "compact" });

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    PARTIAL:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-[var(--bg-subtle)] text-[var(--text-muted)]"}`}
    >
      {status}
    </span>
  );
}

export default async function AdminOverviewPage() {
  const [stats, scrapeRuns, matchRuns, newUsers] = await Promise.all([
    getAdminOverviewStats(),
    getRecentScrapeRuns(10),
    getRecentMatchRuns(10),
    getNewUsersThisWeek(),
  ]);

  const totalTokensMTD = stats.aiTokensMTD.input + stats.aiTokensMTD.output;

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-[var(--text)]">Overview</h1>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.totalProfiles} profiles`}
        />
        <AdminStatCard
          label="Active (7d)"
          value={stats.activeUsers7d}
          subtitle={`of ${stats.totalUsers} users`}
        />
        <AdminStatCard label="Pool Size" value={stats.poolSize.toLocaleString()} />
        <AdminStatCard
          label="AI Tokens MTD"
          value={tokenFmt.format(totalTokensMTD)}
          subtitle={`${tokenFmt.format(stats.aiTokensMTD.input)} in / ${tokenFmt.format(stats.aiTokensMTD.output)} out`}
        />
      </div>

      {/* ── Recent scrape runs ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--text)]">
          Recent scrape runs
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Found</th>
                <th className="px-4 py-2.5 text-right">New to pool</th>
                <th className="px-4 py-2.5 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {scrapeRuns.map((run) => (
                <tr key={run.id} className="bg-[var(--bg-card)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--text)]">
                    {run.source}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                    {run.jobsFound}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                    {run.jobsInPool}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">
                    {formatDistanceToNow(run.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {scrapeRuns.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[var(--text-muted)]"
                  >
                    No scrape runs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Recent match runs ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--text)]">
          Recent match runs
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-2.5">Profile</th>
                <th className="px-4 py-2.5 text-right">SQL candidates</th>
                <th className="px-4 py-2.5 text-right">Heuristic</th>
                <th className="px-4 py-2.5 text-right">AI triage</th>
                <th className="px-4 py-2.5 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {matchRuns.map((run) => (
                <tr key={run.id} className="bg-[var(--bg-card)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--text)]">
                    {run.profile.name}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                    {run.candidatesFromSql}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                    {run.acceptedByHeuristic}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                    {run.borderlineToAi}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">
                    {formatDistanceToNow(run.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {matchRuns.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[var(--text-muted)]"
                  >
                    No match runs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── New users this week ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--text)]">
          New users this week
        </h2>
        {newUsers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No new signups in the past 7 days
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5 text-right">Profiles</th>
                  <th className="px-4 py-2.5 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {newUsers.map((user) => (
                  <tr key={user.id} className="bg-[var(--bg-card)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--text)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                      {user._count.profiles}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">
                      {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
