import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { scrapeGreenhouse } from "@/lib/scrapers/greenhouse";
import { normalizeGreenhouseForPool } from "@/lib/normalize";
import { jobMatchesProfile, MAX_CANDIDATES_PER_RUN } from "@/lib/match";

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

  let poolNew = 0;

  // ── POOL LAYER ────────────────────────────────────────────────────────────
  // Scrape all sources once into the global JobPool. Skipped when the pool is
  // already fresh (pass ?skipPool=1 to run the match layer against existing data).

  if (!skipPool) {
    let rawCount = 0;
    let poolScrapeStatus: "SUCCESS" | "PARTIAL" | "FAILED" = "SUCCESS";
    let poolErrorMessage: string | undefined;

    try {
      const rawJobs = await scrapeGreenhouse("_global");
      rawCount = rawJobs.length;

      const poolData = rawJobs.map((r) =>
        normalizeGreenhouseForPool(r.raw, r.slug, r.companyName),
      );

      const { count } = await prisma.jobPool.createMany({
        data:           poolData,
        skipDuplicates: true,
      });
      poolNew = count;

      if (process.env.NODE_ENV === "development") {
        console.log(`[/api/scrape] Pool write — rawCount: ${rawCount}, poolNew: ${poolNew}`);
      }
    } catch (err) {
      console.error("[/api/scrape] Pool scrape failed:", err);
      poolScrapeStatus = "FAILED";
      poolErrorMessage = err instanceof Error ? err.message : String(err);
    }

    // Log the pool-level run (profileId: null)
    await prisma.scrapeRun.create({
      data: {
        profileId:    null,
        source:       "GREENHOUSE",
        status:       poolScrapeStatus,
        jobsFound:    rawCount,
        jobsInPool:   poolNew,
        errorMessage: poolErrorMessage,
        durationMs:   Date.now() - startMs,
      },
    });

    if (poolScrapeStatus === "FAILED") {
      return Response.json({ error: "Pool scrape failed", poolNew: 0, results: [] }, { status: 500 });
    }
  }

  // ── MATCH LAYER ───────────────────────────────────────────────────────────
  // For each enabled profile, filter the pool by profile criteria and
  // surface only the most relevant candidates into their Job feed.

  const profiles = await prisma.profile.findMany({
    where: { scraperEnabled: true },
  });

  // Load the full pool once and reuse for all profiles.
  // take: 2000 covers all realistic pool sizes; order newest-first so the
  // per-profile cap naturally picks the most recent matching jobs.
  const pool = await prisma.jobPool.findMany({
    orderBy: { postedAt: "desc" },
    take:    2000,
  });

  const results: { profileId: string; jobsNew: number; status: string }[] = [];

  for (const profile of profiles) {
    const profileStart = Date.now();
    let jobsNew = 0;
    let profileStatus: "SUCCESS" | "FAILED" = "SUCCESS";
    let profileError: string | undefined;

    if (process.env.NODE_ENV === "development") {
      console.log(`[/api/scrape] Match start — profileId: ${profile.id}`);
    }

    try {
      // IDs of pool jobs already in this profile's feed
      const existing = await prisma.job.findMany({
        where:  { profileId: profile.id },
        select: { jobPoolId: true },
      });
      const existingIds = new Set(existing.map((j) => j.jobPoolId));

      // Filter pool against profile criteria, skip already-seen, cap at limit
      const candidates = pool
        .filter((p) => !existingIds.has(p.id) && jobMatchesProfile(p, profile))
        .slice(0, MAX_CANDIDATES_PER_RUN);

      if (process.env.NODE_ENV === "development") {
        console.log(`[/api/scrape] Match result — profileId: ${profile.id}, candidates: ${candidates.length}`);
      }

      if (candidates.length > 0) {
        const { count } = await prisma.job.createMany({
          data: candidates.map((c) => ({
            profileId: profile.id,
            jobPoolId: c.id,
            feedStatus: "NEW" as const,
          })),
          skipDuplicates: true,
        });
        jobsNew = count;

        if (process.env.NODE_ENV === "development") {
          console.log(`[/api/scrape] Jobs inserted — profileId: ${profile.id}, jobsNew: ${jobsNew}`);
        }
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

    // Log per-profile run
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

    // Fire-and-forget analyze for new jobs
    if (jobsNew > 0) {
      fetch(`${env.NEXT_PUBLIC_APP_URL}/api/analyze`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${env.CRON_SECRET}`,
        },
        body: JSON.stringify({ profileId: profile.id }),
      }).catch((err) =>
        console.error(`[/api/scrape] Failed to trigger analyze for ${profile.id}:`, err),
      );
    }

    results.push({ profileId: profile.id, jobsNew, status: profileStatus });
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[/api/scrape] Exit — poolNew: ${poolNew}, profiles: ${results.length}, durationMs: ${Date.now() - startMs}`);
  }

  return Response.json({ poolNew, results });
}
