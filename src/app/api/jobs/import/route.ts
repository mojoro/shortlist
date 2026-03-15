import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { importJobSchema } from "@/lib/validations";
import type { LocationType, JobType } from "@prisma/client";

const URL_RE = /^https?:\/\//i;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = importJobSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[/api/jobs/import] Validation error:", JSON.stringify(parsed.error.flatten()));
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
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
  } = parsed.data;

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) return new Response("Profile not found", { status: 404 });

  // Determine a stable externalId for deduplication
  const isUrl = URL_RE.test(originalInput.trim());
  const externalId = isUrl
    ? originalInput.trim()
    : (url?.trim() || crypto.randomUUID());

  try {
    const poolEntry = await prisma.jobPool.upsert({
      where:  { source_externalId: { source: "CUSTOM", externalId } },
      create: {
        source:      "CUSTOM",
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

    const job = await prisma.job.upsert({
      where:  { profileId_jobPoolId: { profileId, jobPoolId: poolEntry.id } },
      create: { profileId, jobPoolId: poolEntry.id, feedStatus: "NEW" },
      update: {},
      include: { jobPool: true, application: { select: { status: true } } },
    });

    // Fire analysis — fire-and-forget, reuse same host-based pattern as requestAnalysis
    const h = await headers();
    const host  = h.get("host") ?? "";
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    fetch(`${proto}://${host}/api/analyze`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${process.env.CRON_SECRET}`,
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
