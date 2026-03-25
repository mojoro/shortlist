import { z } from "zod";

// ── Tailor generation ──────────────────────────────────────────────────────
export const tailorSchema = z.object({
  jobId: z.string().cuid(),
  additionalContext: z.string().max(500).optional(),
});

// ── Tailor save / auto-save ────────────────────────────────────────────────
// tailoredResumeId absent on first save (create), present on subsequent saves (update)
export const tailorSaveSchema = z.object({
  tailoredResumeId: z.string().cuid().optional(),
  jobId: z.string().cuid(),
  markdown: z.string().min(1),
  wasExported: z.boolean().optional(),
});

// ── Application status update ──────────────────────────────────────────────
export const updateApplicationStatusSchema = z.object({
  applicationId: z.string().cuid(),
  status: z.enum([
    "INTERESTED", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER",
    "ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED",
  ]),
});

// ── AI analysis trigger ────────────────────────────────────────────────────
export const analyzeSchema = z.object({
  profileId: z.string().cuid(),
});

// ── Match route ────────────────────────────────────────────────────────────
export const matchSchema = z.object({
  profileId: z.string().cuid().optional(),
});

// ── Settings: profile info ─────────────────────────────────────────────────
export const updateProfileInfoSchema = z.object({
  profileId:    z.string().cuid(),
  name:         z.string().min(1).max(100),
  displayName:  z.string().max(100).optional(),
  email:        z.string().max(200).optional(),
  phone:        z.string().max(50).optional(),
  location:     z.string().max(200).optional(),
  linkedinUrl:  z.string().max(500).optional(),
  portfolioUrl: z.string().max(500).optional(),
  githubUrl:    z.string().max(500).optional(),
});

// ── Settings: search criteria ──────────────────────────────────────────────
export const updateSearchCriteriaSchema = z.object({
  profileId:        z.string().cuid(),
  targetRoles:      z.array(z.string()),
  targetLocations:  z.array(z.string()),
  remotePreference: z.enum(["REMOTE_ONLY", "HYBRID_OK", "ANY", "ONSITE_ONLY"]),
  currency:         z.string().min(1).max(10),
  targetSalaryMin:  z.number().int().positive().nullable(),
  targetSalaryMax:  z.number().int().positive().nullable(),
  requiredSkills:   z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  excludedKeywords: z.array(z.string()),
  workEligibility:  z.array(z.string().max(5)).optional(),
});

// ── Settings: resume ───────────────────────────────────────────────────────
export const updateResumeSchema = z.object({
  profileId:      z.string().cuid(),
  masterResume:   z.string().optional(),
  curriculumVitae: z.string().optional(),
});

// ── Settings: resume writing rules ────────────────────────────────────────
export const updateResumeWritingRulesSchema = z.object({
  profileId:        z.string().cuid(),
  protectedPhrases: z.array(z.string()),
  bannedPhrases:    z.array(z.string()),
  verifiedMetrics:  z.array(z.string()),
  neverClaim:       z.array(z.string()),
});

// ── Settings: profile create / switch ─────────────────────────────────────
export const createProfileSchema = z.object({
  name: z.string().min(1).max(80),
});

export const switchProfileSchema = z.object({
  profileId: z.string().cuid(),
});

export const deleteProfileSchema = z.object({
  profileId: z.string().cuid(),
});

// ── Onboarding wizard completion ───────────────────────────────────────────
export const completeOnboardingSchema = z.object({
  name:             z.string().min(1).max(80),
  targetRoles:      z.array(z.string()),
  targetLocations:  z.array(z.string()),
  remotePreference: z.enum(["REMOTE_ONLY", "HYBRID_OK", "ANY", "ONSITE_ONLY"]),
  currency:         z.string().min(1).max(10),
  targetSalaryMin:  z.number().int().positive().nullable(),
  targetSalaryMax:  z.number().int().positive().nullable(),
  masterResume:     z.string().optional(),
  // Contact details (step 3)
  displayName:      z.string().optional(),
  email:            z.string().email().optional().or(z.literal("")),
  phone:            z.string().optional(),
  contactLocation:  z.string().optional(),
  linkedinUrl:      z.string().url().optional().or(z.literal("")),
  portfolioUrl:     z.string().url().optional().or(z.literal("")),
  githubUrl:        z.string().url().optional().or(z.literal("")),
  // Full CV (step 4)
  curriculumVitae:  z.string().optional(),
  // Excluded keywords (step 5)
  excludedKeywords: z.array(z.string()).optional(),
  workEligibility:  z.array(z.string().max(5)).optional(),
});

