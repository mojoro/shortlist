import type { Extractor, ExtractedJob } from "../../types";
import { inferLocationType, parseSalaryFromText } from "./utils";

function parseSalaryRange(text: string | undefined): {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
} {
  return parseSalaryFromText(text);
}

function extractLinkedInDate(text: string | null): string | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  const match = lower.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case "minute":
      now.setMinutes(now.getMinutes() - amount);
      break;
    case "hour":
      now.setHours(now.getHours() - amount);
      break;
    case "day":
      now.setDate(now.getDate() - amount);
      break;
    case "week":
      now.setDate(now.getDate() - amount * 7);
      break;
    case "month":
      now.setMonth(now.getMonth() - amount);
      break;
  }

  return now.toISOString();
}

function extractLinkedInSkills(): string[] {
  const skills: string[] = [];
  document
    .querySelectorAll(".job-details-skill-match-status-list li span")
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text) skills.push(text);
    });
  return skills;
}

export const linkedinExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?linkedin\.com\/jobs\/view\//,

  extract(): ExtractedJob | null {
    const title =
      document
        .querySelector(
          ".job-details-jobs-unified-top-card__job-title h1",
        )
        ?.textContent?.trim() ??
      document.querySelector(".top-card-layout__title")?.textContent?.trim();

    const company =
      document
        .querySelector(
          ".job-details-jobs-unified-top-card__company-name a",
        )
        ?.textContent?.trim() ??
      document
        .querySelector(".topcard__org-name-link")
        ?.textContent?.trim();

    if (!title || !company) return null;

    const location =
      document
        .querySelector(
          ".job-details-jobs-unified-top-card__bullet",
        )
        ?.textContent?.trim() ??
      document
        .querySelector(".topcard__flavor--bullet")
        ?.textContent?.trim() ??
      null;

    const workplaceType =
      document
        .querySelector(
          ".job-details-jobs-unified-top-card__workplace-type",
        )
        ?.textContent?.trim() ?? null;

    const locationType =
      workplaceType?.toLowerCase().includes("remote")
        ? "REMOTE" as const
        : workplaceType?.toLowerCase().includes("hybrid")
          ? "HYBRID" as const
          : workplaceType?.toLowerCase().includes("on-site")
            ? "ONSITE" as const
            : inferLocationType(location);

    const salaryText =
      document
        .querySelector(
          ".job-details-jobs-unified-top-card__job-insight--highlight span",
        )
        ?.textContent?.trim();
    const salary = parseSalaryRange(salaryText);

    const descEl =
      document.querySelector(".jobs-description__content") ??
      document.querySelector(".show-more-less-html__markup");
    const description = descEl?.innerHTML ?? "";

    const postedText =
      document
        .querySelector(
          ".job-details-jobs-unified-top-card__posted-date",
        )
        ?.textContent?.trim() ?? null;
    const postedAt = extractLinkedInDate(postedText);

    const skills = extractLinkedInSkills();

    const idMatch = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
    const cleanUrl = idMatch
      ? `https://www.linkedin.com/jobs/view/${idMatch[1]}/`
      : window.location.origin + window.location.pathname;

    return {
      title,
      company,
      description,
      location,
      locationType,
      url: cleanUrl,
      postedAt,
      jobType: null,
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      currency: salary.currency,
      skills,
      externalId: idMatch?.[1] ?? null,
      source: "LINKEDIN",
    };
  },
};
