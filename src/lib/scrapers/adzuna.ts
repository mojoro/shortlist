import { env } from "@/env";
import { ADZUNA_SEARCHES } from "@/config/companies";
import type { AdzunaSearchConfig } from "@/config/companies";

// ── Adzuna API response types ───────────────────────────────────────────────

export interface AdzunaApiJob {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: {
    display_name: string;
    area?: string[];
  };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  created: string; // ISO date
  redirect_url: string;
  contract_type?: string;
  contract_time?: string; // "full_time" | "part_time" | "contract"
  category?: { label: string };
  latitude?: number;
  longitude?: number;
}

interface AdzunaApiResponse {
  results: AdzunaApiJob[];
  count: number; // total results across all pages
}

export interface AdzunaRawJob {
  raw: AdzunaApiJob;
  country: string;
  keyword: string;
}

// ── Currency map ────────────────────────────────────────────────────────────

const COUNTRY_CURRENCY: Record<string, string> = {
  us: "USD",
  gb: "GBP",
  de: "EUR",
  fr: "EUR",
  au: "AUD",
  ca: "CAD",
  nl: "EUR",
  at: "EUR",
  it: "EUR",
  es: "EUR",
  be: "EUR",
  ch: "CHF",
  pl: "PLN",
  br: "BRL",
  in: "INR",
  sg: "SGD",
  nz: "NZD",
  za: "ZAR",
  mx: "MXN",
};

export function currencyForCountry(country: string): string {
  return COUNTRY_CURRENCY[country.toLowerCase()] ?? "USD";
}

// ── Fetch a single search page ──────────────────────────────────────────────

async function fetchPage(
  search: AdzunaSearchConfig,
  page: number,
  appId: string,
  appKey: string,
): Promise<AdzunaApiResponse | null> {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "50",
    max_days_old: "7",
    what: search.keyword,
  });
  if (search.location) {
    params.set("where", search.location);
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${search.country}/search/${page}?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as AdzunaApiResponse;
  } catch {
    return null;
  }
}

// ── Main scraper ────────────────────────────────────────────────────────────

const MAX_PAGES = 3; // 50 results/page * 3 = 150 max per search

/**
 * Scrapes job listings from the Adzuna API for all configured searches.
 * Returns raw API results wrapped with search metadata.
 */
export async function scrapeAdzuna(
  searches: AdzunaSearchConfig[] = ADZUNA_SEARCHES,
): Promise<AdzunaRawJob[]> {
  const appId = env.ADZUNA_APP_ID;
  const appKey = env.ADZUNA_APP_KEY;

  if (!appId || !appKey) return [];

  const results: AdzunaRawJob[] = [];

  for (const search of searches) {
    let page = 1;
    let searchFetched = 0;

    while (page <= MAX_PAGES) {
      const data = await fetchPage(search, page, appId, appKey);
      if (!data || data.results.length === 0) break;

      for (const job of data.results) {
        results.push({
          raw: job,
          country: search.country,
          keyword: search.keyword,
        });
      }
      searchFetched += data.results.length;

      // Stop if we've fetched all available results for this search
      if (searchFetched >= data.count || data.results.length < 50) break;
      page++;
    }
  }

  return results;
}
