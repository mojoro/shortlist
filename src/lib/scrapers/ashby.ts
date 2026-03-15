import { ASHBY_COMPANIES } from "@/config/companies";

export interface AshbyJob {
  id: string;
  title: string;
  teamName?: string;
  locationName?: string;
  locationNames?: string[];
  isRemote?: boolean;
  employmentType?: string; // "FullTime" | "PartTime" | "Contract" | "Internship"
  publishedAt?: string; // ISO string
  jobUrl?: string; // canonical URL on ashbyhq.com
  externalLink?: string; // company's own careers page link (may not exist)
  descriptionPlain?: string;
  descriptionHtml?: string;
  compensation?: {
    summaryShort?: string;
    minValue?: number;
    maxValue?: number;
    currency?: string;
  };
  department?: { name?: string };
}

export interface AshbyRawJob {
  raw: AshbyJob;
  slug: string;
  companyName: string;
}

export async function scrapeAshby(_profileId: string): Promise<AshbyRawJob[]> {
  const results: AshbyRawJob[] = [];

  for (const company of ASHBY_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=true`,
        { cache: "no-store" },
      );
      if (!res.ok) continue;

      const data = (await res.json()) as { jobs?: AshbyJob[] };
      for (const job of data.jobs ?? []) {
        results.push({ raw: job, slug: company.slug, companyName: company.name });
      }
    } catch {
      // Skip this company
    }
  }

  return results;
}
