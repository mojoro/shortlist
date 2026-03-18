"use client";

import { useState } from "react";
import { useDashboardStore } from "@/lib/store";
import { isTerminalStatus, sortApplications } from "@/lib/store-filters";
import { PipelineStats } from "@/components/pipeline/PipelineStats";
import { FollowUpBanner } from "@/components/pipeline/FollowUpBanner";
import { PipelineTable } from "@/components/pipeline/PipelineTable";
import { PipelineSortBar } from "@/components/pipeline/PipelineSortBar";
import { ViewToggle } from "@/components/pipeline/ViewToggle";
import { KanbanBoard } from "@/components/pipeline/kanban";

interface PipelineClientProps {
  initialSort: string;
  initialDir: string;
}

export function PipelineClient({ initialSort, initialDir }: PipelineClientProps) {
  const applications = useDashboardStore((s) => s.applications);
  const hydrated = useDashboardStore((s) => s.hydrated);

  // Derive from raw applications array (stable reference from store)
  const activeApps = applications.filter((a) => !isTerminalStatus(a.status));
  const closedApps = applications.filter((a) => isTerminalStatus(a.status));

  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);
  const followUpDue = activeApps.filter(
    (a) => a.followUpAt && new Date(a.followUpAt) <= endOfToday,
  );

  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status === "APPLIED").length,
    interviewing: applications.filter((a) => a.status === "INTERVIEWING").length,
    offer: applications.filter((a) => a.status === "OFFER").length,
  };

  const [sort, setSort] = useState(initialSort);
  const [dir, setDir] = useState(initialDir);
  const [view, setView] = useState<"table" | "board">("table");

  if (!hydrated) {
    return <PipelineSkeleton />;
  }

  const sortedActive = sortApplications(activeApps, sort, dir);
  const sortedClosed = sortApplications(closedApps, sort, dir);

  const totalApps = stats.total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Your pipeline
        </h1>
        <p className="mt-1 text-2xl font-bold text-[var(--text)]">
          {totalApps === 0
            ? "No applications yet"
            : `${activeApps.length} active application${activeApps.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <PipelineStats
        activeCount={activeApps.length}
        appliedCount={stats.applied}
        interviewingCount={stats.interviewing}
        offerCount={stats.offer}
      />

      {followUpDue.length > 0 && (
        <FollowUpBanner dueApplications={followUpDue} />
      )}

      <div className="flex items-center justify-between gap-3">
        {view === "table" && (
          <PipelineSortBar
            sort={sort}
            dir={dir}
            onSortChange={(newSort, newDir) => {
              setSort(newSort);
              setDir(newDir);
            }}
          />
        )}
        {view === "board" && <div />}
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {view === "table" ? (
        <PipelineTable
          activeApplications={sortedActive}
          closedApplications={sortedClosed}
        />
      ) : (
        <KanbanBoard
          activeApplications={activeApps}
          closedApplications={closedApps}
        />
      )}
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading your pipeline">
      {/* Heading */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-[var(--bg-subtle)]" />
        <div className="h-8 w-56 rounded bg-[var(--bg-subtle)]" />
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]" />
        ))}
      </div>

      {/* Table rows */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="h-10 border-b border-[var(--border)] bg-[var(--bg-subtle)]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 last:border-0">
            <div className="h-4 flex-1 rounded bg-[var(--bg-subtle)]" />
            <div className="h-7 w-28 rounded-md bg-[var(--bg-subtle)]" />
            <div className="h-4 w-20 rounded bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
