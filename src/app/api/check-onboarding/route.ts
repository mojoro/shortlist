import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Internal endpoint called by middleware to check if a user has completed onboarding.
// Middleware runs in Edge Runtime where Prisma cannot execute — this route bridges
// that gap. Called once per session/device when the shortlist-onboarded cookie is absent.
//
// Protected: only callable by the authenticated user themselves (Clerk auth check).
// The route is added to isPublicRoute in middleware so it doesn't trigger a redirect
// loop, but Clerk still validates the session token before responding.

export async function GET(): Promise<Response> {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ onboarded: false }, { status: 200 });
  }

  const count = await prisma.profile.count({
    where: {
      userId,
      onboardingCompletedAt: { not: null },
    },
  });

  return Response.json({ onboarded: count > 0 }, { status: 200 });
}
