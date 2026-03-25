import type { Prisma, JobType, LocationType } from "@prisma/client";
import type { GreenhouseJob } from "@/lib/scrapers/greenhouse";
import type { LeverPosting } from "@/lib/scrapers/lever";
import type { AshbyJob } from "@/lib/scrapers/ashby";
import type { USAJobsPosition } from "@/lib/scrapers/usajobs";
import type { AdzunaApiJob } from "@/lib/scrapers/adzuna";
import { currencyForCountry } from "@/lib/scrapers/adzuna";
import type { ArbeitnowJob } from "@/lib/scrapers/arbeitnow";
import { parseLocation } from "@/lib/location-parser";
import { td } from "@/lib/html-to-markdown";

function htmlToMarkdown(html: string): string {
  return html ? td.turndown(html).trim() : "";
}

// ── Greenhouse ────────────────────────────────────────────────────────────────

export function normalizeGreenhouseForPool(
  raw: GreenhouseJob,
  slug: string,
  companyName: string,
): Prisma.JobPoolUncheckedCreateInput {
  // Exclude HTML content from rawData — it's already stored as markdown in description
  // and the full HTML can be 50–100KB per job, making bulk inserts impractical.
  const { content: _content, ...rawMeta } = raw;
  const { country, region } = parseLocation(raw.location?.name ?? null);
  return {
    externalId:  `greenhouse-${slug}-${raw.id}`,
    source:      "GREENHOUSE",
    url:         raw.absolute_url,
    title:       raw.title,
    company:     companyName,
    location:    raw.location?.name ?? null,
    description: raw.content ? htmlToMarkdown(raw.content) : "",
    postedAt:    raw.updated_at ? new Date(raw.updated_at) : null,
    rawData:     rawMeta as unknown as Prisma.InputJsonValue,
    skills:      [],
    country,
    region,
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
  const { country, region } = parseLocation(raw.categories?.location ?? null);

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
    skills:       [],
    country,
    region,
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

  // Exclude large HTML/text description fields from rawData
  const { descriptionHtml: _html, descriptionPlain: _plain, ...rawMeta } = raw;
  const { country, region } = parseLocation(raw.location ?? null);

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
    rawData:      rawMeta as unknown as Prisma.InputJsonValue,
    skills:       [],
    country,
    region,
  };
}

// ── USAJobs ──────────────────────────────────────────────────────────────────

const USAJOBS_SCHEDULE_TYPE: Record<string, JobType> = {
  "1": "FULL_TIME",   // Full-time
  "2": "PART_TIME",   // Part-time
  "3": "PART_TIME",   // Intermittent
};

function usajobsDescription(raw: USAJobsPosition): string {
  const parts: string[] = [];

  if (raw.UserArea?.Details?.JobSummary) {
    parts.push(raw.UserArea.Details.JobSummary);
  }
  if (raw.QualificationSummary) {
    parts.push(raw.QualificationSummary);
  }

  const duties = raw.UserArea?.Details?.MajorDuties;
  if (duties && duties.length > 0) {
    parts.push("## Major Duties\n\n" + duties.map((d) => `- ${d}`).join("\n"));
  }

  return parts.join("\n\n");
}

function usajobsLocationType(raw: USAJobsPosition): LocationType | null {
  const remote = raw.UserArea?.Details?.RemoteIndicator;
  if (remote === "True") return "REMOTE";

  const telework = raw.UserArea?.Details?.TeleworkEligible;
  if (telework === "True") return "HYBRID";

  return null;
}

function parseRemunerationToAnnual(
  remuneration: USAJobsPosition["PositionRemuneration"][number] | undefined,
): { salaryMin: number | null; salaryMax: number | null } {
  if (!remuneration) return { salaryMin: null, salaryMax: null };

  const min = parseFloat(remuneration.MinimumRange);
  const max = parseFloat(remuneration.MaximumRange);
  if (isNaN(min) && isNaN(max)) return { salaryMin: null, salaryMax: null };

  // Convert hourly to annual (2080 hours/year)
  const multiplier = remuneration.RateIntervalCode === "PH" ? 2080 : 1;

  return {
    salaryMin: isNaN(min) ? null : Math.round(min * multiplier),
    salaryMax: isNaN(max) ? null : Math.round(max * multiplier),
  };
}

