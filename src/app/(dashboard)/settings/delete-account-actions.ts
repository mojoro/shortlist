"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { deleteAccountSchema } from "@/lib/validations";

/** One-way hash of the email for billing audit without storing PII */
function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

export async function deleteAccount(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = deleteAccountSchema.safeParse(data);
  if (!parsed.success) throw new Error("Type DELETE to confirm");

  // Fetch the user's email from Clerk for the usage archive
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ?? "unknown@deleted";

  // Archive usage and delete user atomically — interactive transaction
  // ensures the usage read and the delete share a consistent snapshot
  await prisma.$transaction(async (tx) => {
    const usage = await tx.usage.findUnique({ where: { userId } });
    await tx.deletedUserUsage.create({
      data: {
        email: hashEmail(email),
        totalInputTokens: usage?.totalInputTokens ?? 0,
        totalOutputTokens: usage?.totalOutputTokens ?? 0,
        analysisCallCount: usage?.analysisCallCount ?? 0,
        tailorCallCount: usage?.tailorCallCount ?? 0,
      },
    });
    await tx.user.delete({ where: { id: userId } });
  });

  // Delete the Clerk user — if this fails, the Prisma data is already
  // gone but the Clerk account lingers (acceptable, can be cleaned up)
  try {
    await clerk.users.deleteUser(userId);
  } catch {
    console.error(`[delete-account] Failed to delete Clerk user ${userId}`);
  }

  // Clear the onboarding cookie so a re-signup starts fresh
  const cookieStore = await cookies();
  cookieStore.delete("shortlist-onboarded");

  redirect("/");
}
