"use server";

import { auth } from "@clerk/nextjs/server";
import type { AiStatus } from "@prisma/client";
import { headers } from "next/headers";
import { appendFileSync } from "fs";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { openrouter } from "@/lib/openrouter";
import { getModels } from "@/lib/models";
import { buildWhereClause, buildOrderBy } from "@/lib/jobs";
import { buildAnalysisSystemPrompt, parseAiAnalysisResponse } from "@/lib/ai-analysis";
import { checkRateLimit } from "@/lib/rate-limit";
import { updateCustomJobSchema } from "@/lib/validations";
import type { SortOption } from "@/lib/jobs";
import { jobPoolSummarySelect } from "@/types";
import type { JobWithApplication } from "@/types";

export async function getMoreJobs(
  profileId: string,
  cursor: string,
  filter: string,
  sort: string,
): Promise<{ jobs: JobWithApplication[]; nextCursor: string | null }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the profileId belongs to the authenticated user
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const safeSort: SortOption = sort === "newest" ? "newest" : "match";

  const jobs = await prisma.job.findMany({
    where: buildWhereClause(profileId, filter),
    include: { jobPool: { select: jobPoolSummarySelect }, application: { select: { status: true } } },
    orderBy: buildOrderBy(safeSort),
    take: 25,
    cursor: { id: cursor },
    skip: 1,
  });

  return {
    jobs: jobs as unknown as JobWithApplication[],
    nextCursor: jobs.length === 25 ? jobs[jobs.length - 1].id : null,
  };
}

export async function toggleSaveJob(
  jobId: string,
  profileId: string,
  save: boolean
): Promise<{ applicationId?: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  // Scope to profileId to prevent cross-user mutation (IDOR)
  const updated = await prisma.job.updateMany({
    where: { id: jobId, profileId },
    data: { feedStatus: save ? "SAVED" : "NEW" },
  });
  if (updated.count === 0) throw new Error("Job not found");

  // When saving a job, ensure it appears in the pipeline at INTERESTED
  let applicationId: string | undefined;
  if (save) {
    const app = await prisma.application.upsert({
      where:  { jobId },
      create: { jobId, profileId, status: "INTERESTED", statusUpdatedAt: new Date() },
      update: {}, // never downgrade an existing application
      select: { id: true },
    });
    applicationId = app.id;
    revalidatePath("/pipeline");
  }

  revalidatePath("/dashboard");
  revalidateTag("dashboard-stats");
  return { applicationId };
}

export async function ignoreJob(
  jobId: string,
  profileId: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const updated = await prisma.job.updateMany({
    where: { id: jobId, profileId },
    data: { feedStatus: "ARCHIVED" },
  });
  if (updated.count === 0) throw new Error("Job not found");
  revalidatePath("/dashboard");
  revalidateTag("dashboard-stats");
}

export async function unignoreJob(
  jobId: string,
  profileId: string,
  restoreStatus: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const validStatuses = ["NEW", "SAVED"] as const;
  const feedStatus = (validStatuses as readonly string[]).includes(restoreStatus)
    ? (restoreStatus as "NEW" | "SAVED")
    : "NEW";

  const updated = await prisma.job.updateMany({
    where: { id: jobId, profileId },
    data: { feedStatus },
  });
  if (updated.count === 0) throw new Error("Job not found");
  revalidatePath("/dashboard");
  revalidateTag("dashboard-stats");
}

export async function batchIgnoreJobs(
  jobIds: string[],
  profileId: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.updateMany({
    where: { id: { in: jobIds }, profileId },
    data: { feedStatus: "ARCHIVED" },
  });
  revalidatePath("/dashboard");
  revalidateTag("dashboard-stats");
}

export async function batchSaveJobs(
  jobIds: string[],
  profileId: string,
  save: boolean
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.updateMany({
    where: { id: { in: jobIds }, profileId },
    data: { feedStatus: save ? "SAVED" : "NEW" },
  });
  revalidatePath("/dashboard");
  revalidateTag("dashboard-stats");
}

export type JobScoreUpdate = {
  score: number;
  status: AiStatus;
  summary: string;
  matchPoints: string[];
  gapPoints: string[];
  hidden: boolean;
};