export function normalizeUSAJobsForPool(
  raw: USAJobsPosition,
): Prisma.JobPoolUncheckedCreateInput {
  const scheduleCode = raw.PositionSchedule?.[0]?.Code ?? "";
  const remuneration = raw.PositionRemuneration?.[0];
  const { salaryMin, salaryMax } = parseRemunerationToAnnual(remuneration);
  const location = raw.PositionLocation?.[0]?.LocationName ?? null;

  // Exclude QualificationSummary and MajorDuties from rawData since they are
  // already stored as structured description text
  const { QualificationSummary: _qs, ...rawMeta } = raw;

  return {
    externalId:   `usajobs-${raw.PositionID}`,
    source:       "USAJOBS",
    url:          raw.PositionURI,
    title:        raw.PositionTitle,
    company:      raw.OrganizationName || raw.DepartmentName,
    location,
    locationType: usajobsLocationType(raw),
    description:  usajobsDescription(raw),
    jobType:      USAJOBS_SCHEDULE_TYPE[scheduleCode] ?? "FULL_TIME",
    postedAt:     raw.PublicationStartDate ? new Date(raw.PublicationStartDate) : null,
    salaryMin,
    salaryMax,
    currency:     "USD",
    rawData:      rawMeta as unknown as Prisma.InputJsonValue,
    skills:       [],
    country:      "US",
    region:       raw.PositionLocation?.[0]?.LocationName
      ? parseLocation(raw.PositionLocation[0].LocationName).region
      : null,
  };
}

// ── Adzuna ──────────────────────────────────────────────────────────────────

const ADZUNA_JOB_TYPE: Record<string, JobType> = {
  full_time:  "FULL_TIME",
  part_time:  "PART_TIME",
  contract:   "CONTRACT",
};

export function normalizeAdzunaForPool(
  raw: AdzunaApiJob,
  country: string,
): Prisma.JobPoolUncheckedCreateInput {
  const contractTime = raw.contract_time?.toLowerCase() ?? "";

  // Exclude description from rawData — already stored as top-level field
  const { description: _desc, ...rawMeta } = raw;
  const { region } = parseLocation(raw.location?.display_name ?? null);

  return {
    externalId:  `adzuna-${raw.id}`,
    source:      "ADZUNA",
    url:         raw.redirect_url,
    title:       raw.title,
    company:     raw.company?.display_name ?? "Unknown",
    location:    raw.location?.display_name ?? null,
    description: raw.description ?? "",
    postedAt:    raw.created ? new Date(raw.created) : null,
    rawData:     rawMeta as unknown as Prisma.InputJsonValue,
    skills:      [],
    salaryMin:   raw.salary_min ? Math.round(raw.salary_min) : null,
    salaryMax:   raw.salary_max ? Math.round(raw.salary_max) : null,
    currency:    currencyForCountry(country),
    jobType:     ADZUNA_JOB_TYPE[contractTime] ?? null,
    country:     country.toUpperCase(),
    region,
  };
}

// ── Arbeitnow ─────────────────────────────────────────────────────────────────

const ARBEITNOW_JOB_TYPE: Record<string, JobType> = {
  "full time":  "FULL_TIME",
  "part time":  "PART_TIME",
  "contract":   "CONTRACT",
  "freelance":  "FREELANCE",
  "internship": "INTERNSHIP",
};

function parseArbeitnowJobType(jobTypes: string[]): JobType | null {
  for (const jt of jobTypes) {
    const mapped = ARBEITNOW_JOB_TYPE[jt.toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}

export function normalizeArbeitnowForPool(
  raw: ArbeitnowJob,
): Prisma.JobPoolUncheckedCreateInput {
  // Exclude HTML description from rawData — it's already stored as markdown
  const { description: _desc, ...rawMeta } = raw;

  const locationType: LocationType | null = raw.remote ? "REMOTE" : null;
  const { country, region } = parseLocation(raw.location || null);

  return {
    externalId:   `arbeitnow-${raw.slug}`,
    source:       "ARBEITNOW",
    url:          raw.url,
    title:        raw.title,
    company:      raw.company_name,
    location:     raw.location || null,
    locationType,
    description:  raw.description ? htmlToMarkdown(raw.description) : "",
    jobType:      parseArbeitnowJobType(raw.job_types),
    skills:       raw.tags,
    postedAt:     raw.created_at ? new Date(raw.created_at * 1000) : null,
    rawData:      rawMeta as unknown as Prisma.InputJsonValue,
    country,
    region,
  };
}
