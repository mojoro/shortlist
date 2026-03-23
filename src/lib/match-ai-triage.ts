import { z } from "zod";
import { openrouter } from "@/lib/openrouter";
import { TRIAGE_MODEL } from "@/lib/models";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TriageCandidate = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  descriptionExcerpt: string; // First 200 chars only for AI prompt
};

type TriageProfile = {
  targetRoles: string[];
  requiredSkills: string[];
  targetLocations: string[];
  workEligibility: string[];
};

export type TriageResult = {
  accepted: string[]; // IDs
  rejected: string[]; // IDs
  tokensUsed: { input: number; output: number };
};

// ---------------------------------------------------------------------------
// Zod schema for the AI response
// ---------------------------------------------------------------------------

const triageResponseSchema = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      decision: z.enum(["MATCH", "REJECT"]),
      reason: z.string(),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSystemPrompt(profile: TriageProfile): string {
  return [
    "You are a job matching filter. Given a candidate's profile and a list of job listings, decide if each job is a plausible match.",
    "",
    "Profile:",
    `- Target roles: ${profile.targetRoles.join(", ")}`,
    `- Required skills: ${profile.requiredSkills.join(", ")}`,
    `- Preferred locations: ${profile.targetLocations.join(", ")}`,
    `- Work eligibility: ${profile.workEligibility.join(", ")}`,
    "",
    'For each job, respond with MATCH or REJECT and a brief reason (one sentence).',
    "",
    'Respond in JSON format:',
    '{"results": [{"index": 1, "decision": "MATCH", "reason": "..."}, ...]}',
  ].join("\n");
}

function buildUserMessage(batch: TriageCandidate[], batchOffset: number): string {
  const lines = batch.map((c, i) => {
    const num = batchOffset + i + 1;
    return [
      `${num}. Title: ${c.title} | Company: ${c.company} | Location: ${c.location ?? "Unknown"}`,
      `   Description excerpt: ${c.descriptionExcerpt.slice(0, 200)}`,
    ].join("\n");
  });
  return `Jobs:\n${lines.join("\n\n")}`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function triageBorderline(
  candidates: TriageCandidate[],
  profile: TriageProfile,
  userId: string,
): Promise<TriageResult> {
  // Placeholder — implemented in next commit
  return { accepted: [], rejected: candidates.map(c => c.id), tokensUsed: { input: 0, output: 0 } };
}
