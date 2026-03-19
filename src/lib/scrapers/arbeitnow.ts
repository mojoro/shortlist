export interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string; // HTML
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number; // unix timestamp
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links: {
    next: string | null;
  };
}

export interface ArbeitnowRawJob {
  raw: ArbeitnowJob;
}

const MAX_PAGES = 3;

async function fetchPage(page: number): Promise<ArbeitnowJob[]> {
  try {
    const res = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as ArbeitnowResponse;
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Scrapes recent job listings from the Arbeitnow public API.
 * No API key or company config needed — the API returns all recent jobs.
 * Fetches pages 1–3 (~60 listings) to avoid hammering the API.
 */
export async function scrapeArbeitnow(): Promise<ArbeitnowRawJob[]> {
  const results: ArbeitnowRawJob[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const jobs = await fetchPage(page);
    results.push(...jobs.map((raw) => ({ raw })));
    // Stop early if the page returned no results (end of listings)
    if (jobs.length === 0) break;
  }
  return results;
}
