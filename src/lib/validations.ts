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

// ── Application detail update (notes, dates, recruiter) ───────────────────
export const updateApplicationDetailSchema = z.object({
  applicationId:  z.string().cuid(),
  notes:          z.string().max(5000).optional(),
  appliedAt:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  followUpAt:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  recruiterName:  z.string().max(200).nullable().optional(),
  recruiterEmail: z.string().email().max(200).nullable().optional(),
});
