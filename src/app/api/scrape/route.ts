import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { scrapeGreenhouse } from "@/lib/scrapers/greenhouse";
import { normalizeGreenhouse } from "@/lib/normalize";

export const maxDuration = 60;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const profiles = await prisma.profile.findMany({
    where: { scraperEnabled: true },
  });

  const results: {
    profileId: string;
    jobsFound: number;
    jobsNew: number;
    status: string;
  }[] = [];

  for (const profile of profiles) {
    const startMs = Date.now();
    let jobsFound = 0;
    let jobsNew = 0;
    let scrapeStatus: "SUCCESS" | "PARTIAL" | "FAILED" = "SUCCESS";
    let errorMessage: string | undefined;

    try {
      const rawJobs = profile.scraperSources.includes("GREENHOUSE")
        ? await scrapeGreenhouse(profile.id)
        : [];

      jobsFound = rawJobs.length;

      if (rawJobs.length > 0) {
        const normalized = rawJobs.map((r) =>
          normalizeGreenhouse(r.raw, r.slug, r.companyName, profile.id),
        );

        const { count } = await prisma.job.createMany({
          data: normalized,
          skipDuplicates: true,
        });

        jobsNew = count;
      }

      await prisma.profile.update({
        where: { id: profile.id },
        data: { lastScrapedAt: new Date() },
      });
    } catch (err) {
      console.error(`[/api/scrape] Profile ${profile.id} failed:`, err);
      scrapeStatus = "FAILED";
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const durationMs = Date.now() - startMs;

    await prisma.scrapeRun.create({
      data: {
        profileId:    profile.id,
        source:       "GREENHOUSE",
        status:       scrapeStatus,
        jobsFound,
        jobsNew,
        errorMessage,
        durationMs,
      },
    });

    if (jobsNew > 0) {
      // Fire-and-forget: don't await so scrape route returns quickly
      fetch(`${env.NEXT_PUBLIC_APP_URL}/api/analyze`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${env.CRON_SECRET}`,
        },
        body: JSON.stringify({ profileId: profile.id }),
      }).catch((err) =>
        console.error(`[/api/scrape] Failed to trigger analyze for ${profile.id}:`, err),
      );
    }

    results.push({ profileId: profile.id, jobsFound, jobsNew, status: scrapeStatus });
  }

  return Response.json({ results });
}
