import type { Extractor, ExtractedJob } from "../../types";

function parseUsajobsSalary(text: string | null): {
  salaryMin: number | null;
  salaryMax: number | null;
} {
  if (!text) return { salaryMin: null, salaryMax: null };

  const match = text.match(
    /\$\s*([\d,]+(?:\.\d+)?)\s*[-\u2013to]+\s*\$\s*([\d,]+(?:\.\d+)?)/,
  );
  if (!match) return { salaryMin: null, salaryMax: null };

  return {
    salaryMin: parseFloat(match[1].replace(/,/g, "")),
    salaryMax: parseFloat(match[2].replace(/,/g, "")),
  };
}

function parseAppointmentType(
  text: string | null,
): "FULL_TIME" | "CONTRACT" | "INTERNSHIP" | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("intern")) return "INTERNSHIP";
  if (lower.includes("temporary") || lower.includes("term")) return "CONTRACT";
  if (lower.includes("permanent")) return "FULL_TIME";
  return null;
}

function parseUsajobsDate(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function extractUsajobsSkills(): string[] {
  const skills: string[] = [];
  const qualSection =
    document.querySelector("#qualifications") ??
    document.querySelector(".usajobs-joa-qualifications");
  if (!qualSection) return skills;

  qualSection.querySelectorAll("li").forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length < 100) skills.push(text);
  });
  return skills.slice(0, 20);
}

export const usajobsExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?usajobs\.gov\/job\//,

  extract(): ExtractedJob | null {
    let title =
      document.querySelector("#job-title")?.textContent?.trim() ??
      document
        .querySelector(".usajobs-joa-banner__title h1")
        ?.textContent?.trim();

    const company =
      document.querySelector("#agency-name")?.textContent?.trim() ??
      document
        .querySelector(".usajobs-joa-banner__agency")
        ?.textContent?.trim() ??
      "U.S. Government";

    if (!title) return null;

    const grade =
      document.querySelector("#grade")?.textContent?.trim() ??
      document
        .querySelector(".usajobs-joa-summary__grade")
        ?.textContent?.trim();
    if (grade) {
      const gsMatch = grade.match(/GS[- ]?\d+/i);
      if (gsMatch) title = `${title} (${gsMatch[0].toUpperCase()})`;
    }

    const location =
      document.querySelector("#locations")?.textContent?.trim() ??
      document
        .querySelector(".usajobs-joa-locations")
        ?.textContent?.trim() ??
      null;

    const salaryText =
      document.querySelector("#salary-range")?.textContent?.trim() ??
      document
        .querySelector(".usajobs-joa-summary__salary")
        ?.textContent?.trim();
    const salary = parseUsajobsSalary(salaryText ?? null);

    const telework =
      document
        .querySelector("#telework-eligible, .usajobs-joa-summary__telework")
        ?.textContent?.trim() ?? null;
    const locationType = telework?.toLowerCase().includes("yes")
      ? ("REMOTE" as const)
      : null;

    const appointmentText =
      document
        .querySelector(
          "#appointment-type, .usajobs-joa-summary__appointment-type",
        )
        ?.textContent?.trim() ?? null;
    const jobType = parseAppointmentType(appointmentText);

    const descEl =
      document.querySelector("#duties") ??
      document.querySelector(".usajobs-joa-duties") ??
      document.querySelector("#qualifications");
    const description = descEl?.innerHTML ?? "";

    const openDateText =
      document
        .querySelector("#opening-date, .usajobs-joa-summary__opening-date")
        ?.textContent?.trim() ?? null;
    const postedAt = parseUsajobsDate(openDateText);

    const skills = extractUsajobsSkills();

    return {
      title,
      company,
      description,
      location,
      locationType,
      url: window.location.href,
      postedAt,
      jobType,
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      currency: "USD",
      skills,
      source: "CUSTOM",
    };
  },
};
