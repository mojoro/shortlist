interface ScoreBadgeProps {
  score: number | null;
}

function getBadgeStyle(score: number | null): { className: string; label: string } {
  if (score === null) {
    return { className: "bg-[--border] text-[--text-muted]", label: "—" };
  }
  if (score >= 90) return { className: "bg-[#16a34a] text-white", label: String(score) };
  if (score >= 75) return { className: "bg-[#d97706] text-white", label: String(score) };
  return { className: "bg-[#dc2626] text-white", label: String(score) };
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const { className, label } = getBadgeStyle(score);
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
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold ${className}`}
      aria-label={ariaLabel}
    >
      {label}
    </span>
  );
}
