export default function TailorLoading() {
  return (
    <div
      className="hidden h-[calc(100vh-4rem)] md:flex animate-pulse"
      aria-busy="true"
      aria-label="Loading tailor"
    >
      <div className="w-[40%] shrink-0 space-y-3 border-r border-[var(--border)] p-4">
        <div className="h-3 w-24 rounded bg-[var(--bg-subtle)]" />
        <div className="h-4 w-48 rounded bg-[var(--bg-subtle)]" />
        <div className="h-3 w-32 rounded bg-[var(--bg-subtle)]" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-3 rounded bg-[var(--bg-subtle)] ${i % 3 === 2 ? "w-2/3" : "w-full"}`}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="h-6 w-6 rounded-full bg-[var(--bg-subtle)]" />
        <div className="h-4 w-40 rounded bg-[var(--bg-subtle)]" />
        <div className="h-3 w-56 rounded bg-[var(--bg-subtle)]" />
        <div className="h-10 w-64 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="h-10 w-64 rounded-lg bg-[var(--bg-subtle)]" />
      </div>
    </div>
  );
}
