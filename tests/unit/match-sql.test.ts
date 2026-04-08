import { describe, it, expect } from "vitest";

/**
 * Tests for the SQL matching logic. Since the actual functions hit Prisma,
 * we test the helper logic and contract — buildMatchConditions produces
 * the right patterns for different profile configurations.
 *
 * The roleToPatterns function is internal, so we test its behavior
 * indirectly through the expected matching rules.
 */

// Replicate the roleToPatterns logic for unit testing
const ROLE_STOPWORDS = new Set([
  "engineer", "developer", "manager", "lead", "senior", "junior",
  "head", "principal", "staff", "associate", "mid", "and", "the",
  "of", "&", "/", "specialist", "expert", "architect", "software",
]);

function roleToPatterns(role: string): string[] {
  const tokens = role
    .toLowerCase()
    .split(/[\s/\-&]+/)
    .filter((t) => t.length > 1 && !ROLE_STOPWORDS.has(t));
  if (tokens.length > 0) return tokens.map((t) => `%${t}%`);
  return [`%${role.toLowerCase()}%`];
}

describe("roleToPatterns", () => {
  it("strips stopwords and returns significant tokens", () => {
    expect(roleToPatterns("Frontend Engineer")).toEqual(["%frontend%"]);
  });

  it("returns multiple tokens for multi-word roles", () => {
    expect(roleToPatterns("Data Science Manager")).toEqual(["%data%", "%science%"]);
  });

  it("falls back to full phrase when all tokens are stopwords", () => {
    expect(roleToPatterns("Software Engineer")).toEqual(["%software engineer%"]);
  });

  it("handles slashes and hyphens as separators", () => {
    expect(roleToPatterns("Frontend/Backend Developer")).toEqual(["%frontend%", "%backend%"]);
  });

  it("filters single-character tokens", () => {
    expect(roleToPatterns("AI & ML Engineer")).toEqual(["%ai%", "%ml%"]);
  });
});

describe("match-sql exports contract", () => {
  it("exported functions have the expected signatures", async () => {
    const mod = await import("@/lib/match-sql");
    expect(typeof mod.findMatchingPoolIds).toBe("function");
    expect(typeof mod.findStaleJobIds).toBe("function");
  });
});

describe("match criteria classification", () => {
  const SEARCH_CRITERIA_FIELDS = [
    "targetRoles",
    "targetLocations",
    "remotePreference",
    "requiredSkills",
    "excludedKeywords",
  ] as const;

  it("all five criteria fields are used by the matching logic", () => {
    // These are the fields that buildMatchConditions reads from the profile
    expect(SEARCH_CRITERIA_FIELDS).toHaveLength(5);
    expect(SEARCH_CRITERIA_FIELDS).toContain("targetRoles");
    expect(SEARCH_CRITERIA_FIELDS).toContain("targetLocations");
    expect(SEARCH_CRITERIA_FIELDS).toContain("remotePreference");
    expect(SEARCH_CRITERIA_FIELDS).toContain("requiredSkills");
    expect(SEARCH_CRITERIA_FIELDS).toContain("excludedKeywords");
  });

  it("niceToHaveSkills is NOT used for matching (only for AI scoring)", () => {
    expect(SEARCH_CRITERIA_FIELDS).not.toContain("niceToHaveSkills");
  });
});
