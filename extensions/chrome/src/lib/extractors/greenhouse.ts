import type { Extractor, ExtractedJob } from "../../types";
import { inferLocationType } from "./utils";

export const greenhouseExtractor: Extractor = {
  matches:
    /^https?:\/\/(boards|jobs)\.greenhouse\.io\/[^/]+\/(jobs\/\d+|embed\/job_app)/,

  extract(): ExtractedJob | null {
    const title =
      document
        .querySelector(".app-title, #header .company-name + h1")
        ?.textContent?.trim() ??
      document.querySelector("h1")?.textContent?.trim();

    const company =
      document
        .querySelector(".company-name, #header .company-name")
        ?.textContent?.trim() ??
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") ??
      "";

    if (!title || !company) return null;

    const location =
      document
        .querySelector(".location, .body--metadata--location")
        ?.textContent?.trim() ?? null;

    const descEl = document.querySelector("#content, .body--content");
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
      salaryMin: null,
      salaryMax: null,
      currency: null,
      skills: [],
      source: "GREENHOUSE",
    };
  },
};
