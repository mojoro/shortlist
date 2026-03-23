import { NextResponse } from "next/server";
import { ScraperSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { parseLocation } from "@/lib/location-parser";

export const maxDuration = 300;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let usajobsDirectSet = 0;
  let totalProcessed = 0;
  let totalCountrySet = 0;
  let totalRegionSet = 0;

  // Pass 1: set country = "US" for all USAJOBS entries that have no country yet
  const usajobsResult = await prisma.jobPool.updateMany({
    where: {
      source: ScraperSource.USAJOBS,
      country: null,
    },
    data: { country: "US" },
  });
  usajobsDirectSet = usajobsResult.count;

  // Pass 2: cursor-based batch processing of remaining entries with null country
  // but non-null location (exclude USAJOBS — already handled above)
  const BATCH_SIZE = 500;
  let lastId = "";
  let hasMore = true;

  while (hasMore) {
    const batch = await prisma.jobPool.findMany({
      where: {
        country: null,
        location: { not: null },
        source: { not: ScraperSource.USAJOBS },
        ...(lastId ? { id: { gt: lastId } } : {}),
      },
      select: { id: true, location: true, source: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    // Process each entry and build targeted updates
    const updates: Array<{
      id: string;
      country: string | null;
      region: string | null;
    }> = [];

    for (const entry of batch) {
      const parsed = parseLocation(entry.location);
      if (parsed.country === null && parsed.region === null) continue;
      updates.push({ id: entry.id, country: parsed.country, region: parsed.region });
    }

    // Apply updates individually (Prisma updateMany doesn't support per-row data)
    await Promise.all(
      updates.map(({ id, country, region }) =>
        prisma.jobPool.update({
          where: { id },
          data: {
            ...(country !== null ? { country } : {}),
            ...(region !== null ? { region } : {}),
          },
        })
      )
    );

    totalProcessed += batch.length;
    totalCountrySet += updates.filter((u) => u.country !== null).length;
    totalRegionSet += updates.filter((u) => u.region !== null).length;

    lastId = batch[batch.length - 1].id;
    hasMore = batch.length === BATCH_SIZE;
  }

  return NextResponse.json({
    ok: true,
    stats: {
      usajobsDirectSet,
      totalProcessed,
      totalCountrySet,
      totalRegionSet,
    },
  });
}
