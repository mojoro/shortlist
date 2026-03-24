import { describe, it, expect, vi, beforeEach } from "vitest";

// We only test the merge logic — not the DB query itself.
// Extract a pure helper so we can test it without Prisma.
import { mergeSourceCounts } from "@/lib/admin-queries";
import { ScraperSource } from "@prisma/client";

describe("mergeSourceCounts", () => {
  it("returns all ScraperSource values even when some are missing from DB results", () => {
    const dbResult = [
      { source: ScraperSource.GREENHOUSE, _count: 100 },
      { source: ScraperSource.ARBEITNOW, _count: 44 },
    ];

    const result = mergeSourceCounts(dbResult);

    const sources = result.map((r) => r.source);
    expect(sources).toContain(ScraperSource.USAJOBS);
    expect(sources).toContain(ScraperSource.ADZUNA);
    expect(sources).toContain(ScraperSource.ASHBY);
    expect(sources).toContain(ScraperSource.LEVER);
    expect(sources).toContain(ScraperSource.CUSTOM);
    expect(result).toHaveLength(7);
  });

  it("preserves counts from DB for sources that have entries", () => {
    const dbResult = [
      { source: ScraperSource.GREENHOUSE, _count: 6881 },
    ];

    const result = mergeSourceCounts(dbResult);

    const gh = result.find((r) => r.source === ScraperSource.GREENHOUSE);
    expect(gh?._count).toBe(6881);
  });

  it("sets _count to 0 for sources absent from DB result", () => {
    const dbResult: { source: ScraperSource; _count: number }[] = [];

    const result = mergeSourceCounts(dbResult);

    for (const r of result) {
      expect(r._count).toBe(0);
    }
  });

  it("returns sources in the canonical display order", () => {
    const result = mergeSourceCounts([]);
    const sources = result.map((r) => r.source);
    expect(sources).toEqual([
      ScraperSource.GREENHOUSE,
      ScraperSource.ASHBY,
      ScraperSource.LEVER,
      ScraperSource.USAJOBS,
      ScraperSource.ADZUNA,
      ScraperSource.ARBEITNOW,
      ScraperSource.CUSTOM,
    ]);
  });
});
