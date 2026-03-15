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
  profileId: z.string().min(1),
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
});

// ── Settings: resume ───────────────────────────────────────────────────────
export const updateResumeSchema = z.object({
  profileId:      z.string().cuid(),
  masterResume:   z.string().optional(),
  curriculumVitae: z.string().optional(),
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
  location:      z.string().max(300).optional(),
  locationType:  z.enum(["REMOTE", "HYBRID", "ONSITE"]).nullable().optional(),
  url:           z.string().url().optional().or(z.literal("")),
  postedAt:      z.string().optional().nullable(),
  jobType:       z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"]).nullable().optional(),
  salaryMin:     z.number().int().positive().nullable().optional(),
  salaryMax:     z.number().int().positive().nullable().optional(),
  currency:      z.string().max(10).optional(),
  skills:        z.array(z.string()).optional(),
});

// ── Application detail update (notes, dates, recruiter) ───────────────────
export const updateApplicationDetailSchema = z.object({
  applicationId:  z.string().cuid(),
  notes:          z.string().max(5000).optional(),
  appliedAt:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  followUpAt:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  recruiterName:  z.string().max(200).nullable().optional(),
  recruiterEmail: z.string().email().max(200).nullable().optional(),
});
