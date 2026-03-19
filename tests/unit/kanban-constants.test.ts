import { describe, it, expect } from "vitest";
import type { ApplicationWithJob } from "@/types";
import {
  KANBAN_COLUMNS,
  getClosedLabel,
  groupByStatus,
} from "@/components/pipeline/kanban/constants";
import { TERMINAL_STATUSES } from "@/components/pipeline/shared";

describe("kanban constants", () => {
  it("defines 5 active columns in pipeline order", () => {
    expect(KANBAN_COLUMNS).toHaveLength(5);
    expect(KANBAN_COLUMNS.map((c) => c.status)).toEqual([
      "INTERESTED",
      "APPLIED",
      "SCREENING",
      "INTERVIEWING",
      "OFFER",
    ]);
  });

  it("TERMINAL_STATUSES contains 4 closed statuses", () => {
    expect(TERMINAL_STATUSES.size).toBe(4);
    expect(TERMINAL_STATUSES.has("ACCEPTED")).toBe(true);
    expect(TERMINAL_STATUSES.has("REJECTED")).toBe(true);
    expect(TERMINAL_STATUSES.has("WITHDRAWN")).toBe(true);
    expect(TERMINAL_STATUSES.has("GHOSTED")).toBe(true);
  });

  it("getClosedLabel returns human labels", () => {
    expect(getClosedLabel("ACCEPTED")).toBe("Accepted");
    expect(getClosedLabel("REJECTED")).toBe("Rejected");
    expect(getClosedLabel("WITHDRAWN")).toBe("Withdrawn");
    expect(getClosedLabel("GHOSTED")).toBe("Ghosted");
  });
});

describe("groupByStatus", () => {
  function makeApp(status: string): ApplicationWithJob {
    return { status } as ApplicationWithJob;
  }

  it("groups applications into column buckets", () => {
    const apps = [
      makeApp("INTERESTED"),
      makeApp("INTERESTED"),
      makeApp("APPLIED"),
      makeApp("SCREENING"),
      makeApp("OFFER"),
    ];
    const grouped = groupByStatus(apps);

    expect(grouped.get("INTERESTED")).toHaveLength(2);
    expect(grouped.get("APPLIED")).toHaveLength(1);
    expect(grouped.get("SCREENING")).toHaveLength(1);
    expect(grouped.get("INTERVIEWING")).toHaveLength(0);
    expect(grouped.get("OFFER")).toHaveLength(1);
  });

  it("returns empty arrays for all columns when no apps", () => {
    const grouped = groupByStatus([]);
    for (const col of KANBAN_COLUMNS) {
      expect(grouped.get(col.status)).toEqual([]);
    }
  });

  it("ignores terminal statuses", () => {
    const apps = [makeApp("REJECTED"), makeApp("GHOSTED")];
    const grouped = groupByStatus(apps);
    // Terminal statuses don't have columns, so they get ignored
    for (const col of KANBAN_COLUMNS) {
      expect(grouped.get(col.status)).toHaveLength(0);
    }
  });
});
