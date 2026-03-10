interface ScoreBadgeProps {
  score: number | null;
}

interface BadgeConfig {
  bg: string;
  text: string;
  label: string;
}

function getBadgeConfig(score: number | null): BadgeConfig {
  if (score === null) {
    return {
      bg: "bg-[#f4f4f5] dark:bg-[#27272a]",
      text: "text-[#71717a] dark:text-[#a1a1aa]",
      label: "Not yet scored",
    };
  }
  if (score >= 90) {
    return {
      bg: "bg-[#dcfce7] dark:bg-[#14532d]",
      text: "text-[#16a34a] dark:text-[#4ade80]",
      label: "Strong match",
    };
  }
  if (score >= 75) {
    return {
      bg: "bg-[#fef9c3] dark:bg-[#713f12]",
      text: "text-[#a16207] dark:text-[#fbbf24]",
      label: "Good match",
    };
  }
  return {
    bg: "bg-[#f4f4f5] dark:bg-[#27272a]",
    text: "text-[#71717a] dark:text-[#a1a1aa]",
    label: "Weak match",
  };
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const { bg, text, label } = getBadgeConfig(score);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}
      aria-label={score !== null ? `${score} — ${label}` : label}
    >
      {score !== null && <span className="font-semibold">{score}</span>}
      <span>{label}</span>
    </span>
  );
}
