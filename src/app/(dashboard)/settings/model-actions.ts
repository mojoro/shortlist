"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { updateModelSettingsSchema } from "@/lib/validations";

export async function updateModelSettings(data: unknown): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateModelSettingsSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid model settings");

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.profileId, userId },
    select: { id: true },
  });
  if (!profile) throw new Error("Profile not found");

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      customTailorModel: parsed.data.customTailorModel || null,
      customAnalyzeModel: parsed.data.customAnalyzeModel || null,
      customExtractModel: parsed.data.customExtractModel || null,
    },
  });

  revalidatePath("/settings");
}
