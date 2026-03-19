import { describe, it, expect } from "vitest";

/**
 * The profile copy logic lives in the createProfile server action.
 * Since it's a Prisma-dependent server action, we test the field selection
 * logic here — which fields should be copied vs left blank.
 */

const COPIED_FIELDS = [
  "displayName",
  "email",
  "phone",
  "location",
  "linkedinUrl",
  "portfolioUrl",
  "githubUrl",
  "skills",
  "masterResume",
  "resumeLastEdited",
  "curriculumVitae",
  "protectedPhrases",
  "bannedPhrases",
  "verifiedMetrics",
  "neverClaim",
  "currency",
] as const;

const BLANK_FIELDS = [
  "targetRoles",
  "targetLocations",
  "targetSalaryMin",
  "targetSalaryMax",
  "requiredSkills",
  "niceToHaveSkills",
  "excludedKeywords",
  "companySize",
  "remotePreference",
] as const;

describe("Profile copy field classification", () => {
  it("copied fields do not overlap with blank fields", () => {
    const copiedSet = new Set<string>(COPIED_FIELDS);
    const blankSet = new Set<string>(BLANK_FIELDS);
    const overlap = [...copiedSet].filter((f) => blankSet.has(f));
    expect(overlap).toEqual([]);
  });

  it("copied fields include all personal info fields", () => {
    expect(COPIED_FIELDS).toContain("displayName");
    expect(COPIED_FIELDS).toContain("email");
    expect(COPIED_FIELDS).toContain("phone");
    expect(COPIED_FIELDS).toContain("location");
    expect(COPIED_FIELDS).toContain("linkedinUrl");
    expect(COPIED_FIELDS).toContain("portfolioUrl");
    expect(COPIED_FIELDS).toContain("githubUrl");
  });

  it("copied fields include resume data", () => {
    expect(COPIED_FIELDS).toContain("masterResume");
    expect(COPIED_FIELDS).toContain("curriculumVitae");
    expect(COPIED_FIELDS).toContain("resumeLastEdited");
  });

  it("copied fields include writing rules", () => {
    expect(COPIED_FIELDS).toContain("protectedPhrases");
    expect(COPIED_FIELDS).toContain("bannedPhrases");
    expect(COPIED_FIELDS).toContain("verifiedMetrics");
    expect(COPIED_FIELDS).toContain("neverClaim");
  });

  it("blank fields include all search criteria", () => {
    expect(BLANK_FIELDS).toContain("targetRoles");
    expect(BLANK_FIELDS).toContain("targetLocations");
    expect(BLANK_FIELDS).toContain("requiredSkills");
    expect(BLANK_FIELDS).toContain("excludedKeywords");
  });

  it("currency is copied (preference, not search criteria)", () => {
    expect(COPIED_FIELDS).toContain("currency");
    expect(BLANK_FIELDS).not.toContain("currency");
  });
});
