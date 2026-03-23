import { describe, it, expect } from "vitest";
import {
  scoreAndClassify,
  scoreTitleRelevance,
  scoreSkillOverlap,
  scoreLocationQuality,
  scoreDescriptionRelevance,
  scoreMetadata,
  ACCEPT_THRESHOLD,
  BORDERLINE_THRESHOLD,
  type PoolCandidate,
  type HeuristicProfile,
} from "@/lib/match-heuristic";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<PoolCandidate> = {}): PoolCandidate {
  return {
    id: "pool-1",
    title: "Frontend Engineer",
    company: "Acme Corp",
    location: "Berlin, Germany",
    country: "DE",
    region: "Berlin",
    descriptionExcerpt:
      "We are looking for a Frontend Engineer with TypeScript and React experience. " +
      "You will build high-quality web applications.",
    skills: ["TypeScript", "React", "CSS"],
    salaryMin: 80000,
    salaryMax: 110000,
    jobType: "FULL_TIME",
    companySize: "MEDIUM",
    locationType: "ONSITE",
    ...overrides,
  };
}

function makeProfile(overrides: Partial<HeuristicProfile> = {}): HeuristicProfile {
  return {
    targetRoles: ["Frontend Engineer"],
    requiredSkills: ["TypeScript", "React"],
    niceToHaveSkills: ["CSS", "GraphQL"],
    targetLocations: ["Berlin"],
    workEligibility: ["DE", "EU"],
    remotePreference: "ANY",
    targetSalaryMin: 70000,
    targetSalaryMax: 120000,
    currency: "EUR",
    companySize: ["MEDIUM", "LARGE"],
    ...overrides,
  };
}

// ── scoreAndClassify integration tests ───────────────────────────────────────

describe("scoreAndClassify", () => {
  it("perfect match is accepted with score >= 0.6", () => {
    const candidate = makeCandidate();
    const profile = makeProfile();
    const result = scoreAndClassify([candidate], profile);

    expect(result.accepted).toHaveLength(1);
    expect(result.borderline).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
    expect(result.accepted[0].id).toBe("pool-1");
    expect(result.accepted[0].confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
  });

  it("partial match is borderline (title ok, skills partial, location unknown)", () => {
    const candidate = makeCandidate({
      id: "pool-2",
      title: "Frontend Developer", // close but not exact
      location: null,              // unknown location
      country: null,
      locationType: null,
      skills: ["React"],           // only one of two required skills
      descriptionExcerpt: "React developer needed for our team.",
    });
    const profile = makeProfile({
      requiredSkills: ["TypeScript", "React", "Vue"],
    });
    const result = scoreAndClassify([candidate], profile);

    expect(result.borderline).toHaveLength(1);
    expect(result.borderline[0].id).toBe("pool-2");
    expect(result.borderline[0].confidence).toBeGreaterThanOrEqual(BORDERLINE_THRESHOLD);
    expect(result.borderline[0].confidence).toBeLessThan(ACCEPT_THRESHOLD);
    // Borderline includes the full candidate object for AI triage
    expect(result.borderline[0].candidate).toBeDefined();
    expect(result.borderline[0].candidate.id).toBe("pool-2");
  });

  it("no relevance is rejected with score < 0.3", () => {
    const candidate = makeCandidate({
      id: "pool-3",
      title: "Accountant",
      company: "Finance Co",
      location: "Tokyo, Japan",
      country: "JP",
      locationType: "ONSITE",
      descriptionExcerpt: "We need a qualified accountant with CPA certification.",
      skills: ["Excel", "Accounting"],
      salaryMin: 30000,
      salaryMax: 40000,
    });
    const profile = makeProfile({
      targetRoles: ["Frontend Engineer"],
      requiredSkills: ["TypeScript", "React"],
      workEligibility: ["DE"],
      targetLocations: ["Berlin"],
      targetSalaryMin: 80000,
      targetSalaryMax: 120000,
    });
    const result = scoreAndClassify([candidate], profile);

    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].id).toBe("pool-3");
    expect(result.rejected[0].confidence).toBeLessThan(BORDERLINE_THRESHOLD);
  });

  it("empty profile criteria yields neutral scores around 0.5", () => {
    const candidate = makeCandidate({ id: "pool-4" });
    const profile = makeProfile({
      targetRoles: [],
      requiredSkills: [],
      niceToHaveSkills: [],
      targetLocations: [],
      workEligibility: [],
      companySize: [],
      targetSalaryMin: null,
      targetSalaryMax: null,
    });
    const result = scoreAndClassify([candidate], profile);

    // With all-neutral signals the composite should be around 0.5 — borderline or accepted
    const allResults = [
      ...result.accepted,
      ...result.borderline,
      ...result.rejected,
    ];
    expect(allResults).toHaveLength(1);
    expect(allResults[0].confidence).toBeGreaterThan(0.3);
  });

  it("populates all three arrays correctly when given mixed candidates", () => {
    const good = makeCandidate({ id: "good" });
    const bad = makeCandidate({
      id: "bad",
      title: "Accountant",
      location: "Tokyo",
      country: "JP",
      skills: [],
      descriptionExcerpt: "Accounting role",
      salaryMin: 20000,
      salaryMax: 30000,
    });
    const profile = makeProfile({
      targetSalaryMin: 80000,
    });

    const result = scoreAndClassify([good, bad], profile);

    const goodAccepted = result.accepted.find((r) => r.id === "good");
    const badResult =
      result.rejected.find((r) => r.id === "bad") ??
      result.borderline.find((r) => r.id === "bad");

    expect(goodAccepted).toBeDefined();
    expect(badResult).toBeDefined();
  });
});

