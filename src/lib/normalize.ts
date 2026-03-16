import type { Prisma, JobType, LocationType } from "@prisma/client";
import type { GreenhouseJob } from "@/lib/scrapers/greenhouse";
import type { LeverPosting } from "@/lib/scrapers/lever";
import type { AshbyJob } from "@/lib/scrapers/ashby";
import TurndownService from "turndown";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function htmlToMarkdown(html: string): string {
  return html ? td.turndown(html).trim() : "";
}

// ── Greenhouse ────────────────────────────────────────────────────────────────

export function normalizeGreenhouseForPool(
  raw: GreenhouseJob,
  slug: string,
  companyName: string,
): Prisma.JobPoolUncheckedCreateInput {
  return {
    externalId:  `greenhouse-${slug}-${raw.id}`,
    source:      "GREENHOUSE",
    url:         raw.absolute_url,
    title:       raw.title,
    company:     companyName,
    location:    raw.location?.name ?? null,
    description: raw.content ? htmlToMarkdown(raw.content) : "",
    postedAt:    raw.updated_at ? new Date(raw.updated_at) : null,
    rawData:     raw as unknown as Prisma.InputJsonValue,
  };
}

// ── Lever ─────────────────────────────────────────────────────────────────────

const LEVER_JOB_TYPE: Record<string, JobType> = {
  "full-time":  "FULL_TIME",
  "part-time":  "PART_TIME",
  "contract":   "CONTRACT",
  "internship": "INTERNSHIP",
  "freelance":  "FREELANCE",
};

const LEVER_LOCATION_TYPE: Record<string, LocationType> = {
  remote: "REMOTE",
  hybrid: "HYBRID",
  onsite: "ONSITE",
};

function leverDescription(raw: LeverPosting): string {
  const parts: string[] = [];
  if (raw.description) parts.push(raw.description);
  for (const section of raw.lists ?? []) {
    if (section.text) parts.push(`<h3>${section.text}</h3>`);
    if (section.content) parts.push(section.content);
  }
  if (raw.additional) parts.push(raw.additional);
  return parts.length ? htmlToMarkdown(parts.join("\n")) : "";
}

export function normalizeLeverForPool(
  raw: LeverPosting,
  slug: string,
  companyName: string,
): Prisma.JobPoolUncheckedCreateInput {
  const commitment = raw.categories?.commitment?.toLowerCase() ?? "";
  const workplace  = raw.workplaceType?.toLowerCase() ?? "";

  return {
    externalId:   `lever-${slug}-${raw.id}`,
    source:       "LEVER",
    url:          raw.hostedUrl,
    title:        raw.text,
    company:      companyName,
    location:     raw.categories?.location ?? null,
    locationType: LEVER_LOCATION_TYPE[workplace] ?? null,
    description:  leverDescription(raw),
    jobType:      LEVER_JOB_TYPE[commitment] ?? null,
    postedAt:     raw.createdAt ? new Date(raw.createdAt) : null,
    rawData:      raw as unknown as Prisma.InputJsonValue,
  };
}

// ── Ashby ─────────────────────────────────────────────────────────────────────

const ASHBY_JOB_TYPE: Record<string, JobType> = {
  fulltime:   "FULL_TIME",
  parttime:   "PART_TIME",
  contract:   "CONTRACT",
  internship: "INTERNSHIP",
};

const ASHBY_LOCATION_TYPE: Record<string, LocationType> = {
  remote:  "REMOTE",
  hybrid:  "HYBRID",
  onsite:  "ONSITE",
};

export function normalizeAshbyForPool(
  raw: AshbyJob,
  slug: string,
  companyName: string,
): Prisma.JobPoolUncheckedCreateInput {
  const empType      = raw.employmentType?.toLowerCase().replace(/[-_\s]/g, "") ?? "";
  const workplaceKey = raw.workplaceType?.toLowerCase().replace(/[-_\s]/g, "") ?? "";
  const url          = raw.jobUrl ?? `https://jobs.ashbyhq.com/${slug}/${raw.id}`;

  const description = raw.descriptionHtml
    ? htmlToMarkdown(raw.descriptionHtml)
    : (raw.descriptionPlain ?? "");

  return {
    externalId:   `ashby-${slug}-${raw.id}`,
    source:       "ASHBY",
    url,
    title:        raw.title,
    company:      companyName,
    location:     raw.location ?? null,
    locationType: ASHBY_LOCATION_TYPE[workplaceKey] ?? null,
    description,
    jobType:      ASHBY_JOB_TYPE[empType] ?? null,
    postedAt:     raw.publishedAt ? new Date(raw.publishedAt) : null,
    rawData:      raw as unknown as Prisma.InputJsonValue,
  };
}
