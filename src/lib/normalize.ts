import type { Prisma } from "@prisma/client";
import type { GreenhouseJob } from "@/lib/scrapers/greenhouse";
import TurndownService from "turndown";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function htmlToMarkdown(html: string): string {
  return html ? td.turndown(html).trim() : "";
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
    description: raw.content ? htmlToMarkdown(raw.content) : "",
    postedAt:    raw.updated_at ? new Date(raw.updated_at) : null,
    rawData:     raw as unknown as Prisma.InputJsonValue,
  };
}
