interface PipelineStatsProps {
  activeCount: number;
  appliedCount: number;
  interviewingCount: number;
  offerCount: number;
}

interface StatCardProps {
  label: string;
  value: number;
  accent?: boolean;
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p
        className={[
          "text-2xl font-bold",
          accent ? "text-[var(--accent)]" : "text-[var(--text)]",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

export function PipelineStats({
  activeCount,
  appliedCount,
  interviewingCount,
  offerCount,
}: PipelineStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Active" value={activeCount} />
      <StatCard label="Applied" value={appliedCount} />
      <StatCard label="Interviewing" value={interviewingCount} />
      <StatCard label="Offers" value={offerCount} accent={offerCount > 0} />
    </div>
  );
}
