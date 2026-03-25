import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Metadata } from "next";

import { getAdminUserList } from "@/lib/admin-queries";
import { UserSearchBar } from "@/components/admin/UserSearchBar";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search, page } = await searchParams;
  const currentPage = Number(page) || 1;

  const { users, total } = await getAdminUserList({
    search,
    page: currentPage,
  });

  const limit = 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text)]">Users</h1>
        <span className="text-sm text-[var(--text-muted)]">
          {total} total
        </span>
      </div>

      <UserSearchBar />

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">
                Email
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">
                Profiles
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">
                AI Tokens Used / Limit
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">
                Created
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  No users found.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const used = user.usage?.currentMonthInputTokens ?? 0;
              const limit = user.usage?.monthlyLimitInputTokens ?? 0;
              const isDisabled = user.disabledAt !== null;

              return (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {user.email ?? "No email"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {user._count.profiles}
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {used.toLocaleString()} / {limit.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {isDisabled ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/users?${new URLSearchParams({
            ...(search ? { search } : {}),
            page: String(currentPage - 1),
          }).toString()}`}
          className={`rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors ${
            currentPage <= 1
              ? "pointer-events-none opacity-50 text-[var(--text-muted)]"
              : "text-[var(--text)] hover:bg-[var(--bg-subtle)]"
          }`}
          aria-disabled={currentPage <= 1}
          tabIndex={currentPage <= 1 ? -1 : undefined}
        >
          Previous
        </Link>

        <span className="text-sm text-[var(--text-muted)]">
          Page {currentPage} of {totalPages}
        </span>

        <Link
          href={`/admin/users?${new URLSearchParams({
            ...(search ? { search } : {}),
            page: String(currentPage + 1),
          }).toString()}`}
          className={`rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors ${
            currentPage >= totalPages
              ? "pointer-events-none opacity-50 text-[var(--text-muted)]"
              : "text-[var(--text)] hover:bg-[var(--bg-subtle)]"
          }`}
          aria-disabled={currentPage >= totalPages}
          tabIndex={currentPage >= totalPages ? -1 : undefined}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
