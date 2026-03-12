import { GREENHOUSE_COMPANIES } from "@/config/companies";

export interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  location: { name: string };
  content: string; // HTML job description
  absolute_url: string;
  departments: { id: number; name: string }[];
  offices: { id: number; name: string }[];
}

export interface GreenhouseRawJob {
  raw: GreenhouseJob;
  slug: string;
  companyName: string;
}

/**
 * Scrapes all job listings from every company in GREENHOUSE_COMPANIES.
 * Companies that don't use Greenhouse (404) or fail for any reason are
 * silently skipped — a single failure never aborts the whole run.
 *
 * _profileId is unused now; reserved for when the company list moves
 * to the Profile model and is managed via settings.
 */
export async function scrapeGreenhouse(
  _profileId: string,
): Promise<GreenhouseRawJob[]> {
  const results: GreenhouseRawJob[] = [];

  for (const company of GREENHOUSE_COMPANIES) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`,
        { cache: "no-store" },
      );
      if (!res.ok) continue;

      const data = (await res.json()) as { jobs?: GreenhouseJob[] };
      for (const job of data.jobs ?? []) {
        results.push({ raw: job, slug: company.slug, companyName: company.name });
      }
    } catch {
      // Skip this company — network error, invalid JSON, etc.
    }
  }

  return results;
}
