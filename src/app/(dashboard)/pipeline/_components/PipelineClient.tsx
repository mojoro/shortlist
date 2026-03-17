"use client";

import { useState } from "react";
import { useDashboardStore } from "@/lib/store";
import { isTerminalStatus, sortApplications } from "@/lib/store-filters";
import { PipelineStats } from "@/components/pipeline/PipelineStats";
import { FollowUpBanner } from "@/components/pipeline/FollowUpBanner";
import { PipelineTable } from "@/components/pipeline/PipelineTable";
import { PipelineSortBar } from "@/components/pipeline/PipelineSortBar";

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
