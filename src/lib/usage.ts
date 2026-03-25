import "server-only";
import { prisma } from "@/lib/prisma";

type CallType = "analysis" | "tailor" | "triage";

/**
 * Increment AI usage counters for a user.
 * Uses upsert so a missing Usage row is created on the fly.
 */
export async function incrementUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  callType: CallType,
  callCount = 1,
): Promise<void> {
  if (inputTokens <= 0 && outputTokens <= 0) return;

  const triageFields =
    callType === "triage"
      ? {
          triageCallCount: callCount,
          triageInputTokens: inputTokens,
          triageOutputTokens: outputTokens,
        }
      : {};

  const triageIncrements =
    callType === "triage"
      ? {
          triageCallCount: { increment: callCount },
          triageInputTokens: { increment: inputTokens },
          triageOutputTokens: { increment: outputTokens },
        }
      : {};

  const callCountField =
    callType === "analysis"
      ? "analysisCallCount"
      : callType === "tailor"
        ? "tailorCallCount"
        : null; // triage uses its own fields above

  await prisma.usage.upsert({
    where: { userId },
    create: {
      userId,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      currentMonthInputTokens: inputTokens,
      currentMonthOutputTokens: outputTokens,
      ...(callCountField ? { [callCountField]: callCount } : {}),
      ...triageFields,
    },
    update: {
      totalInputTokens: { increment: inputTokens },
      totalOutputTokens: { increment: outputTokens },
      currentMonthInputTokens: { increment: inputTokens },
      currentMonthOutputTokens: { increment: outputTokens },
      ...(callCountField ? { [callCountField]: { increment: callCount } } : {}),
      ...triageIncrements,
    },
  });
}

/**
 * Check whether a user is within their monthly AI usage limit.
 * Returns `true` if the user is allowed to make another AI call.
 */
export async function checkUsageLimit(userId: string): Promise<boolean> {
  const usage = await prisma.usage.findUnique({
    where: { userId },
    select: { currentMonthInputTokens: true, monthlyLimitInputTokens: true },
  });
  if (!usage) return true; // no usage record = allow
  return usage.currentMonthInputTokens < usage.monthlyLimitInputTokens;
}
