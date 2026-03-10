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
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-[var(--text)] tabular-nums">
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
