import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { importJobSchema, URL_RE } from "@/lib/validations";
import type { LocationType, JobType, ScraperSource } from "@prisma/client";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = importJobSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }

  const {
    profileId,
    originalInput,
    title,
    company,
    description,
    location,
    locationType,
    url,
    postedAt,
    jobType,
    salaryMin,
    salaryMax,
    currency,
    skills,
    source,
    externalId: clientExternalId,
  } = parsed.data;

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) return new Response("Profile not found", { status: 404 });

  // Determine a stable externalId for deduplication.
  // Prefer client-supplied externalId (e.g. from Chrome extension scraping a known source),
  // then fall back to URL-based or random ID for manual imports.
  const isUrl = URL_RE.test(originalInput.trim());
  const externalId = clientExternalId
    ?? (isUrl ? originalInput.trim() : (url?.trim() || crypto.randomUUID()));

  try {
    const poolEntry = await prisma.jobPool.upsert({
      where:  { source_externalId: { source: source as ScraperSource, externalId } },
      create: {
        source:      source as ScraperSource,
        externalId,
        url:         url || "",
        title,
        company,
        description,
        location:    location ?? null,
        locationType: locationType as LocationType ?? null,
        postedAt:    postedAt ? new Date(postedAt) : null,
        jobType:     jobType as JobType ?? null,
        salaryMin:   salaryMin ?? null,
        salaryMax:   salaryMax ?? null,
        currency:    currency ?? null,
        skills:      skills ?? [],
        rawData:     { originalInput },
      },
      update: {},
    });

    // Check if this job already exists for this profile
    const existing = await prisma.job.findUnique({
      where: { profileId_jobPoolId: { profileId, jobPoolId: poolEntry.id } },
      select: { id: true },
    });

    if (existing) {
      return Response.json(
        { error: "You've already imported this job listing.", job: { id: existing.id } },
        { status: 409 },
      );
    }

    const job = await prisma.job.create({
      data: { profileId, jobPoolId: poolEntry.id, feedStatus: "NEW" },
      include: { jobPool: true, application: { select: { status: true } } },
    });

    // Fire analysis — fire-and-forget
    const h = await headers();
    const host  = h.get("host") ?? "";
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    fetch(`${proto}://${host}/api/analyze`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${env.CRON_SECRET}`,
      },
      body: JSON.stringify({ profileId }),
    });

    return Response.json({ job });
  } catch (err) {
    console.error("[/api/jobs/import]", err);
    return Response.json(
      { error: "Failed to save job. Please try again." },
      { status: 500 },
    );
  }
}
