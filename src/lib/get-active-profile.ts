import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Request-scoped cached profile loader.
 * Within a single request, the query runs once regardless of how many
 * server components call it. Uses React's cache() for deduplication.
 */
export const getActiveProfile = cache(async (userId: string) => {
  return prisma.profile.findFirst({
    where: { userId },
    orderBy: { isActive: "desc" as const },
  });
});
