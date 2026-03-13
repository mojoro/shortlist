import { prisma } from "@/lib/prisma";
import { openrouter, MODEL } from "@/lib/openrouter";
import { env } from "@/env";
import { analyzeSchema } from "@/lib/validations";

export const maxDuration = 60;

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

interface AiAnalysisResult {
  score: number;
  status: "GO" | "NO_GO" | "EXAMINE";
  summary: string;
  matchPoints: string[];
  gapPoints: string[];
}

function parseAiResponse(text: string): AiAnalysisResult | null {
  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.score === "number" &&
      ["GO", "NO_GO", "EXAMINE"].includes(parsed.status) &&
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.matchPoints) &&
      Array.isArray(parsed.gapPoints)
    ) {
      return parsed as AiAnalysisResult;
    }
    return null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(profile: {
  targetRoles: string[];
  targetLocations: string[];
  remotePreference: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  excludedKeywords: string[];
  targetSalaryMin: number | null;
  targetSalaryMax: number | null;
  currency: string;
  masterResume: string | null;
}): string {
  const lines: string[] = [
    "You are a job match analyzer. Score how well the job matches this candidate.",
    "",
  ];

  if (profile.targetRoles.length > 0)
    lines.push(`Target roles: ${profile.targetRoles.join(", ")}`);
  if (profile.targetLocations.length > 0)
    lines.push(`Target locations: ${profile.targetLocations.join(", ")}`);
  if (profile.remotePreference !== "ANY")
    lines.push(`Remote preference: ${profile.remotePreference}`);
  if (profile.requiredSkills.length > 0)
    lines.push(`Required skills: ${profile.requiredSkills.join(", ")}`);
  if (profile.niceToHaveSkills.length > 0)
    lines.push(`Nice-to-have skills: ${profile.niceToHaveSkills.join(", ")}`);
  if (profile.targetSalaryMin || profile.targetSalaryMax) {
    const range = [profile.targetSalaryMin, profile.targetSalaryMax]
      .filter(Boolean)
      .join("–");
    lines.push(`Salary target: ${range} ${profile.currency}/year`);
  }
  if (profile.excludedKeywords.length > 0)
    lines.push(
      `Auto-reject if any of these keywords appear in the job: ${profile.excludedKeywords.join(", ")}`,
    );
  if (profile.masterResume) {
    lines.push("", `Candidate summary:\n${profile.masterResume.slice(0, 1500)}`);
  }

  lines.push(
    "",
    "Respond ONLY with valid JSON — no markdown fences, no explanation:",
    '{"score":0-100,"status":"GO"|"NO_GO"|"EXAMINE","summary":"1-2 sentences","matchPoints":["..."],"gapPoints":["..."]}',
  );

  return lines.join("\n");
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { profileId } = parsed.data;

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: { include: { usage: true } } },
    });
    if (!profile) return new Response("Profile not found", { status: 404 });

    // Usage limit check
    const usage = profile.user.usage;
    if (usage && usage.currentMonthInputTokens >= usage.monthlyLimitInputTokens) {
      return Response.json(
        { error: "Monthly AI usage limit reached." },
        { status: 429 },
      );
    }

    // Load unscored, visible jobs (include pool for content fields)
    const unscoredJobs = await prisma.job.findMany({
      where:   { profileId, aiAnalyzedAt: null, feedStatus: { not: "HIDDEN" } },
      include: { jobPool: true },
    });

    if (unscoredJobs.length === 0) {
      return Response.json({ jobsScored: 0 });
    }

    // Pre-filter excluded keywords — no API call needed
    const excludedLower = profile.excludedKeywords.map((k) => k.toLowerCase());
    const toHide: typeof unscoredJobs = [];
    const toScore: typeof unscoredJobs = [];

    for (const job of unscoredJobs) {
      const haystack = `${job.jobPool.title} ${job.jobPool.description}`.toLowerCase();
      const matched = excludedLower.some((kw) => haystack.includes(kw));
      if (matched) {
        toHide.push(job);
      } else {
        toScore.push(job);
      }
    }

    if (toHide.length > 0) {
      await prisma.job.updateMany({
        where: { id: { in: toHide.map((j) => j.id) } },
        data: {
          feedStatus:    "HIDDEN",
          aiStatus:      "NO_GO",
          aiScore:       0,
          aiSummary:     "Auto-rejected: matched an excluded keyword.",
          aiAnalyzedAt:  new Date(),
          aiModel:       MODEL,
        },
      });
    }

    const systemPrompt = buildSystemPrompt(profile);
    let totalInputTokens  = 0;
    let totalOutputTokens = 0;
    let jobsScored        = 0;

    for (let i = 0; i < toScore.length; i += BATCH_SIZE) {
      const batch = toScore.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (job) => {
          try {
            const response = await openrouter.chat.completions.create({
              model: MODEL,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: `## ${job.jobPool.title} at ${job.jobPool.company}\n\n${job.jobPool.description.slice(0, 8000)}`,
                },
              ],
              max_tokens: 1500,
            });

            totalInputTokens  += response.usage?.prompt_tokens    ?? 0;
            totalOutputTokens += response.usage?.completion_tokens ?? 0;

            const text   = response.choices[0]?.message?.content ?? "";
            const result = parseAiResponse(text);

            if (!result) {
              console.error(`[/api/analyze] Could not parse response for job ${job.id}`);
              return; // leave aiAnalyzedAt null — will retry on next run
            }

            await prisma.job.update({
              where: { id: job.id },
              data: {
                aiScore:       Math.round(result.score),
                aiStatus:      result.status,
                aiSummary:     result.summary,
                aiMatchPoints: result.matchPoints,
                aiGapPoints:   result.gapPoints,
                aiAnalyzedAt:  new Date(),
                aiModel:       MODEL,
                ...(result.status === "NO_GO" ? { feedStatus: "HIDDEN" } : {}),
              },
            });

            jobsScored++;
          } catch (err) {
            console.error(`[/api/analyze] Error scoring job ${job.id}:`, err);
          }
        }),
      );

      if (i + BATCH_SIZE < toScore.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Increment usage counters
    if (totalInputTokens > 0) {
      await prisma.usage.upsert({
        where:  { userId: profile.userId },
        create: {
          userId:                   profile.userId,
          totalInputTokens,
          totalOutputTokens,
          currentMonthInputTokens:  totalInputTokens,
          currentMonthOutputTokens: totalOutputTokens,
          analysisCallCount:        jobsScored,
        },
        update: {
          totalInputTokens:         { increment: totalInputTokens },
          totalOutputTokens:        { increment: totalOutputTokens },
          currentMonthInputTokens:  { increment: totalInputTokens },
          currentMonthOutputTokens: { increment: totalOutputTokens },
          analysisCallCount:        { increment: jobsScored },
        },
      });
    }

    return Response.json({ jobsScored: jobsScored + toHide.length });
  } catch (err) {
    console.error("[/api/analyze]", err);
    return Response.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }
}
