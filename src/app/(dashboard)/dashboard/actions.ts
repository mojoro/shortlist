"use server";

import { auth } from "@clerk/nextjs/server";
import type { AiStatus } from "@prisma/client";
import { headers } from "next/headers";
import { appendFileSync } from "fs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { openrouter, ANALYZE_MODEL } from "@/lib/openrouter";
import { buildWhereClause, buildOrderBy } from "@/lib/jobs";
import { buildAnalysisSystemPrompt, parseAiAnalysisResponse } from "@/lib/ai-analysis";
import type { SortOption } from "@/lib/jobs";
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
    include: { jobPool: true, application: { select: { status: true } } },
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
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.job.update({
    where: { id: jobId },
    data: { feedStatus: save ? "SAVED" : "NEW" },
  });

  // When saving a job, ensure it appears in the pipeline at INTERESTED
  if (save) {
    await prisma.application.upsert({
      where:  { jobId },
      create: { jobId, profileId, status: "INTERESTED", statusUpdatedAt: new Date() },
      update: {}, // never downgrade an existing application
    });
    revalidatePath("/pipeline");
  }

  revalidatePath("/dashboard");
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

  await prisma.job.update({
    where: { id: jobId },
    data: { feedStatus: "ARCHIVED" },
  });
  revalidatePath("/dashboard");
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

  await prisma.job.update({
    where: { id: jobId },
    data: { feedStatus },
  });
  revalidatePath("/dashboard");
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

  const usage = profile.user.usage;
  if (usage && usage.currentMonthInputTokens >= usage.monthlyLimitInputTokens) {
    return { error: "CREDITS" };
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
      model: ANALYZE_MODEL,
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
        aiModel:       ANALYZE_MODEL,
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

  await prisma.job.update({
    where: { id: jobId },
    data: { userNotes: notes.trim() || null },
  });
}
