import { env } from "@/env";
import { USAJOBS_SEARCHES, type USAJobsSearchConfig } from "@/config/companies";

// ── USAJobs API response types ──────────────────────────────────────────────

export interface USAJobsRemuneration {
  MinimumRange: string;
  MaximumRange: string;
  RateIntervalCode: string; // "PA" = per annum, "PH" = per hour
  Description: string;
}

export interface USAJobsPosition {
  PositionID: string;
  PositionTitle: string;
  PositionURI: string;
  PositionLocation: Array<{
    LocationName: string;
    CountryCode: string;
    CountrySubDivisionCode: string;
    CityName: string;
    Longitude: number;
    Latitude: number;
  }>;
  OrganizationName: string;
  DepartmentName: string;
  JobCategory: Array<{ Name: string; Code: string }>;
  JobGrade: Array<{ Code: string }>;
  PositionSchedule: Array<{ Name: string; Code: string }>;
  PositionOfferingType: Array<{ Name: string; Code: string }>;
  QualificationSummary: string;
  PositionRemuneration: USAJobsRemuneration[];
  PositionStartDate: string;
  PositionEndDate: string;
  PublicationStartDate: string;
  ApplicationCloseDate: string;
  UserArea: {
    Details: {
      MajorDuties?: string[];
      JobSummary?: string;
      WhoMayApply?: { Name?: string; Code?: string };
      LowGrade?: string;
      HighGrade?: string;
      TeleworkEligible?: string;
      RemoteIndicator?: string; // "True" or "False"
    };
    IsRadialSearch?: boolean;
  };
}

export interface USAJobsSearchResult {
  SearchResult: {
    SearchResultCount: number;
    SearchResultCountAll: number;
    SearchResultItems: Array<{
      MatchedObjectId: string;
      MatchedObjectDescriptor: USAJobsPosition;
    }>;
  };
}

export interface USAJobsRawJob {
  raw: USAJobsPosition;
  keyword: string;
}

// ── Fetcher ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://data.usajobs.gov/api/search";
const RESULTS_PER_PAGE = 100;

async function fetchSearch(
  search: USAJobsSearchConfig,
  page: number,
): Promise<USAJobsSearchResult | null> {
  const apiKey = env.USAJOBS_API_KEY;
  const email = env.USAJOBS_EMAIL;
  if (!apiKey || !email) return null;

  const params = new URLSearchParams({
    ResultsPerPage: String(RESULTS_PER_PAGE),
    Page: String(page),
    DatePosted: "7",
    SortField: "DatePosted",
    SortDirection: "Desc",
  });

  if (search.keyword) {
    params.set("Keyword", search.keyword);
  }

  if (search.location) {
    params.set("LocationName", search.location);
  }

  try {
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: {
        "Authorization-Key": apiKey,
        "User-Agent": email,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as USAJobsSearchResult;
  } catch {
    return null;
  }
}

/**
 * Scrapes USAJobs API for all configured search terms.
 * Paginates automatically when results exceed RESULTS_PER_PAGE.
 * Each search error is caught independently — a single failure never
 * aborts the whole run.
 */
export async function scrapeUSAJobs(
  searches: USAJobsSearchConfig[] = USAJOBS_SEARCHES,
): Promise<USAJobsRawJob[]> {
  const apiKey = env.USAJOBS_API_KEY;
  const email = env.USAJOBS_EMAIL;
  if (!apiKey || !email) return [];

  const results: USAJobsRawJob[] = [];
  const seenIds = new Set<string>();

  for (const search of searches) {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await fetchSearch(search, page);
        if (!data) break;

        const items = data.SearchResult.SearchResultItems;
        for (const item of items) {
          const position = item.MatchedObjectDescriptor;
          // Deduplicate across searches within this run
          if (!seenIds.has(position.PositionID)) {
            seenIds.add(position.PositionID);
            results.push({ raw: position, keyword: search.keyword });
          }
        }

        const totalResults = data.SearchResult.SearchResultCountAll;
        hasMore = page * RESULTS_PER_PAGE < totalResults;
        page++;
      }
    } catch (err) {
      console.error(
        `[usajobs] Search failed for "${search.keyword}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return results;
}
