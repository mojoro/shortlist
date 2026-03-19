import type { ApplicationStatus } from "@prisma/client";
import type { ApplicationWithJob } from "@/types";
import { STATUS_LABELS } from "@/components/pipeline/shared";

export const KANBAN_COLUMNS: {
  status: ApplicationStatus;
  label: string;
  dotColor: string;
}[] = [
  { status: "INTERESTED", label: "Interested", dotColor: "bg-[var(--text-muted)]" },
  { status: "APPLIED", label: "Applied", dotColor: "bg-blue-500" },
  { status: "SCREENING", label: "Screening", dotColor: "bg-purple-500" },
  { status: "INTERVIEWING", label: "Interviewing", dotColor: "bg-amber-500" },
  { status: "OFFER", label: "Offer", dotColor: "bg-green-500" },
];

export function getClosedLabel(status: ApplicationStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function groupByStatus(
  apps: ApplicationWithJob[],
): Map<ApplicationStatus, ApplicationWithJob[]> {
  const map = new Map<ApplicationStatus, ApplicationWithJob[]>();
  for (const col of KANBAN_COLUMNS) {
    map.set(col.status, []);
  }
  for (const app of apps) {
    const bucket = map.get(app.status);
    if (bucket) bucket.push(app);
  }
  return map;
}
