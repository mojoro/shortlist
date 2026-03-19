import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";

/**
 * One-time backfill: fetch emails from Clerk for all existing users
 * and write them to the User.email column.
 *
 * Protected by CRON_SECRET — same as scrape/analyze routes.
 * DELETE THIS ROUTE after running the backfill.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { email: null },
    select: { id: true },
  });

  const clerk = await clerkClient();
  const results: { id: string; email: string | null; error?: string }[] = [];

  for (const user of users) {
    try {
      const clerkUser = await clerk.users.getUser(user.id);
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ?? null;

      if (email) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email },
        });
      }

      results.push({ id: user.id, email });
    } catch (err) {
      results.push({
        id: user.id,
        email: null,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return Response.json({
    total: users.length,
    updated: results.filter((r) => r.email && !r.error).length,
    failed: results.filter((r) => r.error).length,
    results,
  });
}
