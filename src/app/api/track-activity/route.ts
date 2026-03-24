import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Fire-and-forget endpoint called by middleware to update the user's lastActiveAt
// timestamp. Debounced via the shortlist-active cookie (5min TTL) so this is only
// called once per session window, not per request.

export async function POST(): Promise<Response> {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
