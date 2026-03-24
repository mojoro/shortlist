import type { Metadata } from "next";
import { format } from "date-fns";

import {
  getUserGrowthData,
  getActivityData,
  getFeatureUsageCounts,
} from "@/lib/admin-queries";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

export const metadata: Metadata = { title: "Analytics" };

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminAnalyticsPage() {
  const [growth, activity, features] = await Promise.all([
    getUserGrowthData(),
    getActivityData(),
    getFeatureUsageCounts(),
  ]);

  const maxSignups = Math.max(...growth.map((r) => r.signups), 1);
  const maxStatusCount = Math.max(
    ...features.statusBreakdown.map((s) => s._count),
    1,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          User growth, activity, and feature usage
        </p>
      </div>

      {/* Activity */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Activity
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard
            label="Daily Active Users"
            value={activity.dau}
            subtitle="Today"
          />
          <AdminStatCard
            label="Weekly Active Users"
            value={activity.wau}
            subtitle="Last 7 days"
          />
        </div>
      </section>

      {/* User growth */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          User Growth (12 weeks)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3">Week</th>
                <th className="px-4 py-3">Signups</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {growth.map((row) => (
                <tr
                  key={row.week.toISOString()}
                  className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--text-muted)]">
                    {format(row.week, "MMM d")}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.signups}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-full rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent)]"
                        style={{
                          width: `${(row.signups / maxSignups) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {growth.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-[var(--text-muted)]"
                  >
                    No signup data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature usage */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Feature Usage
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <AdminStatCard
            label="Tailored Resumes"
            value={features.tailoredResumes.toLocaleString()}
          />
          <AdminStatCard
            label="Applications"
            value={features.applications.toLocaleString()}
          />
          <AdminStatCard
            label="AI Analyses"
            value={features.aiAnalyses.toLocaleString()}
          />
        </div>
      </section>

      {/* Application status breakdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Application Status Breakdown
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {features.statusBreakdown.map((row) => (
                <tr
                  key={row.status}
                  className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <td className="px-4 py-3 font-medium">
                    {formatStatus(row.status)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row._count}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-full rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent)]"
                        style={{
                          width: `${(row._count / maxStatusCount) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {features.statusBreakdown.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-[var(--text-muted)]"
                  >
                    No applications recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
