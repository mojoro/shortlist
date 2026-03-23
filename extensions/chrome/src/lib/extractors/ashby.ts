import type { Extractor, ExtractedJob } from "../../types";
import { inferLocationType, parseSalaryFromText } from "./utils";

export const ashbyExtractor: Extractor = {
  matches: /^https?:\/\/jobs\.ashbyhq\.com\/[^/]+\/[a-f0-9-]+/,

  extract(): ExtractedJob | null {
    const title =
      document
        .querySelector("h1.ashby-job-posting-brief-title")
        ?.textContent?.trim() ??
      document
        .querySelector("[data-testid='job-title']")
        ?.textContent?.trim();

    const company =
      document
        .querySelector(".ashby-job-posting-brief-company-name")
        ?.textContent?.trim() ??
      document
        .querySelector("[data-testid='company-name']")
        ?.textContent?.trim() ??
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") ??
      "";

    if (!title || !company) return null;

    const location =
      document
        .querySelector(".ashby-job-posting-brief-location")
        ?.textContent?.trim() ??
      document
        .querySelector("[data-testid='job-location']")
        ?.textContent?.trim() ??
      null;

    const compensationText =
      document
        .querySelector(".ashby-job-posting-compensation")
        ?.textContent?.trim() ??
      document
        .querySelector("[data-testid='compensation']")
        ?.textContent?.trim();
    const salary = parseSalaryFromText(compensationText);

    const descEl =
      document.querySelector(".ashby-job-posting-description") ??
      document.querySelector("[data-testid='job-description']");
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
      jobType: null,
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      currency: salary.currency,
      skills: [],
      externalId: uuidMatch?.[1] ?? null,
      source: "ASHBY",
    };
  },
};
