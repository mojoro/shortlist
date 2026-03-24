interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function AdminStatCard({ label, value, subtitle }: AdminStatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--text)]">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
      )}
    </div>
  );
}
