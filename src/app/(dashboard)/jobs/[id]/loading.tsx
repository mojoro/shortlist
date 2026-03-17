export default function JobDetailLoading() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-6"
      aria-busy="true"
      aria-label="Loading job details"
    >
      {/* Back link */}
      <div className="h-4 w-24 animate-pulse rounded bg-[var(--bg-subtle)]" />

      {/* Header: score + title + company */}
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
        <div className="space-y-2">
          <div className="h-6 w-64 animate-pulse rounded bg-[var(--bg-subtle)]" />
          <div className="h-4 w-40 animate-pulse rounded bg-[var(--bg-subtle)]" />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex gap-2">
        {[100, 80, 120].map((width, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded-lg bg-[var(--bg-subtle)]"
            style={{ width }}
          />
        ))}
      </div>

      {/* Match / Gap points */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-[var(--bg-subtle)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-[var(--bg-subtle)]" />
        ))}
      </div>

      {/* Job description */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-subtle)]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-[var(--bg-subtle)]"
            style={{ width: `${60 + (i % 3) * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
