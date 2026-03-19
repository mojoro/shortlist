import { ASHBY_COMPANIES } from "@/config/companies";

export interface AshbyJob {
  id: string;
  title: string;
  department?: string;
  team?: string;
  location?: string; // plain string e.g. "Remote", "Berlin, Germany"
  secondaryLocations?: string[];
  isRemote?: boolean;
  workplaceType?: string; // "Remote" | "Hybrid" | "OnSite"
  employmentType?: string; // "FullTime" | "PartTime" | "Contract" | "Internship"
  publishedAt?: string; // ISO string
  jobUrl?: string; // canonical URL on ashbyhq.com
  applyUrl?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  compensation?: {
    compensationTierSummary?: string | null;
    scrapeableCompensationSalarySummary?: string | null;
  };
}

export interface AshbyRawJob {
  raw: AshbyJob;
  slug: string;
  companyName: string;
}

async function fetchCompany(company: (typeof ASHBY_COMPANIES)[number]): Promise<AshbyRawJob[]> {
  try {
    const res = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=true`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs?: AshbyJob[] };
    return (data.jobs ?? []).map((raw) => ({ raw, slug: company.slug, companyName: company.name }));
  } catch {
    return [];
  }
}

export async function scrapeAshby(): Promise<AshbyRawJob[]> {
  const results: AshbyRawJob[] = [];
  const BATCH = 10;
  for (let i = 0; i < ASHBY_COMPANIES.length; i += BATCH) {
    const batch = await Promise.allSettled(ASHBY_COMPANIES.slice(i, i + BATCH).map(fetchCompany));
    results.push(...batch.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
  }
  return results;
}
