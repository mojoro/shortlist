import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { getAdminFeedbackList } from "@/lib/admin-queries";

type FeedbackMetadata = {
  pathname?: string;
  profileName?: string;
  userAgent?: string;
  recentErrors?: string[];
} | null;

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const { items, total } = await getAdminFeedbackList({ page });
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text)]">Feedback</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {total} {total === 1 ? "entry" : "entries"}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-[var(--text-muted)]">
          No feedback submitted yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">
                  Message
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">
                  Submitted
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--text-muted)]">
                  Debug
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const meta = item.metadata as FeedbackMetadata;
                const truncated =
                  item.message.length > 80
                    ? item.message.slice(0, 80) + "..."
                    : item.message;

                return (
                  <tr key={item.id} className="group">
                    <td
                      colSpan={4}
                      className={`p-0 ${i % 2 === 1 ? "bg-[var(--bg-subtle)]" : ""}`}
                    >
                      <details className="[&>summary]:list-none [&>summary::-webkit-details-marker]:hidden">
                        <summary className="grid cursor-pointer grid-cols-[minmax(140px,1fr)_2fr_140px_60px] items-center transition-colors hover:bg-[var(--bg-subtle)]">
                          <span className="truncate px-4 py-3 text-[var(--text)]">
                            {item.user.email ?? "Unknown"}
                          </span>
                          <span className="truncate px-4 py-3 text-[var(--text-muted)]">
                            {truncated}
                          </span>
                          <span className="px-4 py-3 text-[var(--text-muted)]">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <span className="flex justify-center px-4 py-3">
                            {meta ? (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]"
                                title="Has debug metadata"
                              />
                            ) : (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--border)]"
                                title="No metadata"
                              />
                            )}
                          </span>
                        </summary>

                        <div className="border-t border-[var(--border)] px-4 py-4 space-y-4">
                          <div>
                            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                              Full message
                            </h3>
                            <p className="whitespace-pre-wrap text-sm text-[var(--text)]">
                              {item.message}
                            </p>
                          </div>

                          {meta ? (
                            <div className="space-y-3">
                              <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                Debug metadata
                              </h3>

                              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                                {meta.pathname && (
                                  <>
                                    <dt className="text-[var(--text-muted)]">
                                      Pathname
                                    </dt>
                                    <dd className="text-[var(--text)]">
                                      {meta.pathname}
                                    </dd>
                                  </>
                                )}
                                {meta.profileName && (
                                  <>
                                    <dt className="text-[var(--text-muted)]">
                                      Profile
                                    </dt>
                                    <dd className="text-[var(--text)]">
                                      {meta.profileName}
                                    </dd>
                                  </>
                                )}
                                {meta.userAgent && (
                                  <>
                                    <dt className="text-[var(--text-muted)]">
                                      User agent
                                    </dt>
                                    <dd className="break-all text-[var(--text)]">
                                      {meta.userAgent}
                                    </dd>
                                  </>
                                )}
                              </dl>

                              {meta.recentErrors &&
                                meta.recentErrors.length > 0 && (
                                  <div>
                                    <h4 className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                                      Recent errors
                                    </h4>
                                    <div className="space-y-1">
                                      {meta.recentErrors.map((err, j) => (
                                        <code
                                          key={j}
                                          className="block rounded bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text)]"
                                        >
                                          {err}
                                        </code>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ) : (
                            <p className="text-sm italic text-[var(--text-muted)]">
                              No debug metadata captured
                            </p>
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Link
            href={page > 1 ? `/admin/feedback?page=${page - 1}` : "#"}
            aria-disabled={page <= 1}
            className={`rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors ${
              page <= 1
                ? "pointer-events-none opacity-40"
                : "text-[var(--text)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            Previous
          </Link>

          <span className="text-sm text-[var(--text-muted)]">
            Page {page} of {totalPages}
          </span>

          <Link
            href={
              page < totalPages ? `/admin/feedback?page=${page + 1}` : "#"
            }
            aria-disabled={page >= totalPages}
            className={`rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors ${
              page >= totalPages
                ? "pointer-events-none opacity-40"
                : "text-[var(--text)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
