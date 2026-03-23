import type { Extractor, ExtractedJob } from "../../types";
import { inferLocationType, parseSalaryFromText } from "./utils";

export const glassdoorExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?glassdoor\.(com|co\.\w+)\/job-listing\//,

  extract(): ExtractedJob | null {
    const title =
      document
        .querySelector("[data-test='job-title']")
        ?.textContent?.trim() ??
      document.querySelector(".e1tk4kwz5")?.textContent?.trim();

    const company =
      document
        .querySelector("[data-test='employer-name']")
        ?.textContent?.trim() ??
      document.querySelector(".e1tk4kwz4")?.textContent?.trim();

    if (!title || !company) return null;

    const location =
      document
        .querySelector("[data-test='location']")
        ?.textContent?.trim() ??
      document.querySelector(".e1tk4kwz1")?.textContent?.trim() ??
      null;

    const salaryText =
      document
        .querySelector("[data-test='detailSalary']")
        ?.textContent?.trim() ??
      document.querySelector(".e1wijj240")?.textContent?.trim();
    const salary = parseSalaryFromText(salaryText);

    const descEl =
      document.querySelector(".jobDescriptionContent") ??
      document.querySelector("[data-test='job-description']");
    const description = descEl?.innerHTML ?? "";

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
      source: "CUSTOM",
    };
  },
};
