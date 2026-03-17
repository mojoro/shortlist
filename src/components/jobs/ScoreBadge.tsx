interface ScoreBadgeProps {
  score: number | null;
}

function getBadgeStyle(score: number | null): {
  className: string;
  value: string;
  label: string | null;
} {
  if (score === null) {
    return { className: "bg-[var(--border)] text-[var(--text-muted)]", value: "—", label: null };
  }
  if (score >= 90)
    return { className: "bg-green-600 text-white", value: String(score), label: "Strong" };
  if (score >= 75)
    return { className: "bg-amber-500 text-white", value: String(score), label: "Good" };
  return { className: "bg-red-600 text-white", value: String(score), label: "Weak" };
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const { className, value, label } = getBadgeStyle(score);
  const ariaLabel =
    score === null
      ? "Not yet scored"
      : score >= 90
        ? `${score} — Strong match`
        : score >= 75
          ? `${score} — Good match`
          : `${score} — Weak match`;

  return (
    <span
      className={`inline-flex h-11 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl ${className}`}
      aria-label={ariaLabel}
    >
      <span className="text-base font-black leading-none tabular-nums">{value}</span>
      {label && (
        <span className="text-[7px] font-semibold uppercase tracking-wider leading-none opacity-80">
          {label}
        </span>
      )}
    </span>
  );
}
