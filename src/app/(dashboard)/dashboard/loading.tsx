export default function DashboardLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading your matches"
    >
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-[--bg-subtle]" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-[--bg-subtle]" />
      </div>

      <div className="flex gap-2">
        {[80, 64, 72, 80].map((width, i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-full bg-[--bg-subtle]"
            style={{ width }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function JobCardSkeleton() {
  return (
    <div className="rounded-xl border border-[--border] bg-[--bg] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[--bg-subtle]" />
          <div className="space-y-1.5">
            <div className="h-4 w-48 animate-pulse rounded bg-[--bg-subtle]" />
            <div className="h-3 w-32 animate-pulse rounded bg-[--bg-subtle]" />
          </div>
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full bg-[--bg-subtle]" />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-full animate-pulse rounded bg-[--bg-subtle]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[--bg-subtle]" />
      </div>
      <div className="mt-3 flex gap-1.5">
        {[56, 72, 64, 80].map((width, i) => (
          <div
            key={i}
            className="h-5 animate-pulse rounded-md bg-[--bg-subtle]"
            style={{ width }}
          />
        ))}
      </div>
    </div>
  );
}
