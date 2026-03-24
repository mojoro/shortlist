"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { feedbackSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

export async function submitFeedback(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { allowed } = checkRateLimit(userId, "feedback", 3, 60_000);
  if (!allowed) throw new Error("Too many submissions. Try again in a minute.");

  const parsed = feedbackSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid feedback");

  await prisma.feedback.create({
    data: {
      userId,
      message: parsed.data.message,
      metadata: parsed.data.metadata as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/settings");
}
