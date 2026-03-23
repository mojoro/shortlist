import type { Extractor, ExtractedJob } from "../../types";
import { inferLocationType, parseJobType } from "./utils";

export const leverExtractor: Extractor = {
  matches: /^https?:\/\/jobs\.lever\.co\/[^/]+\/[a-f0-9-]+/,

  extract(): ExtractedJob | null {
    const title = document
      .querySelector(".posting-headline h2")
      ?.textContent?.trim();

    const company =
      document
        .querySelector(".posting-headline .company-name, .main-header-logo img")
        ?.getAttribute("alt") ??
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") ??
      "";

    if (!title || !company) return null;

    // Lever puts location and work type in category tags
    const categories = document.querySelectorAll(
      ".posting-categories .posting-category",
    );
    let location: string | null = null;
    let commitment: string | null = null;

    categories.forEach((el) => {
      const text = el.textContent?.trim() ?? "";
      const label = el.querySelector(
        ".sort-by-commitment, .sort-by-location, .sort-by-team",
      );
      if (label?.classList.contains("sort-by-location")) location = text;
      if (label?.classList.contains("sort-by-commitment")) commitment = text;
    });

    const descEl = document.querySelector(
      ".posting-page .content, .posting-description",
    );
    const description = descEl?.innerHTML ?? "";

    const uuidMatch = window.location.pathname.match(
      /\/([a-f0-9-]{36})/,
    );

    return {
      title,
      company,
      description,
      location,
      locationType: inferLocationType(location),
      url: window.location.href,
      postedAt: null,
      jobType: parseJobType(commitment),
      salaryMin: null,
      salaryMax: null,
      currency: null,
      skills: [],
      externalId: uuidMatch?.[1] ?? null,
      source: "LEVER",
    };
  },
};
