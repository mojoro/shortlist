import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";

import { env } from "@/env";
import { getAdminUserDetail } from "@/lib/admin-queries";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { CopyProfileButton } from "@/components/admin/CopyProfileButton";
import { UserDetailActions } from "@/components/admin/UserDetailActions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getAdminUserDetail(userId);
  if (!user) notFound();

  const isDisabled = user.disabledAt !== null;
  const isOwnAccount = userId === env.ADMIN_USER_ID;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/users"
          className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to users
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--text)]">
            {user.email ?? "No email"}
          </h1>
          {isDisabled && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Disabled
            </span>
          )}
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--text-muted)]">
          <div>
            <dt className="sr-only">User ID</dt>
            <dd className="font-mono text-xs">{user.id}</dd>
          </div>
          <div>
            <dt className="sr-only">Created</dt>
            <dd>
              Joined {format(user.createdAt, "MMM d, yyyy")}
            </dd>
          </div>
          {user.lastActiveAt && (
            <div>
              <dt className="sr-only">Last active</dt>
              <dd>
                Active{" "}
                {formatDistanceToNow(user.lastActiveAt, { addSuffix: true })}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Profiles */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Profiles ({user.profiles.length})
        </h2>
        {user.profiles.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No profiles created yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Jobs</th>
                  <th className="px-4 py-3 text-right">Applications</th>
                  {!isOwnAccount && (
                    <th className="px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {user.profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-4 py-3 font-medium">{profile.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {profile._count.jobs}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {profile._count.applications}
                    </td>
                    {!isOwnAccount && (
                      <td className="px-4 py-3 text-right">
                        <CopyProfileButton
                          profileId={profile.id}
                          profileName={profile.name}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Usage */}
      {user.usage && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Usage
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <AdminStatCard
              label="MTD Input Tokens"
              value={user.usage.currentMonthInputTokens.toLocaleString()}
              subtitle={`Limit: ${user.usage.monthlyLimitInputTokens.toLocaleString()}`}
            />
            <AdminStatCard
              label="MTD Output Tokens"
              value={user.usage.currentMonthOutputTokens.toLocaleString()}
            />
            <AdminStatCard
              label="All-time Input"
              value={user.usage.totalInputTokens.toLocaleString()}
            />
            <AdminStatCard
              label="All-time Output"
              value={user.usage.totalOutputTokens.toLocaleString()}
            />
          </div>
        </section>
      )}

      {/* Actions */}
      <UserDetailActions
        userId={user.id}
        currentLimit={user.usage?.monthlyLimitInputTokens ?? 0}
        isDisabled={isDisabled}
      />

      {/* Recent feedback */}
      {user.feedback.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Recent Feedback
          </h2>
          <div className="space-y-2">
            {user.feedback.map((fb) => (
              <div
                key={fb.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
              >
                <p className="text-sm text-[var(--text)]">{fb.message}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {formatDistanceToNow(fb.createdAt, { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
