interface StatsRowProps {
  newCount: number;
  savedCount: number;
  appliedCount: number;
  avgScore: number | null;
}

interface StatCardProps {
  label: string;
  value: string | number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[--text-muted]">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-[--text] tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function StatsRow({ newCount, savedCount, appliedCount, avgScore }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="New Today" value={newCount} />
      <StatCard label="Saved" value={savedCount} />
      <StatCard label="Applied" value={appliedCount} />
      <StatCard
        label="Avg Match"
        value={avgScore !== null ? `${Math.round(avgScore)}%` : "—"}
      />
    </div>
  );
}
