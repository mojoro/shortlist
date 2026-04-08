"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { updateModelSettingsSchema } from "@/lib/validations";
import { requireProfile } from "@/lib/auth-helpers";

export async function updateModelSettings(data: unknown): Promise<void> {
  const parsed = updateModelSettingsSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid model settings");

  const { profile } = await requireProfile(parsed.data.profileId);

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
