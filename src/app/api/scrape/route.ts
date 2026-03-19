import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { scrapeGreenhouse } from "@/lib/scrapers/greenhouse";
import { scrapeLever } from "@/lib/scrapers/lever";
import { scrapeAshby } from "@/lib/scrapers/ashby";
import {
  normalizeGreenhouseForPool,
  normalizeLeverForPool,
  normalizeAshbyForPool,
} from "@/lib/normalize";
import { findMatchingPoolIds } from "@/lib/match-sql";
import type { ScraperSource } from "@prisma/client";

export const maxDuration = 60;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const skipPool = url.searchParams.get("skipPool") === "1";

  const startMs = Date.now();

  if (process.env.NODE_ENV === "development") {
    console.log("[/api/scrape] Entry — skipPool:", skipPool);
  }

  let totalPoolNew = 0;

  // ── POOL LAYER ────────────────────────────────────────────────────────────
  // Scrape all sources in parallel, write each to the pool, log per-source.

  if (!skipPool) {
    const [ghSettled, leverSettled, ashbySettled] = await Promise.allSettled([
      scrapeGreenhouse("_global"),
      scrapeLever("_global"),
      scrapeAshby("_global"),
    ]);

    type SourceSpec = {
      source: ScraperSource;
      settled: typeof ghSettled | typeof leverSettled | typeof ashbySettled;
      normalize: (results: unknown[]) => ReturnType<typeof normalizeGreenhouseForPool>[];
    };

    const sources: SourceSpec[] = [
      {
        source:    "GREENHOUSE",
        settled:   ghSettled,
        normalize: (r) =>
          (r as Awaited<ReturnType<typeof scrapeGreenhouse>>).map((j) =>
            normalizeGreenhouseForPool(j.raw, j.slug, j.companyName),
          ),
      },
      {
        source:    "LEVER",
        settled:   leverSettled,
        normalize: (r) =>
          (r as Awaited<ReturnType<typeof scrapeLever>>).map((j) =>
            normalizeLeverForPool(j.raw, j.slug, j.companyName),
          ),
      },
      {
        source:    "ASHBY",
        settled:   ashbySettled,
        normalize: (r) =>
          (r as Awaited<ReturnType<typeof scrapeAshby>>).map((j) =>
            normalizeAshbyForPool(j.raw, j.slug, j.companyName),
          ),
      },
    ];

    for (const { source, settled, normalize } of sources) {
      const sourceStart = Date.now();
      let rawCount = 0;
      let poolNew  = 0;
      let status: "SUCCESS" | "FAILED" = "SUCCESS";
      let errorMessage: string | undefined;

      try {
        if (settled.status === "rejected") throw settled.reason as Error;

        const rawJobs  = settled.value as unknown[];
        rawCount       = rawJobs.length;
        const poolData = normalize(rawJobs);

        // Insert in chunks of 200 to keep individual query sizes manageable
        const CHUNK = 200;
        for (let i = 0; i < poolData.length; i += CHUNK) {
          const { count } = await prisma.jobPool.createMany({
            data:           poolData.slice(i, i + CHUNK),
            skipDuplicates: true,
          });
          poolNew      += count;
          totalPoolNew += count;
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`[/api/scrape] ${source} — rawCount: ${rawCount}, poolNew: ${poolNew}`);
        }
      } catch (err) {
        console.error(`[/api/scrape] ${source} pool scrape failed:`, err);
        status       = "FAILED";
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      await prisma.scrapeRun.create({
        data: {
          profileId:    null,
          source,
          status,
          jobsFound:    rawCount,
          jobsInPool:   poolNew,
          errorMessage,
          durationMs:   Date.now() - sourceStart,
        },
      });
    }
  }

  // ── MATCH LAYER ───────────────────────────────────────────────────────────
  // Profile matching now runs entirely in SQL — only matched IDs are
  // returned from the database, eliminating the 2000-row data transfer.

  const profiles = await prisma.profile.findMany({
    where: { scraperEnabled: true },
  });

  const results: { profileId: string; jobsNew: number; status: string }[] = [];

  for (const profile of profiles) {
    const profileStart = Date.now();
    let jobsNew = 0;
    let profileStatus: "SUCCESS" | "FAILED" = "SUCCESS";
    let profileError: string | undefined;

    try {
      const matchedIds = await findMatchingPoolIds(profile.id, profile);

      if (matchedIds.length > 0) {
        const { count } = await prisma.job.createMany({
          data: matchedIds.map((poolId) => ({
            profileId: profile.id,
            jobPoolId: poolId,
            feedStatus: "NEW" as const,
          })),
          skipDuplicates: true,
        });
        jobsNew = count;
      }

      await prisma.profile.update({
        where: { id: profile.id },
        data:  { lastScrapedAt: new Date() },
      });
    } catch (err) {
      console.error(`[/api/scrape] Match failed for profile ${profile.id}:`, err);
      profileStatus = "FAILED";
      profileError  = err instanceof Error ? err.message : String(err);
    }

    await prisma.scrapeRun.create({
      data: {
        profileId:    profile.id,
        source:       "GREENHOUSE",
        status:       profileStatus,
        jobsFound:    0,
        jobsNew,
        errorMessage: profileError,
        durationMs:   Date.now() - profileStart,
      },
    });

    results.push({ profileId: profile.id, jobsNew, status: profileStatus });
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[/api/scrape] Exit — totalPoolNew: ${totalPoolNew}, profiles: ${results.length}, durationMs: ${Date.now() - startMs}`);
  }

  revalidateTag("dashboard-stats");
  return Response.json({ poolNew: totalPoolNew, results });
}

// Vercel cron jobs send GET requests — delegate to the same handler
export { POST as GET };