// ── scoreTitleRelevance ───────────────────────────────────────────────────────

describe("scoreTitleRelevance", () => {
  it("full phrase match returns 1.0", () => {
    expect(scoreTitleRelevance("Senior Frontend Engineer", ["Frontend Engineer"])).toBe(1.0);
  });

  it("full phrase match is case-insensitive", () => {
    expect(scoreTitleRelevance("frontend engineer", ["Frontend Engineer"])).toBe(1.0);
  });

  it("no match returns 0.0", () => {
    expect(scoreTitleRelevance("Accountant", ["Frontend Engineer"])).toBe(0.0);
  });

  it("partial token match returns between 0.3 and 0.9", () => {
    // "Frontend" appears in "React Frontend" — 1 of 1 meaningful token (Engineer stripped)
    const score = scoreTitleRelevance("React Frontend Developer", ["Frontend Engineer"]);
    expect(score).toBeGreaterThanOrEqual(0.3);
    expect(score).toBeLessThan(1.0);
  });

  it("empty roles returns 0.5 (neutral)", () => {
    expect(scoreTitleRelevance("Frontend Engineer", [])).toBe(0.5);
  });
});

// ── scoreSkillOverlap ─────────────────────────────────────────────────────────

describe("scoreSkillOverlap", () => {
  it("all required skills present returns >= base score", () => {
    const candidate = makeCandidate({
      skills: ["TypeScript", "React"],
      descriptionExcerpt: "TypeScript and React required.",
    });
    const score = scoreSkillOverlap(candidate, ["TypeScript", "React"], []);
    expect(score).toBeGreaterThanOrEqual(1.0);
  });

  it("no required skills returns 0.5 (neutral)", () => {
    const candidate = makeCandidate();
    expect(scoreSkillOverlap(candidate, [], [])).toBe(0.5);
  });

  it("nice-to-have skills add bonus up to 0.2", () => {
    // Use 3 required skills with only 1 matched so base < 1.0, leaving room for bonus
    const candidate = makeCandidate({
      skills: ["TypeScript", "GraphQL"],
      descriptionExcerpt: "TypeScript and GraphQL experience needed.",
    });
    const baseScore = scoreSkillOverlap(
      candidate,
      ["TypeScript", "React", "Vue"],
      [],
    );
    const bonusScore = scoreSkillOverlap(
      candidate,
      ["TypeScript", "React", "Vue"],
      ["GraphQL"],
    );
    expect(baseScore).toBeLessThan(1.0); // ensure there's room for a bonus
    expect(bonusScore).toBeGreaterThan(baseScore);
    expect(bonusScore).toBeLessThanOrEqual(1.0);
  });

  it("no skills match returns low score", () => {
    const candidate = makeCandidate({
      skills: [],
      descriptionExcerpt: "Looking for accounting experience.",
      title: "Accountant",
    });
    const score = scoreSkillOverlap(candidate, ["TypeScript", "React", "Vue"], []);
    expect(score).toBe(0);
  });
});

// ── scoreLocationQuality ──────────────────────────────────────────────────────

describe("scoreLocationQuality", () => {
  it("exact location match returns 1.0", () => {
    const candidate = makeCandidate({ location: "Berlin, Germany", country: "DE" });
    const profile = makeProfile({ targetLocations: ["Berlin"] });
    expect(scoreLocationQuality(candidate, profile)).toBe(1.0);
  });

  it("remote job with eligible country returns 0.6", () => {
    const candidate = makeCandidate({
      location: "Remote",
      locationType: "REMOTE",
      country: "DE",
    });
    const profile = makeProfile({
      targetLocations: ["Berlin"],
      workEligibility: ["DE"],
    });
    expect(scoreLocationQuality(candidate, profile)).toBe(0.6);
  });

  it("remote job with ineligible country returns 0.1", () => {
    const candidate = makeCandidate({
      location: "Remote",
      locationType: "REMOTE",
      country: "JP",
    });
    const profile = makeProfile({
      targetLocations: ["Berlin"],
      workEligibility: ["DE"],
    });
    expect(scoreLocationQuality(candidate, profile)).toBe(0.1);
  });

  it("remote job with no workEligibility set returns 0.6", () => {
    const candidate = makeCandidate({
      location: "Anywhere",
      locationType: "REMOTE",
      country: "JP",
    });
    const profile = makeProfile({
      targetLocations: ["Berlin"],
      workEligibility: [],
    });
    expect(scoreLocationQuality(candidate, profile)).toBe(0.6);
  });

  it("unknown location returns 0.3", () => {
    const candidate = makeCandidate({ location: null, locationType: null, country: null });
    const profile = makeProfile({ targetLocations: ["Berlin"] });
    expect(scoreLocationQuality(candidate, profile)).toBe(0.3);
  });

  it("country match via workEligibility returns 0.7", () => {
    const candidate = makeCandidate({
      location: "Munich, Germany",
      country: "DE",
      locationType: "ONSITE",
    });
    // targetLocations doesn't include Munich, but DE is eligible
    const profile = makeProfile({
      targetLocations: ["Berlin"],
      workEligibility: ["DE"],
    });
    expect(scoreLocationQuality(candidate, profile)).toBe(0.7);
  });
});

