"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import {
  adminAdjustUsageLimitSchema,
  adminUserIdSchema,
} from "@/lib/validations";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || userId !== env.ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

export async function adminAdjustUsageLimit(data: unknown) {
  await requireAdmin();
  const parsed = adminAdjustUsageLimitSchema.parse(data);
  await prisma.usage.update({
    where: { userId: parsed.userId },
    data: { monthlyLimitInputTokens: parsed.monthlyLimitInputTokens },
  });
  revalidatePath("/admin/users");
}

export async function adminDisableUser(data: unknown) {
  await requireAdmin();
  const { userId } = adminUserIdSchema.parse(data);
  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: new Date() },
  });
  revalidatePath("/admin/users");
}

export async function adminEnableUser(data: unknown) {
  await requireAdmin();
  const { userId } = adminUserIdSchema.parse(data);
  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: null },
  });
  revalidatePath("/admin/users");
}

export async function adminResetMonthlyUsage(data: unknown) {
  await requireAdmin();
  const { userId } = adminUserIdSchema.parse(data);
  await prisma.usage.update({
    where: { userId },
    data: { currentMonthInputTokens: 0, currentMonthOutputTokens: 0 },
  });
  revalidatePath("/admin/users");
}

export async function adminTriggerScrape(): Promise<{
  ok: boolean;
  message: string;
}> {
  await requireAdmin();

  const url = new URL("/api/scrape", env.NEXT_PUBLIC_APP_URL);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });

  if (!res.ok) {
    return { ok: false, message: `Scrape failed: ${res.status} ${res.statusText}` };
  }

  const body = (await res.json()) as { poolNew?: number };
  revalidatePath("/admin/system");
  return { ok: true, message: `Scrape complete — ${body.poolNew ?? 0} new to pool` };
}
