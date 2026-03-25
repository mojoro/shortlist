import { prisma } from "@/lib/prisma";
import { openrouter } from "@/lib/openrouter";
import { getModels } from "@/lib/models";
import { env } from "@/env";
import { analyzeSchema } from "@/lib/validations";
import { buildAnalysisSystemPrompt, parseAiAnalysisResponse } from "@/lib/ai-analysis";
import { logAiContext } from "@/lib/ai-logging";

export const maxDuration = 60;

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const host = req.headers.get("host") ?? "";

  try {
    const body = await req.json().catch(() => null);
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request" },
        { status: 400 },
      );
    }

    const { profileId } = parsed.data;

    if (process.env.NODE_ENV === "development") {
      console.log(`[/api/analyze] Entry — profileId: ${profileId}`);
    }

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: { include: { usage: true } } },
    });
    if (!profile) return new Response("Profile not found", { status: 404 });

    const models = getModels(profile);

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
      // Custom imports are never auto-hidden — the user added them intentionally
      if (job.jobPool.source === "CUSTOM") { toScore.push(job); continue; }
      const haystack = `${job.jobPool.title} ${job.jobPool.description}`.toLowerCase();
      const matched = excludedLower.some((kw) => haystack.includes(kw));
      if (matched) {
        toHide.push(job);
      } else {
        toScore.push(job);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[/api/analyze] Pre-filter — toHide: ${toHide.length}, toScore: ${toScore.length}`);
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
          aiModel:       models.analyze,
        },
      });
    }

    const systemPrompt = buildAnalysisSystemPrompt(profile);
    let totalInputTokens  = 0;
    let totalOutputTokens = 0;
    let jobsScored        = 0;

    for (let i = 0; i < toScore.length; i += BATCH_SIZE) {
      const batch = toScore.slice(i, i + BATCH_SIZE);

      if (process.env.NODE_ENV === "development") {
        console.log(`[/api/analyze] Batch start — index: ${i}, size: ${batch.length}`);
      }

      await Promise.all(
        batch.map(async (job) => {
          if (process.env.NODE_ENV === "development") {
            console.log(`[/api/analyze] Scoring job — id: ${job.id}, title: "${job.jobPool.title}"`);
          }
          logAiContext(
            host,
            `ANALYZE — jobId: ${job.id}`,
            job.jobPool.title,
            systemPrompt,
            `## ${job.jobPool.title} at ${job.jobPool.company}\n\n${job.jobPool.description.slice(0, 8000)}`,
          );

          try {
            const response = await openrouter.chat.completions.create({
              model: models.analyze,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: `## ${job.jobPool.title} at ${job.jobPool.company}\n\n${job.jobPool.description.slice(0, 8000)}`,
                },
              ],
              max_completion_tokens: 1500,
            });

            totalInputTokens  += response.usage?.prompt_tokens    ?? 0;
            totalOutputTokens += response.usage?.completion_tokens ?? 0;

            const text   = response.choices[0]?.message?.content ?? "";
            const result = parseAiAnalysisResponse(text);

            if (!result) {
              console.error(`[/api/analyze] Could not parse response for job ${job.id}`);
              if (process.env.NODE_ENV === "development") {
                console.log(`[/api/analyze] Parse failure — raw response: ${text.slice(0, 200)}`);
              }
              return; // leave aiAnalyzedAt null — will retry on next run
            }

            if (process.env.NODE_ENV === "development") {
              console.log(`[/api/analyze] Scored job — id: ${job.id}, score: ${result.score}, status: ${result.status}`);
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
                aiModel:       models.analyze,
                ...(result.status === "NO_GO" && job.jobPool.source !== "CUSTOM" ? { feedStatus: "HIDDEN" } : {}),
              },
            });

            jobsScored++;
          } catch (err) {
            console.error(`[/api/analyze] Error scoring job ${job.id}:`, err);
          }
        }),
      );

      if (process.env.NODE_ENV === "development") {
        console.log(`[/api/analyze] Batch end — index: ${i}, jobsScored so far: ${jobsScored}`);
      }

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

    if (process.env.NODE_ENV === "development") {
      console.log(`[/api/analyze] Complete — jobsScored: ${jobsScored}, autoHidden: ${toHide.length}, inputTokens: ${totalInputTokens}, outputTokens: ${totalOutputTokens}`);
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