// ── scoreDescriptionRelevance ─────────────────────────────────────────────────

describe("scoreDescriptionRelevance", () => {
  it("empty excerpt returns 0.3 (neutral)", () => {
    expect(scoreDescriptionRelevance("", ["Frontend Engineer"], ["TypeScript"])).toBe(0.3);
  });

  it("high keyword density returns score close to 1.0", () => {
    const excerpt =
      "We need a frontend developer. React is required. TypeScript is required. " +
      "Frontend experience essential. TypeScript codebase. React components daily.";
    const score = scoreDescriptionRelevance(excerpt, ["Frontend Engineer"], ["TypeScript", "React"]);
    expect(score).toBeGreaterThan(0.6);
  });

  it("skips boilerplate and uses substantive content", () => {
    const boilerplateFirst =
      "About Us\nWe are a great company.\nWe are looking for a frontend engineer with TypeScript.";
    const score = scoreDescriptionRelevance(
      boilerplateFirst,
      ["Frontend Engineer"],
      ["TypeScript"],
    );
    // Should still find keywords in the substantive section
    expect(score).toBeGreaterThan(0.3);
  });

  it("no keywords found returns 0.0", () => {
    const score = scoreDescriptionRelevance(
      "We are an accounting firm seeking a certified accountant.",
      ["Frontend Engineer"],
      ["TypeScript", "React"],
    );
    expect(score).toBe(0.0);
  });

  it("empty keywords returns 0.3 (neutral)", () => {
    const score = scoreDescriptionRelevance(
      "Some job description text here.",
      [],
      [],
    );
    expect(score).toBe(0.3);
  });
});

// ── scoreMetadata ─────────────────────────────────────────────────────────────

describe("scoreMetadata", () => {
  it("starts at 0.5 baseline with no matching signals", () => {
    const candidate = makeCandidate({
      jobType: "PART_TIME",
      companySize: "ENTERPRISE",
      salaryMin: null,
      salaryMax: null,
    });
    const profile = makeProfile({
      remotePreference: "ANY",
      companySize: [],
      targetSalaryMin: null,
      targetSalaryMax: null,
    });
    expect(scoreMetadata(candidate, profile)).toBe(0.5);
  });

  it("full-time job for REMOTE_ONLY profile adds 0.2", () => {
    const candidate = makeCandidate({ jobType: "FULL_TIME" });
    const profile = makeProfile({ remotePreference: "REMOTE_ONLY" });
    const score = scoreMetadata(candidate, profile);
    expect(score).toBeGreaterThan(0.5);
  });

  it("overlapping salary adds 0.15", () => {
    const candidate = makeCandidate({ salaryMin: 90000, salaryMax: 110000 });
    const profile = makeProfile({ targetSalaryMin: 80000, targetSalaryMax: 120000 });
    const score = scoreMetadata(candidate, profile);
    expect(score).toBeGreaterThan(0.5);
  });

  it("salary far below profile min subtracts 0.2", () => {
    const candidate = makeCandidate({ salaryMin: 20000, salaryMax: 30000 });
    const profile = makeProfile({ targetSalaryMin: 80000, targetSalaryMax: 120000 });
    const score = scoreMetadata(candidate, profile);
    expect(score).toBeLessThan(0.5);
  });

  it("matching company size adds 0.15", () => {
    const candidate = makeCandidate({ companySize: "MEDIUM" });
    const profile = makeProfile({ companySize: ["MEDIUM", "LARGE"] });
    const score = scoreMetadata(candidate, profile);
    expect(score).toBeGreaterThan(0.5);
  });

  it("score is capped at 1.0", () => {
    const candidate = makeCandidate({
      jobType: "FULL_TIME",
      salaryMin: 90000,
      salaryMax: 110000,
      companySize: "MEDIUM",
    });
    const profile = makeProfile({
      remotePreference: "REMOTE_ONLY",
      targetSalaryMin: 80000,
      targetSalaryMax: 120000,
      companySize: ["MEDIUM"],
    });
    expect(scoreMetadata(candidate, profile)).toBeLessThanOrEqual(1.0);
  });

  it("score is floored at 0.0", () => {
    const candidate = makeCandidate({ salaryMin: 10000, salaryMax: 15000 });
    const profile = makeProfile({ targetSalaryMin: 100000, targetSalaryMax: 150000 });
    expect(scoreMetadata(candidate, profile)).toBeGreaterThanOrEqual(0.0);
  });
});
