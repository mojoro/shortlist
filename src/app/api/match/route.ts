import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { matchSchema } from "@/lib/validations";
import { runMatchPipelineForProfile } from "@/lib/match-pipeline";

export const maxDuration = 120;

export async function POST(req: Request) {
  // Auth — same pattern as /api/scrape and /api/analyze
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = matchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Load profiles — either a specific one or all enabled
  const profiles = parsed.data.profileId
    ? await prisma.profile.findMany({
        where: { id: parsed.data.profileId, scraperEnabled: true },
      })
    : await prisma.profile.findMany({
        where: { scraperEnabled: true },
      });

  const results: Array<{
    profileId: string;
    status: string;
    jobsCreated: number;
    stats: Record<string, number>;
  }> = [];

  // Process profiles sequentially (avoid overwhelming DB + AI API)
  for (const profile of profiles) {
    const profileStart = Date.now();

    try {
      const pipelineResult = await runMatchPipelineForProfile(profile.id, profile);

      // Log MatchRun
      await prisma.matchRun.create({
        data: {
          profileId: profile.id,
          candidatesFromSql: pipelineResult.candidatesFromSql,
          acceptedByHeuristic: pipelineResult.acceptedByHeuristic,
          borderlineToAi: pipelineResult.borderlineToAi,
          acceptedByAi: pipelineResult.acceptedByAi,
          rejectedTotal: pipelineResult.rejectedTotal,
          aiTokensUsed: pipelineResult.aiTokensUsed,
          durationMs: Date.now() - profileStart,
        },
      });

      // Update lastScrapedAt
      await prisma.profile.update({
        where: { id: profile.id },
        data: { lastScrapedAt: new Date() },
      });

      results.push({
        profileId: profile.id,
        status: "SUCCESS",
        jobsCreated: pipelineResult.jobsCreated,
        stats: { ...pipelineResult },
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`[/api/match] Profile ${profile.id} — created: ${pipelineResult.jobsCreated}, sql: ${pipelineResult.candidatesFromSql}, heuristic: ${pipelineResult.acceptedByHeuristic}, ai: ${pipelineResult.acceptedByAi}`);
      }
    } catch (err) {
      console.error(`[/api/match] Failed for profile ${profile.id}:`, err);

      await prisma.matchRun.create({
        data: {
          profileId: profile.id,
          errorMessage: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - profileStart,
        },
      });

      results.push({
        profileId: profile.id,
        status: "FAILED",
        jobsCreated: 0,
        stats: {},
      });
    }
  }

  revalidatePath("/dashboard");
  revalidateTag("dashboard-stats");
  return Response.json({ results });
}
