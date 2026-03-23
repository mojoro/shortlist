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
  // 1. Usage check — conservative degradation if limit exceeded
  const usage = await prisma.usage.findUnique({ where: { userId } });
  if (usage && usage.currentMonthInputTokens >= usage.monthlyLimitInputTokens) {
    return {
      accepted: [],
      rejected: candidates.map((c) => c.id),
      tokensUsed: { input: 0, output: 0 },
    };
  }

  const accepted: string[] = [];
  const rejected: string[] = [];
  let totalInput = 0;
  let totalOutput = 0;

  // 2. Split into batches of BATCH_SIZE
  const batches: TriageCandidate[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  const systemPrompt = buildSystemPrompt(profile);

  // 3. Call OpenRouter for all batches in parallel
  const batchResults = await Promise.all(
    batches.map(async (batch, batchIndex) => {
      const batchOffset = batchIndex * BATCH_SIZE;
      const userMessage = buildUserMessage(batch, batchOffset);

      let response: Awaited<ReturnType<typeof openrouter.chat.completions.create>>;
      try {
        response = await openrouter.chat.completions.create({
          model: TRIAGE_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 500,
        });
      } catch (err) {
        console.error(`[triageBorderline] OpenRouter call failed for batch ${batchIndex}:`, err);
        // Network/API failure — reject entire batch
        return {
          accepted: [] as string[],
          rejected: batch.map((c) => c.id),
          input: 0,
          output: 0,
        };
      }

      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;

      const text = response.choices[0]?.message?.content ?? "";

      // 4. Parse response — reject entire batch on failure
      let parsed: z.infer<typeof triageResponseSchema>;
      try {
        const raw: unknown = JSON.parse(text);
        const result = triageResponseSchema.safeParse(raw);
        if (!result.success) {
          console.error(`[triageBorderline] Schema validation failed for batch ${batchIndex}:`, result.error.message);
          return {
            accepted: [] as string[],
            rejected: batch.map((c) => c.id),
            input: inputTokens,
            output: outputTokens,
          };
        }
        parsed = result.data;
      } catch (err) {
        console.error(`[triageBorderline] JSON parse failed for batch ${batchIndex}:`, err);
        return {
          accepted: [] as string[],
          rejected: batch.map((c) => c.id),
          input: inputTokens,
          output: outputTokens,
        };
      }

      // 5. Map parsed results back to IDs using 1-based index
      const batchAccepted: string[] = [];
      const batchRejected: string[] = [];

      // Build a set of indices we got back from AI
      const respondedIndices = new Set(parsed.results.map((r) => r.index));

      // Default missing indices to REJECT
      for (let i = 0; i < batch.length; i++) {
        const oneBasedIndex = batchOffset + i + 1;
        if (!respondedIndices.has(oneBasedIndex)) {
          batchRejected.push(batch[i]!.id);
        }
      }

      for (const result of parsed.results) {
        // result.index is 1-based across the whole batch sequence
        const localIndex = result.index - batchOffset - 1;
        if (localIndex < 0 || localIndex >= batch.length) {
          // Out-of-range index — ignore
          continue;
        }
        const candidate = batch[localIndex];
        if (!candidate) continue;

        if (result.decision === "MATCH") {
          batchAccepted.push(candidate.id);
        } else {
          batchRejected.push(candidate.id);
        }
      }

      return {
        accepted: batchAccepted,
        rejected: batchRejected,
        input: inputTokens,
        output: outputTokens,
      };
    }),
  );

  // 6. Accumulate across all batches
  for (const result of batchResults) {
    accepted.push(...result.accepted);
    rejected.push(...result.rejected);
    totalInput += result.input;
    totalOutput += result.output;
  }

  // 7. Update usage after all batches complete
  const batchCount = batches.length;
  await prisma.usage.upsert({
    where: { userId },
    create: {
      userId,
      triageCallCount: batchCount,
      triageInputTokens: totalInput,
      triageOutputTokens: totalOutput,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      currentMonthInputTokens: totalInput,
      currentMonthOutputTokens: totalOutput,
    },
    update: {
      triageCallCount: { increment: batchCount },
      triageInputTokens: { increment: totalInput },
      triageOutputTokens: { increment: totalOutput },
      totalInputTokens: { increment: totalInput },
      totalOutputTokens: { increment: totalOutput },
      currentMonthInputTokens: { increment: totalInput },
      currentMonthOutputTokens: { increment: totalOutput },
    },
  });

  return { accepted, rejected, tokensUsed: { input: totalInput, output: totalOutput } };
}
