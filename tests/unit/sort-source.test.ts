import { describe, it, expect } from "vitest";
import type { JobWithApplication } from "@/types";
import { sortJobs } from "@/lib/store-filters";

function makeJob(source: string): JobWithApplication {
  return {
    jobPool: { source },
  } as unknown as JobWithApplication;
}

describe("sortJobs — source", () => {
  it("sorts by source name ascending", () => {
    const jobs = [
      makeJob("LEVER"),
      makeJob("ADZUNA"),
      makeJob("GREENHOUSE"),
      makeJob("USAJOBS"),
      makeJob("ARBEITNOW"),
    ];
    const sorted = sortJobs(jobs, "source", "asc");
    expect(sorted.map((j) => j.jobPool.source)).toEqual([
      "ADZUNA",
      "ARBEITNOW",
      "GREENHOUSE",
      "LEVER",
      "USAJOBS",
    ]);
  });

  it("sorts by source name descending", () => {
    const jobs = [
      makeJob("LEVER"),
      makeJob("ADZUNA"),
      makeJob("GREENHOUSE"),
    ];
    const sorted = sortJobs(jobs, "source", "desc");
    expect(sorted.map((j) => j.jobPool.source)).toEqual([
      "LEVER",
      "GREENHOUSE",
      "ADZUNA",
    ]);
  });

  it("groups jobs with the same source together", () => {
    const jobs = [
      makeJob("GREENHOUSE"),
      makeJob("LEVER"),
      makeJob("GREENHOUSE"),
      makeJob("LEVER"),
    ];
    const sorted = sortJobs(jobs, "source", "asc");
    expect(sorted[0].jobPool.source).toBe("GREENHOUSE");
    expect(sorted[1].jobPool.source).toBe("GREENHOUSE");
    expect(sorted[2].jobPool.source).toBe("LEVER");
    expect(sorted[3].jobPool.source).toBe("LEVER");
  });

  it("returns a new array, does not mutate the original", () => {
    const jobs = [makeJob("LEVER"), makeJob("ADZUNA")];
    const original = [...jobs];
    sortJobs(jobs, "source", "asc");
    expect(jobs[0].jobPool.source).toBe(original[0].jobPool.source);
    expect(jobs[1].jobPool.source).toBe(original[1].jobPool.source);
  });
});
