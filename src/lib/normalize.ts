import type { Prisma } from "@prisma/client";
import type { GreenhouseJob } from "@/lib/scrapers/greenhouse";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize a Greenhouse job for the global JobPool (no profileId).
 */
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
    description: raw.content ? stripHtml(raw.content) : "",
    postedAt:    raw.updated_at ? new Date(raw.updated_at) : null,
    rawData:     raw as unknown as Prisma.InputJsonValue,
  };
}
