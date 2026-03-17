"use client";

import { useState } from "react";
import { useDashboardStore } from "@/lib/store";
import {
  selectActiveApplications,
  selectClosedApplications,
  selectPipelineStats,
  selectFollowUpDue,
  sortApplications,
} from "@/lib/store-selectors";
import { PipelineStats } from "@/components/pipeline/PipelineStats";
import { FollowUpBanner } from "@/components/pipeline/FollowUpBanner";
import { PipelineTable } from "@/components/pipeline/PipelineTable";
import { PipelineSortBar } from "@/components/pipeline/PipelineSortBar";

interface PipelineClientProps {
  initialSort: string;
  initialDir: string;
}

export function PipelineClient({ initialSort, initialDir }: PipelineClientProps) {
  const activeApps = useDashboardStore(selectActiveApplications);
  const closedApps = useDashboardStore(selectClosedApplications);
  const stats = useDashboardStore(selectPipelineStats);
  const followUpDue = useDashboardStore(selectFollowUpDue);
  const hydrated = useDashboardStore((s) => s.hydrated);

  const [sort, setSort] = useState(initialSort);
  const [dir, setDir] = useState(initialDir);

  if (!hydrated) {
    return null;
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

      <PipelineSortBar
        sort={sort}
        dir={dir}
        onSortChange={(newSort, newDir) => {
          setSort(newSort);
          setDir(newDir);
        }}
      />

      <PipelineTable
        activeApplications={sortedActive}
        closedApplications={sortedClosed}
      />
    </div>
  );
}
