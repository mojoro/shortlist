import { LEVER_COMPANIES } from "@/config/companies";

export interface LeverPosting {
  id: string;
  text: string; // title
  state: string;
  categories: {
    commitment?: string; // "Full-time" | "Part-time" | "Contract" | "Internship"
    location?: string;
    team?: string;
    department?: string;
    allLocations?: string[];
  };
  workplaceType?: string; // "remote" | "hybrid" | "onsite"
  description: string; // HTML
  descriptionPlain?: string;
  lists: Array<{ text: string; content: string }>; // named sections, HTML content
  additional?: string; // HTML closing section
  hostedUrl: string;
  createdAt: number; // unix ms
}

export interface LeverRawJob {
  raw: LeverPosting;
  slug: string;
  companyName: string;
}

export async function scrapeLever(_profileId: string): Promise<LeverRawJob[]> {
  const results: LeverRawJob[] = [];

  for (const company of LEVER_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.lever.co/v1/postings/${company.slug}?mode=json&limit=250`,
        { cache: "no-store" },
      );
      if (!res.ok) continue;

      const data = (await res.json()) as LeverPosting[];
      if (!Array.isArray(data)) continue;

      for (const job of data) {
        results.push({ raw: job, slug: company.slug, companyName: company.name });
      }
    } catch {
      // Skip this company
    }
  }

  return results;
}
