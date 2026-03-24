import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { getAdminPoolStats, getAdminPoolEntries } from "@/lib/admin-queries";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { SourceFilter } from "@/components/admin/SourceFilter";

export const metadata: Metadata = { title: "Job Pool" };

function formatSource(source: string) {
  return source
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const source = params.source;
  const search = params.search;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 25;

  const [stats, pool] = await Promise.all([
    getAdminPoolStats(),
    getAdminPoolEntries({ source, search, page, limit }),
  ]);

  const totalPages = Math.ceil(pool.total / limit);
  const allSources = stats.bySource.map((s) => s.source);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Job Pool</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {stats.total.toLocaleString()} total listings across all sources
        </p>
      </div>

      {/* Source breakdown stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.bySource.map((s) => (
          <AdminStatCard
            key={s.source}
            label={formatSource(s.source)}
            value={s._count.toLocaleString()}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <SourceFilter sources={allSources} current={source} />

        <form className="flex gap-2">
          {source && <input type="hidden" name="source" value={source} />}
          <input
            name="search"
            type="search"
            defaultValue={search ?? ""}
            placeholder="Search by title or company..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:max-w-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Matched By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {pool.entries.map((entry) => (
              <tr
                key={entry.id}
                className="text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <td className="max-w-xs truncate px-4 py-3 font-medium">
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {entry.title}
                    </a>
                  ) : (
                    entry.title
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {entry.company}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                    {formatSource(entry.source)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {entry.location ?? "Not specified"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--text-muted)]">
                  {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {entry._count.jobs}
                </td>
              </tr>
            ))}
            {pool.entries.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  No pool entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--text-muted)]">
            Page {page} of {totalPages} ({pool.total.toLocaleString()} entries)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <PaginationLink page={page - 1} source={source} search={search}>
                Previous
              </PaginationLink>
            )}
            {page < totalPages && (
              <PaginationLink page={page + 1} source={source} search={search}>
                Next
              </PaginationLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationLink({
  page,
  source,
  search,
  children,
}: {
  page: number;
  source?: string;
  search?: string;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (source) params.set("source", source);
  if (search) params.set("search", search);

  return (
    <Link
      href={`/admin/pool?${params.toString()}`}
      className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
    >
      {children}
    </Link>
  );
}