export async function analyzeJob(
  jobId: string,
  profileId: string,
): Promise<{ error: "CREDITS" | "UNKNOWN" } | JobScoreUpdate> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    include: { user: { include: { usage: true } } },
  });
  if (!profile) throw new Error("Profile not found");

  const models = getModels(profile);

  const { allowed } = checkRateLimit(userId, "analyze", 10);
  if (!allowed) return { error: "UNKNOWN" as const };

  // Atomic usage limit check with row-level locking to prevent race conditions
  try {
    await prisma.$transaction(async (tx) => {
      const u = await tx.usage.findUnique({
        where: { userId },
        select: { currentMonthInputTokens: true, monthlyLimitInputTokens: true },
      });
      if (u && u.currentMonthInputTokens >= u.monthlyLimitInputTokens) {
        throw new Error("LIMIT_EXCEEDED");
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "LIMIT_EXCEEDED") {
      return { error: "CREDITS" };
    }
    throw err;
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, profileId },
    include: { jobPool: true },
  });
  if (!job) throw new Error("Job not found");

  const systemPrompt = buildAnalysisSystemPrompt(profile);
  const userMsg = `## ${job.jobPool.title} at ${job.jobPool.company}\n\n${job.jobPool.description.slice(0, 8000)}`;

  const h = await headers();
  const host = h.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.")) {
    const sep = "=".repeat(80);
    appendFileSync(
      "ai-context.log",
      `\n${sep}\n[${new Date().toISOString()}] ANALYZE (action) — jobId: ${jobId}, title: "${job.jobPool.title}"\n\n## SYSTEM\n${systemPrompt}\n\n## USER\n${userMsg}\n`,
    );
  }

  try {
    const response = await openrouter.chat.completions.create({
      model: models.analyze,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
      max_tokens: 1500,
    });

    const text   = response.choices[0]?.message?.content ?? "";
    const result = parseAiAnalysisResponse(text);
    if (!result) return { error: "UNKNOWN" };

    await prisma.job.update({
      where: { id: jobId },
      data: {
        aiScore:       Math.round(result.score),
        aiStatus:      result.status,
        aiSummary:     result.summary,
        aiMatchPoints: result.matchPoints,
        aiGapPoints:   result.gapPoints,
        aiAnalyzedAt:  new Date(),
        aiModel:       models.analyze,
        ...(result.status === "NO_GO" && job.jobPool.source !== "CUSTOM"
          ? { feedStatus: "HIDDEN" }
          : {}),
      },
    });

    const inputTokens  = response.usage?.prompt_tokens    ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    if (inputTokens > 0) {
      await prisma.usage.upsert({
        where:  { userId },
        create: {
          userId,
          totalInputTokens:         inputTokens,
          totalOutputTokens:        outputTokens,
          currentMonthInputTokens:  inputTokens,
          currentMonthOutputTokens: outputTokens,
          analysisCallCount:        1,
        },
        update: {
          totalInputTokens:         { increment: inputTokens },
          totalOutputTokens:        { increment: outputTokens },
          currentMonthInputTokens:  { increment: inputTokens },
          currentMonthOutputTokens: { increment: outputTokens },
          analysisCallCount:        { increment: 1 },
        },
      });
    }

    revalidatePath("/dashboard");
    return {
      score:       Math.round(result.score),
      status:      result.status,
      summary:     result.summary,
      matchPoints: result.matchPoints,
      gapPoints:   result.gapPoints,
      hidden:      result.status === "NO_GO" && job.jobPool.source !== "CUSTOM",
    };
  } catch (err) {
    console.error("[analyzeJob]", err);
    return { error: "UNKNOWN" };
  }
}

export async function discardAnalysis(
  jobId: string,
  profileId: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const job = await prisma.job.findFirst({ where: { id: jobId, profileId } });
  if (!job) throw new Error("Job not found");

  await prisma.job.update({
    where: { id: jobId },
    data: {
      aiScore:       null,
      aiStatus:      null,
      aiSummary:     null,
      aiMatchPoints: [],
      aiGapPoints:   [],
      aiAnalyzedAt:  null,
      aiModel:       null,
      // Restore hidden jobs so they reappear after re-analysis
      ...(job.feedStatus === "HIDDEN" ? { feedStatus: "NEW" } : {}),
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  revalidateTag("dashboard-stats");
}

export async function updateCustomJob(
  data: unknown
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = updateCustomJobSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid request" };

  const { jobId, profileId, title, company, description, location,
    locationType, url, jobType, salaryMin, salaryMax, currency, skills } = parsed.data;

  // Verify the job belongs to the authenticated user's profile
  const job = await prisma.job.findFirst({
    where: { id: jobId, profileId },
    include: {
      profile: { select: { userId: true } },
      jobPool: { select: { source: true, id: true } },
    },
  });
  if (!job || job.profile.userId !== userId) return { error: "Not found" };

  // Only CUSTOM-sourced jobs can be edited
  if (job.jobPool.source !== "CUSTOM") return { error: "Only imported jobs can be edited" };

  await prisma.jobPool.update({
    where: { id: job.jobPool.id },
    data: {
      title,
      company,
      description,
      location: location ?? null,
      locationType: locationType ?? null,
      url: url || "",
      jobType: jobType ?? null,
      salaryMin: salaryMin ?? null,
      salaryMax: salaryMax ?? null,
      currency: currency ?? null,
      skills: skills ?? [],
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function updateJobNotes(
  jobId: string,
  profileId: string,
  notes: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  const updated = await prisma.job.updateMany({
    where: { id: jobId, profileId },
    data: { userNotes: notes.trim() || null },
  });
  if (updated.count === 0) throw new Error("Job not found");
}

// ─── Load more matches ────────────────────────────────────────────────────────

export async function loadMoreMatches(
  profileId: string,
): Promise<{ added: number; remaining: number }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) return { added: 0, remaining: 0 };

  const { runMatchPipelineForProfile } = await import("@/lib/match-pipeline");
  const result = await runMatchPipelineForProfile(profileId, profile);

  // Re-read the updated count (pipeline persists it)
  const updated = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { pendingMatchCount: true },
  });

  revalidatePath("/dashboard");
  return {
    added: result.jobsCreated,
    remaining: updated?.pendingMatchCount ?? 0,
  };
}
