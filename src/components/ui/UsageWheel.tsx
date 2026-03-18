interface UsageWheelProps {
  /** Percentage remaining (0–100) */
  percentage: number;
  /** Diameter in pixels */
  size?: number;
  /** Whether to show the percentage number inside */
  showLabel?: boolean;
}

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getColorClass(pct: number): string {
  if (pct > 30) return "stroke-[var(--accent)]";
  if (pct > 10) return "stroke-amber-500";
  return "stroke-red-500";
}

export function UsageWheel({
  percentage,
  size = 32,
  showLabel = true,
}: UsageWheelProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx="16"
          cy="16"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          className="stroke-[var(--bg-subtle)]"
        />
        {/* Fill */}
        <circle
          cx="16"
          cy="16"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`transition-all duration-500 ${getColorClass(clamped)}`}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-[var(--text)]">
          {Math.round(clamped)}
        </span>
      )}
    </div>
  );
}
