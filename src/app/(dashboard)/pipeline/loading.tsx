export default function PipelineLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 animate-pulse rounded bg-[var(--border)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--border)]" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-[var(--border)]" />
    </div>
  );
}