// ── Job import ─────────────────────────────────────────────────────────────
export const extractJobSchema = z.object({
  input:     z.string().min(1).max(50000),
  profileId: z.string().cuid(),
});

export const importJobSchema = z.object({
  profileId:     z.string().cuid(),
  originalInput: z.string().min(1),
  title:         z.string().min(1).max(300),
  company:       z.string().min(1).max(300),
  description:   z.string().min(1),
  location:      z.string().max(300).nullish(),
  locationType:  z.enum(["REMOTE", "HYBRID", "ONSITE"]).nullish(),
  url:           z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  postedAt:      z.string().nullish(),
  jobType:       z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"]).nullish(),
  salaryMin:     z.number().int().positive().nullish(),
  salaryMax:     z.number().int().positive().nullish(),
  currency:      z.string().max(10).nullish(),
  skills:        z.array(z.string()).optional(),
  source:        z.enum([
    "LINKEDIN", "GREENHOUSE", "LEVER", "ASHBY", "USAJOBS", "ADZUNA",
    "ARBEITNOW", "INDEED", "BERLIN_STARTUP_JOBS", "HONEYPOT", "YC_JOBS",
    "NO_FLUFF_JOBS", "CUSTOM",
  ]).default("CUSTOM"),
  externalId:    z.string().optional(),
});

// ── Custom job field update ────────────────────────────────────────────────
export const updateCustomJobSchema = z.object({
  jobId:        z.string().cuid(),
  profileId:    z.string().cuid(),
  title:        z.string().min(1).max(300),
  company:      z.string().min(1).max(300),
  description:  z.string().min(1),
  location:     z.string().max(300).nullish(),
  locationType: z.enum(["REMOTE", "HYBRID", "ONSITE"]).nullish(),
  url:          z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  jobType:      z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"]).nullish(),
  salaryMin:    z.number().int().positive().nullish(),
  salaryMax:    z.number().int().positive().nullish(),
  currency:     z.string().max(10).nullish(),
  skills:       z.array(z.string()).optional(),
});

// ── Application detail update (notes, dates, recruiter) ───────────────────
export const updateApplicationDetailSchema = z.object({
  applicationId:  z.string().cuid(),
  notes:          z.string().max(5000).optional(),
  appliedAt:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  followUpAt:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  recruiterName:  z.string().max(200).nullable().optional(),
  recruiterEmail: z.union([z.string().email().max(200), z.literal("")]).nullable().optional(),
});

// ── Feedback submission ──────────────────────────────────────────────────
export const feedbackSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Feedback must be at least 10 characters")
    .max(2000, "Feedback must be under 2,000 characters"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Account deletion confirmation ────────────────────────────────────────
export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});
// ── Custom model settings ────────────────────────────────────────────────
export const updateModelSettingsSchema = z.object({
  profileId:          z.string().cuid(),
  customTailorModel:  z.string().trim().min(1).max(200).nullable().optional(),
  customAnalyzeModel: z.string().trim().min(1).max(200).nullable().optional(),
  customExtractModel: z.string().trim().min(1).max(200).nullable().optional(),
});

// ── Admin: usage limit adjustment ────────────────────────────────────────────
export const adminAdjustUsageLimitSchema = z.object({
  userId: z.string().min(1),
  monthlyLimitInputTokens: z.number().int().positive(),
});

// ── Admin: user ID parameter ─────────────────────────────────────────────────
export const adminUserIdSchema = z.object({
  userId: z.string().min(1),
});

// ── Admin: copy profile to admin account ─────────────────────────────────────
export const adminCopyProfileSchema = z.object({
  profileId: z.string().cuid(),
  mode: z.enum(["full", "metadata", "reset"]),
});
