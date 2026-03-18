"use client";

import { format } from "date-fns";
import { useDashboardStore } from "@/lib/store";
import { UsageWheel } from "@/components/ui/UsageWheel";

const fmt = new Intl.NumberFormat();

function getBarColor(pct: number): string {
  if (pct > 30) return "bg-[var(--accent)]";
  if (pct > 10) return "bg-amber-500";
  return "bg-red-500";
}

export function UsageSection() {
  const usage = useDashboardStore((s) => s.usage);

  if (!usage) {
    return (
      <section id="usage" className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Usage</h2>
        <p className="text-sm text-[var(--text-muted)]">
          No usage data available yet. Usage tracking starts after your first AI
          action.
        </p>
      </section>
    );
  }

  const { currentMonthInputTokens, monthlyLimitInputTokens, analysisCallCount, tailorCallCount, currentMonthResetsAt } = usage;
  const usedPct = monthlyLimitInputTokens > 0
    ? Math.min(100, Math.round((currentMonthInputTokens / monthlyLimitInputTokens) * 100))
    : 0;
  const remainingPct = 100 - usedPct;

  return (
    <section id="usage" className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text)]">Usage</h2>

      {/* Wheel + summary */}
      <div className="flex items-center gap-4">
        <UsageWheel percentage={remainingPct} size={48} />
        <div>
          <p className="text-sm font-medium text-[var(--text)]">
            {remainingPct}% remaining this month
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {fmt.format(currentMonthInputTokens)} / {fmt.format(monthlyLimitInputTokens)} input tokens used
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(remainingPct)}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xl font-bold text-[var(--text)]">{analysisCallCount}</p>
          <p className="text-xs text-[var(--text-muted)]">Match analyses</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xl font-bold text-[var(--text)]">{tailorCallCount}</p>
          <p className="text-xs text-[var(--text-muted)]">Tailored resumes</p>
        </div>
      </div>

      {/* Reset date */}
      {currentMonthResetsAt && (
        <p className="text-xs text-[var(--text-muted)]">
          Resets {format(new Date(currentMonthResetsAt), "MMMM d, yyyy")}
        </p>
      )}
    </section>
  );
}
