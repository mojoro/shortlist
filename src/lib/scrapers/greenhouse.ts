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
async function fetchCompany(company: (typeof GREENHOUSE_COMPANIES)[number]): Promise<GreenhouseRawJob[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs?: GreenhouseJob[] };
    return (data.jobs ?? []).map((raw) => ({ raw, slug: company.slug, companyName: company.name }));
  } catch {
    return [];
  }
}

export async function scrapeGreenhouse(_profileId: string): Promise<GreenhouseRawJob[]> {
  const batches = await Promise.allSettled(GREENHOUSE_COMPANIES.map(fetchCompany));
  return batches.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
