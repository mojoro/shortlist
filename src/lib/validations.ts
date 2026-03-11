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
