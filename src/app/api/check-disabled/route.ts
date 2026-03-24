import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Internal endpoint called by middleware to check if a user's account is disabled.
// Middleware runs in Edge Runtime where Prisma cannot execute — this route bridges
// that gap. Debounced via the shortlist-active cookie (5min TTL) so this is only
// called once per session window, not per request.

export async function GET(): Promise<Response> {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { disabledAt: true },
  });

  return NextResponse.json({ disabled: Boolean(user?.disabledAt) });
}
