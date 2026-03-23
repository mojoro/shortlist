import type { Extractor, ExtractedJob } from "../../types";
import { inferLocationType, parseJobType, parseSalaryFromText } from "./utils";

function cleanIndeedUrl(): string {
  const url = new URL(window.location.href);
  const jk = url.searchParams.get("jk");
  if (jk) {
    return `${url.origin}${url.pathname}?jk=${jk}`;
  }
  return `${url.origin}${url.pathname}`;
}

export const indeedExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?indeed\.com\/viewjob/,

  extract(): ExtractedJob | null {
    const title =
      document
        .querySelector(".jobsearch-JobInfoHeader-title")
        ?.textContent?.trim() ??
      document
        .querySelector(
          "[data-testid='jobsearch-JobInfoHeader-title'] span",
        )
        ?.textContent?.trim();

    const company =
      document
        .querySelector("[data-testid='inlineHeader-companyName'] a")
        ?.textContent?.trim() ??
      document
        .querySelector(".jobsearch-CompanyInfoContainer a")
        ?.textContent?.trim();

    if (!title || !company) return null;

    const location =
      document
        .querySelector("[data-testid='inlineHeader-companyLocation']")
        ?.textContent?.trim() ??
      document
        .querySelector(
          ".jobsearch-CompanyInfoContainer .companyLocation",
        )
        ?.textContent?.trim() ??
      null;

    const salaryText =
      document
        .querySelector("#salaryInfoAndJobType span")
        ?.textContent?.trim() ??
      document
        .querySelector(
          "[data-testid='attribute_snippet_testid'] span",
        )
        ?.textContent?.trim();
    const salary = parseSalaryFromText(salaryText);

    const descEl =
      document.querySelector("#jobDescriptionText") ??
      document.querySelector(".jobsearch-JobComponent-description");
    const description = descEl?.innerHTML ?? "";

    const jobTypeText =
      document
        .querySelector(".jobsearch-JobMetadataHeader-item")
        ?.textContent?.trim() ?? null;

    const jk = new URL(window.location.href).searchParams.get("jk");

    return {
      title,
      company,
      description,
      location,
      locationType: inferLocationType(location),
      url: cleanIndeedUrl(),
      postedAt: null,
      jobType: parseJobType(jobTypeText),
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      currency: salary.currency,
      skills: [],
      externalId: jk ?? null,
      source: "INDEED",
    };
  },
};
