import "server-only";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Verify the current Clerk user owns the given profile.
 * Throws on unauthorized or missing profile — designed for server actions
 * where a thrown error is the standard error path.
 */
export async function requireProfile(profileId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) throw new Error("Profile not found");

  return { userId, profile };
}

/**
 * Same as `requireProfile` but includes the user's usage record.
 * Useful for routes that need to check usage limits alongside profile data.
 */
export async function requireProfileWithUsage(profileId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    include: { user: { include: { usage: true } } },
  });
  if (!profile) throw new Error("Profile not found");

  return { userId, profile };
}
