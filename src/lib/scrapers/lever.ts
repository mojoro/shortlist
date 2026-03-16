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

async function fetchCompany(company: (typeof LEVER_COMPANIES)[number]): Promise<LeverRawJob[]> {
  try {
    const res = await fetch(
      `https://api.lever.co/v1/postings/${company.slug}?mode=json&limit=250`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as LeverPosting[];
    if (!Array.isArray(data)) return [];
    return data.map((raw) => ({ raw, slug: company.slug, companyName: company.name }));
  } catch {
    return [];
  }
}

export async function scrapeLever(_profileId: string): Promise<LeverRawJob[]> {
  const batches = await Promise.allSettled(LEVER_COMPANIES.map(fetchCompany));
  return batches.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
