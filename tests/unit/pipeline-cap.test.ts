import { describe, it, expect } from "vitest";

/**
 * Tests for the pipeline candidate cap behavior.
 *
 * The match pipeline runs Tier 1 (SQL) and Tier 2 (heuristic) on the full
 * pool, but caps at MAX_CANDIDATES_PER_RUN (50) between Tier 2 and Tier 3.
 * Only the top 50 by confidence proceed to AI triage and Job creation.
 */

const MAX_CANDIDATES_PER_RUN = 50;
const ACCEPT_THRESHOLD = 0.6;

type QualifiedEntry = {
  id: string;
  confidence: number;
  candidate?: { id: string };
};

function applyCap(accepted: QualifiedEntry[], borderline: QualifiedEntry[]) {
  const allQualified = [...accepted, ...borderline];
  allQualified.sort((a, b) => b.confidence - a.confidence);

  const totalQualified = allQualified.length;
  const capped = allQualified.slice(0, MAX_CANDIDATES_PER_RUN);

  const cappedAccepted = capped.filter((e) => e.confidence >= ACCEPT_THRESHOLD);
  const cappedBorderline = capped.filter(
    (e) => e.confidence < ACCEPT_THRESHOLD && e.candidate !== undefined,
  );

  return { totalQualified, cappedAccepted, cappedBorderline };
}

function makeEntry(id: string, confidence: number, isBorderline = false): QualifiedEntry {
  return {
    id,
    confidence,
    ...(isBorderline ? { candidate: { id } } : {}),
  };
}

describe("pipeline cap — MAX_CANDIDATES_PER_RUN = 50", () => {
  it("passes through all candidates when under the cap", () => {
    const accepted = Array.from({ length: 30 }, (_, i) =>
      makeEntry(`a${i}`, 0.8 - i * 0.005),
    );
    const borderline = Array.from({ length: 10 }, (_, i) =>
      makeEntry(`b${i}`, 0.5 - i * 0.01, true),
    );

    const result = applyCap(accepted, borderline);

    expect(result.totalQualified).toBe(40);
    expect(result.cappedAccepted).toHaveLength(30);
    expect(result.cappedBorderline).toHaveLength(10);
  });

  it("caps at 50 when there are more qualified candidates", () => {
    const accepted = Array.from({ length: 200 }, (_, i) =>
      makeEntry(`a${i}`, 0.9 - i * 0.001),
    );
    const borderline = Array.from({ length: 100 }, (_, i) =>
      makeEntry(`b${i}`, 0.5 - i * 0.001, true),
    );

    const result = applyCap(accepted, borderline);

    expect(result.totalQualified).toBe(300);
    expect(result.cappedAccepted.length + result.cappedBorderline.length).toBe(50);
  });

  it("takes the highest confidence candidates when capping", () => {
    const accepted = [
      makeEntry("low", 0.61),
      makeEntry("high", 0.95),
      makeEntry("mid", 0.75),
    ];

    const result = applyCap(accepted, []);

    expect(result.cappedAccepted[0].id).toBe("high");
    expect(result.cappedAccepted[1].id).toBe("mid");
    expect(result.cappedAccepted[2].id).toBe("low");
  });

  it("includes borderlines in the cap alongside accepted", () => {
    // 45 accepted + 10 borderline = 55 total → capped to 50
    const accepted = Array.from({ length: 45 }, (_, i) =>
      makeEntry(`a${i}`, 0.9 - i * 0.005),
    );
    const borderline = Array.from({ length: 10 }, (_, i) =>
      makeEntry(`b${i}`, 0.55 - i * 0.01, true),
    );

    const result = applyCap(accepted, borderline);

    expect(result.totalQualified).toBe(55);
    const total = result.cappedAccepted.length + result.cappedBorderline.length;
    expect(total).toBe(50);
    // The lowest-confidence entries should be dropped
  });

  it("correctly splits capped list back into accepted vs borderline", () => {
    // Mix of accepted (>= 0.6) and borderline (< 0.6)
    const accepted = [makeEntry("a1", 0.8), makeEntry("a2", 0.7)];
    const borderline = [makeEntry("b1", 0.5, true), makeEntry("b2", 0.4, true)];

    const result = applyCap(accepted, borderline);

    expect(result.cappedAccepted).toHaveLength(2);
    expect(result.cappedBorderline).toHaveLength(2);
    expect(result.cappedAccepted.every((e) => e.confidence >= ACCEPT_THRESHOLD)).toBe(true);
    expect(result.cappedBorderline.every((e) => e.confidence < ACCEPT_THRESHOLD)).toBe(true);
  });

  it("computes correct pendingMatchCount", () => {
    const accepted = Array.from({ length: 80 }, (_, i) =>
      makeEntry(`a${i}`, 0.9 - i * 0.003),
    );
    const borderline = Array.from({ length: 20 }, (_, i) =>
      makeEntry(`b${i}`, 0.5 - i * 0.005, true),
    );

    const result = applyCap(accepted, borderline);

    // 100 total qualified, 50 capped → ~50 pending
    // (exact pendingMatchCount = totalQualified - jobsCreated, computed after createMany)
    expect(result.totalQualified).toBe(100);
    const cappedCount = result.cappedAccepted.length + result.cappedBorderline.length;
    expect(result.totalQualified - cappedCount).toBe(50);
  });

  it("handles empty inputs", () => {
    const result = applyCap([], []);
    expect(result.totalQualified).toBe(0);
    expect(result.cappedAccepted).toHaveLength(0);
    expect(result.cappedBorderline).toHaveLength(0);
  });

  it("handles all borderline, no accepted", () => {
    const borderline = Array.from({ length: 60 }, (_, i) =>
      makeEntry(`b${i}`, 0.55 - i * 0.003, true),
    );

    const result = applyCap([], borderline);

    expect(result.totalQualified).toBe(60);
    expect(result.cappedAccepted).toHaveLength(0);
    expect(result.cappedBorderline).toHaveLength(50);
  });
});
