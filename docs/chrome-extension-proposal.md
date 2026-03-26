# Chrome Extension Proposal: Shortlist Job Importer

## 1. Overview

The Shortlist Chrome Extension lets users import job listings into their Shortlist feed while browsing any job board. Instead of switching to the Shortlist app, copying a URL, opening the import modal, and waiting for extraction, users click a single button on the job page itself. The extension extracts structured data from the page, sends it to the existing Shortlist API, and confirms the import in-place.

This complements the existing scraper pipeline (Greenhouse, Lever, Ashby) by covering sites that block server-side scraping (LinkedIn, Indeed, Glassdoor) and any ad-hoc job page the user encounters. It reuses the same `JobPool` + `Job` junction architecture and the same AI extraction endpoint, so imported jobs appear in the feed identically to scraped ones.

### Why a Chrome extension

- **Bypasses anti-scraping measures.** LinkedIn, Indeed, and Glassdoor all block server-side requests. A browser extension reads the page the user has already loaded -- no bot detection to evade.
- **Zero-friction import.** The current flow (copy URL, open Shortlist, paste into modal, wait for extraction, review, save) has six steps. The extension reduces this to one click plus a quick review.
- **Captures ephemeral listings.** Some job posts disappear quickly or require login to view. The extension captures the content while the user can see it.
- **Works on any site.** The generic fallback sends page content to the existing AI extraction endpoint, so even niche job boards work without a custom extractor.

---

## 2. User Flow

### Happy path (site with a dedicated extractor)

1. User browses to `linkedin.com/jobs/view/123456789`
2. Extension icon in the toolbar shows a badge indicating a supported job page was detected
3. User clicks the extension icon (or presses a keyboard shortcut)
4. Popup shows extracted fields: title, company, location, salary, etc. -- pre-filled from the page DOM
5. User picks which Shortlist profile to import into (dropdown, defaults to active profile)
6. User clicks "Import to Shortlist"
7. Popup shows a success confirmation with a link to view the job in Shortlist
8. The job appears in their feed with `feedStatus: NEW` and gets queued for AI analysis

### Happy path (unknown site, generic fallback)

1. User browses to any page with a job listing
2. User clicks the extension icon
3. Popup shows "We'll use AI to extract the job details" with a preview of the page title
4. User clicks "Extract & Import"
5. Extension sends the page HTML to `/api/jobs/extract`, which uses Claude Haiku to parse it
6. Popup shows extracted fields for review (same as the in-app import modal review phase)
7. User confirms, job is saved

### Edge cases

- **Already imported.** The API returns 409 (existing dedup check). Popup shows "You've already imported this listing" with a link to it.
- **Not logged in.** API returns 401. Popup shows "Sign in to Shortlist" with a link to the app.
- **Extraction failure.** Popup shows an error with a "Try pasting manually in Shortlist" fallback link that opens the in-app import modal.
- **No active profile.** API returns 404. Popup prompts the user to complete onboarding first.

---

## 3. Architecture

### Component model

```
+------------------------------------------------------+
|  Chrome Extension (Manifest V3)                      |
|                                                      |
|  +--------------+   +--------------+                 |
|  | Content       |   | Background   |                 |
|  | Script        |   | Service      |                 |
|  |               |   | Worker       |                 |
|  | - DOM access  |   | - Auth state |                 |
|  | - Extractors  |   | - API calls  |                 |
|  | - Page detect |   | - Badge mgmt |                 |
|  +------+-------+   +------+-------+                 |
|         |                   |                         |
|         |  chrome.runtime   |                         |
|         |  .sendMessage()   |                         |
|         +--------->---------+                         |
|                             |                         |
|  +--------------+           |  fetch()                |
|  | Popup UI     |-----------+                         |
|  | (React)      |           |                         |
|  +--------------+           v                         |
|                    +-----------------+                |
|                    | Shortlist API   |                |
|                    | (Next.js)       |                |
|                    +-----------------+                |
+------------------------------------------------------+
```

### Content script

Injected into supported job board pages. Responsibilities:

- **Page detection.** Checks the URL pattern to determine which extractor to use. Sends a message to the background service worker so it can update the toolbar badge.
- **DOM extraction.** Runs a site-specific extractor that reads structured data from the DOM (job title, company, location, description, etc.). Falls back to collecting the full page HTML for AI extraction.
- **No UI rendering.** The content script does not inject any visible UI into the page. All user interaction happens in the popup.

### Background service worker

The persistent (within session) coordinator. Responsibilities:

- **Auth state.** Stores the API token and active profile ID. Handles token refresh.
- **Badge management.** Updates the extension icon badge when a content script reports a supported job page.
- **API communication.** All fetch calls to the Shortlist API go through the service worker (content scripts cannot make cross-origin requests to the app domain without the service worker relaying them).
- **Keyboard shortcut handler.** Listens for the configurable import shortcut.

### Popup

A small React app rendered when the user clicks the extension icon. Responsibilities:

- **Profile selector.** Fetches the user's profiles and shows a dropdown.
- **Extraction preview.** Shows the fields extracted by the content script, allows quick edits.
- **Import trigger.** Sends the final payload to the background service worker for API submission.
- **Status feedback.** Shows loading, success, error, and "already imported" states.

---

## 4. Content Extraction

Each extractor is a function with the signature:

```typescript
// types.ts
export interface ExtractedJob {
  title: string;
  company: string;
  description: string;
  location: string | null;
  locationType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  url: string;
  postedAt: string | null;       // ISO date string YYYY-MM-DD
  jobType:
    | "FULL_TIME"
    | "PART_TIME"
    | "CONTRACT"
    | "FREELANCE"
    | "INTERNSHIP"
    | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  skills: string[];
  source: ScraperSource;          // maps to the existing enum
}

export type ScraperSource =
  | "LINKEDIN"
  | "GREENHOUSE"
  | "LEVER"
  | "ASHBY"
  | "INDEED"
  | "CUSTOM";

// extractor.ts
export interface Extractor {
  /** URL pattern that this extractor handles */
  matches: RegExp;
  /** Extract structured job data from the current page DOM */
  extract: () => ExtractedJob | null;
}
```

### 4.1 LinkedIn (`linkedin.com/jobs/view/*`)

LinkedIn job pages render structured data in the DOM that the content script can read directly.

```typescript
// extractors/linkedin.ts
import type { Extractor, ExtractedJob } from "../types";

export const linkedinExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?linkedin\.com\/jobs\/view\//,

  extract(): ExtractedJob | null {
    // LinkedIn renders job data in specific DOM elements
    const title = document.querySelector(
      ".job-details-jobs-unified-top-card__job-title h1, .top-card-layout__title"
    )?.textContent?.trim();

    const company = document.querySelector(
      ".job-details-jobs-unified-top-card__company-name a, .topcard__org-name-link"
    )?.textContent?.trim();

    if (!title || !company) return null;

    const location = document.querySelector(
      ".job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet"
    )?.textContent?.trim() ?? null;

    // Description is in a specific container
    const descEl = document.querySelector(
      ".jobs-description__content, .show-more-less-html__markup"
    );
    const description = descEl?.innerHTML ?? descEl?.textContent ?? "";

    // Salary info (when available)
    const salaryText = document.querySelector(
      ".job-details-jobs-unified-top-card__job-insight--highlight span"
    )?.textContent?.trim();
    const salaryParsed = parseSalaryRange(salaryText);

    // Work arrangement from the workplace type badge
    const workplaceType = document.querySelector(
      ".job-details-jobs-unified-top-card__workplace-type"
    )?.textContent?.trim()?.toLowerCase();
    const locationType = workplaceType?.includes("remote")
      ? "REMOTE"
      : workplaceType?.includes("hybrid")
        ? "HYBRID"
        : workplaceType?.includes("on-site")
          ? "ONSITE"
          : null;

    // Extract job ID from URL for stable deduplication
    const jobIdMatch = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
    const externalId = jobIdMatch?.[1] ?? window.location.href;

    return {
      title,
      company,
      description,
      location,
      locationType,
      url: window.location.href.split("?")[0],  // strip tracking params
      postedAt: extractLinkedInDate(),
      jobType: null,  // LinkedIn doesn't reliably expose this in DOM
      ...salaryParsed,
      skills: extractLinkedInSkills(),
      source: "LINKEDIN",
    };
  },
};

function parseSalaryRange(text: string | undefined): {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
} {
  if (!text) return { salaryMin: null, salaryMax: null, currency: null };

  // Matches patterns like "$120K - $180K/yr", "60.000 - 90.000 EUR"
  const match = text.match(
    /([EUR$GBP])\s*([\d,.]+)[Kk]?\s*[-to]+\s*[EUR$GBP]?\s*([\d,.]+)[Kk]?/
  );
  if (!match) return { salaryMin: null, salaryMax: null, currency: null };

  const currencyMap: Record<string, string> = { $: "USD", EUR: "EUR", GBP: "GBP" };
  const normalize = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ""));
    return text.toLowerCase().includes("k") ? n * 1000 : n;
  };

  return {
    salaryMin: normalize(match[2]),
    salaryMax: normalize(match[3]),
    currency: currencyMap[match[1]] ?? null,
  };
}

function extractLinkedInDate(): string | null {
  // LinkedIn shows relative dates like "2 weeks ago" -- best-effort conversion
  const timeEl = document.querySelector(
    ".job-details-jobs-unified-top-card__posted-date, .posted-time-ago__text"
  );
  const text = timeEl?.textContent?.trim()?.toLowerCase();
  if (!text) return null;

  const now = new Date();
  const match = text.match(/(\d+)\s*(day|week|month|hour|minute)/);
  if (!match) return null;

  const n = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith("day")) now.setDate(now.getDate() - n);
  else if (unit.startsWith("week")) now.setDate(now.getDate() - n * 7);
  else if (unit.startsWith("month")) now.setMonth(now.getMonth() - n);
  // hours/minutes -- just use today

  return now.toISOString().split("T")[0];
}

function extractLinkedInSkills(): string[] {
  // Skills sometimes appear in a "Skills" section or as tags
  const skillEls = document.querySelectorAll(
    ".job-details-skill-match-status-list li span, " +
    ".job-details-how-you-match__skills-item-subtitle"
  );
  return [...skillEls].map((el) => el.textContent?.trim() ?? "").filter(Boolean);
}
```

### 4.2 Greenhouse (`boards.greenhouse.io/*/jobs/*` and `jobs.greenhouse.io/*/jobs/*`)

```typescript
// extractors/greenhouse.ts
import type { Extractor, ExtractedJob } from "../types";

export const greenhouseExtractor: Extractor = {
  matches:
    /^https?:\/\/(boards|jobs)\.greenhouse\.io\/[^/]+\/(jobs\/\d+|embed\/job_app)/,

  extract(): ExtractedJob | null {
    const title =
      document.querySelector(".app-title, #header .company-name + h1")
        ?.textContent?.trim() ??
      document.querySelector("h1")?.textContent?.trim();

    // Company name is in the page header or board title
    const company =
      document.querySelector(".company-name, #header .company-name")
        ?.textContent?.trim() ??
      document.querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") ??
      "";

    if (!title || !company) return null;

    const location =
      document.querySelector(".location, .body--metadata--location")
        ?.textContent?.trim() ?? null;

    const descEl = document.querySelector("#content, .body--content");
    const description = descEl?.innerHTML ?? "";

    // Extract job ID from URL
    const idMatch = window.location.pathname.match(/\/jobs\/(\d+)/);
    const slug = window.location.pathname.split("/")[1]; // company slug

    return {
      title,
      company,
      description,
      location,
      locationType: inferLocationType(location),
      url: window.location.href,
      postedAt: null,  // Greenhouse pages don't show post dates
      jobType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      skills: [],
      source: "GREENHOUSE",
    };
  },
};
```

### 4.3 Lever (`jobs.lever.co/*/*`)

```typescript
// extractors/lever.ts
import type { Extractor, ExtractedJob } from "../types";

export const leverExtractor: Extractor = {
  matches: /^https?:\/\/jobs\.lever\.co\/[^/]+\/[a-f0-9-]+/,

  extract(): ExtractedJob | null {
    const title = document.querySelector(".posting-headline h2")
      ?.textContent?.trim();
    const company = document.querySelector(
      ".posting-headline .company-name, .main-header-logo img"
    )?.getAttribute("alt")
      ?? document.querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content")
      ?? "";

    if (!title || !company) return null;

    // Lever puts location and work type in category tags
    const categories = document.querySelectorAll(
      ".posting-categories .posting-category"
    );
    let location: string | null = null;
    let commitment: string | null = null;

    categories.forEach((el) => {
      const text = el.textContent?.trim() ?? "";
      const label = el.querySelector(
        ".sort-by-commitment, .sort-by-location, .sort-by-team"
      );
      if (label?.classList.contains("sort-by-location")) location = text;
      if (label?.classList.contains("sort-by-commitment")) commitment = text;
    });

    const descEl = document.querySelector(
      ".posting-page .content, .posting-description"
    );
    const description = descEl?.innerHTML ?? "";

    // Job ID from URL
    const idMatch = window.location.pathname.match(
      /\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/
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
      source: "LEVER",
    };
  },
};
```

### 4.4 Ashby (`jobs.ashbyhq.com/*/*`)

```typescript
// extractors/ashby.ts
import type { Extractor, ExtractedJob } from "../types";

export const ashbyExtractor: Extractor = {
  matches: /^https?:\/\/jobs\.ashbyhq\.com\/[^/]+\/[a-f0-9-]+/,

  extract(): ExtractedJob | null {
    const title = document.querySelector(
      "h1.ashby-job-posting-brief-title, [data-testid='job-title']"
    )?.textContent?.trim();

    const company = document.querySelector(
      ".ashby-job-posting-brief-company-name, [data-testid='company-name']"
    )?.textContent?.trim()
      ?? document.querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content")
      ?? "";

    if (!title || !company) return null;

    const location = document.querySelector(
      ".ashby-job-posting-brief-location, [data-testid='job-location']"
    )?.textContent?.trim() ?? null;

    // Ashby sometimes shows compensation
    const compensationEl = document.querySelector(
      ".ashby-job-posting-compensation, [data-testid='compensation']"
    );
    const compensationText = compensationEl?.textContent?.trim();

    const descEl = document.querySelector(
      ".ashby-job-posting-description, [data-testid='job-description']"
    );
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
      ...parseSalaryFromText(compensationText),
      skills: [],
      source: "ASHBY",
    };
  },
};
```

### 4.5 USAJobs (`usajobs.gov/job/*`)

```typescript
// extractors/usajobs.ts
import type { Extractor, ExtractedJob } from "../types";

export const usajobsExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?usajobs\.gov\/job\//,

  extract(): ExtractedJob | null {
    const title = document.querySelector(
      "#job-title, .usajobs-joa-banner__title h1"
    )?.textContent?.trim();

    // USAJobs shows the agency as the "company"
    const company = document.querySelector(
      "#agency-name, .usajobs-joa-banner__agency"
    )?.textContent?.trim() ?? "U.S. Government";

    if (!title) return null;

    const location = document.querySelector(
      "#locations, .usajobs-joa-locations"
    )?.textContent?.trim() ?? null;

    // Salary is clearly structured on USAJobs
    const salaryText = document.querySelector(
      "#salary-range, .usajobs-joa-summary__salary"
    )?.textContent?.trim();
    const salaryMatch = salaryText?.match(
      /\$([\d,]+)\s*[-to]+\s*\$([\d,]+)/
    );

    // GS grade / pay scale
    const gradeText = document.querySelector(
      "#grade, .usajobs-joa-summary__grade"
    )?.textContent?.trim();

    const descEl = document.querySelector(
      "#duties, .usajobs-joa-duties, #qualifications"
    );
    const description = descEl?.innerHTML ?? document.body.innerHTML;

    // USAJobs control number from URL
    const controlMatch = window.location.pathname.match(/\/job\/(\d+)/);

    // Telework eligibility
    const teleworkEl = document.querySelector(
      ".usajobs-joa-summary__telework, #telework"
    );
    const teleworkText = teleworkEl?.textContent?.trim()?.toLowerCase() ?? "";
    const locationType = teleworkText.includes("remote")
      ? "REMOTE"
      : teleworkText.includes("telework") || teleworkText.includes("hybrid")
        ? "HYBRID"
        : "ONSITE";

    // Job type from appointment type
    const appointmentEl = document.querySelector(
      ".usajobs-joa-summary__appointment-type, #appointment-type"
    );
    const appointmentText =
      appointmentEl?.textContent?.trim()?.toLowerCase() ?? "";
    const jobType = appointmentText.includes("permanent")
      ? "FULL_TIME"
      : appointmentText.includes("temporary") ||
          appointmentText.includes("term")
        ? "CONTRACT"
        : appointmentText.includes("internship")
          ? "INTERNSHIP"
          : "FULL_TIME";

    return {
      title: gradeText ? `${title} (${gradeText})` : title,
      company,
      description,
      location,
      locationType,
      url: window.location.href,
      postedAt: extractUsajobsDate(),
      jobType,
      salaryMin: salaryMatch
        ? parseInt(salaryMatch[1].replace(/,/g, ""), 10)
        : null,
      salaryMax: salaryMatch
        ? parseInt(salaryMatch[2].replace(/,/g, ""), 10)
        : null,
      currency: "USD",
      skills: extractUsajobsSkills(),
      source: "CUSTOM", // No USAJOBS enum value yet; use CUSTOM
    };
  },
};

function extractUsajobsDate(): string | null {
  const openDateEl = document.querySelector(
    ".usajobs-joa-summary__open-date, #open-date"
  );
  const text = openDateEl?.textContent?.trim();
  if (!text) return null;
  // USAJobs dates are typically "MM/DD/YYYY"
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : null;
}

function extractUsajobsSkills(): string[] {
  // Qualifications section often lists required skills
  const qualEl = document.querySelector("#qualifications");
  if (!qualEl) return [];
  // Extract from list items in qualifications
  const items = qualEl.querySelectorAll("li");
  return [...items]
    .map((li) => li.textContent?.trim() ?? "")
    .filter((t) => t.length > 5 && t.length < 100)
    .slice(0, 10);
}
```

### 4.6 Indeed (`indeed.com/viewjob?jk=*`)

```typescript
// extractors/indeed.ts
import type { Extractor, ExtractedJob } from "../types";

export const indeedExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?indeed\.com\/viewjob/,

  extract(): ExtractedJob | null {
    const title = document.querySelector(
      ".jobsearch-JobInfoHeader-title, " +
        "[data-testid='jobsearch-JobInfoHeader-title'] span"
    )?.textContent?.trim();

    const company = document.querySelector(
      "[data-testid='inlineHeader-companyName'] a, " +
        ".jobsearch-CompanyInfoContainer a"
    )?.textContent?.trim();

    if (!title || !company) return null;

    const location =
      document.querySelector(
        "[data-testid='inlineHeader-companyLocation'], " +
          ".jobsearch-CompanyInfoContainer .companyLocation"
      )?.textContent?.trim() ?? null;

    // Salary (Indeed shows this prominently when available)
    const salaryEl = document.querySelector(
      "#salaryInfoAndJobType span, " +
        "[data-testid='attribute_snippet_testid'] span"
    );
    const salaryText = salaryEl?.textContent?.trim();

    const descEl = document.querySelector(
      "#jobDescriptionText, .jobsearch-JobComponent-description"
    );
    const description = descEl?.innerHTML ?? "";

    // Job type from metadata
    const jobTypeEl = document.querySelector(
      ".jobsearch-JobMetadataHeader-item, " +
        "[data-testid='attribute_snippet_testid']"
    );
    const jobTypeText = jobTypeEl?.textContent?.trim()?.toLowerCase() ?? "";

    return {
      title,
      company,
      description,
      location,
      locationType: inferLocationType(location),
      url: window.location.href.split("&")[0], // clean tracking params
      postedAt: null,
      jobType: parseJobType(jobTypeText),
      ...parseSalaryFromText(salaryText),
      skills: [],
      source: "INDEED",
    };
  },
};
```

### 4.7 Glassdoor (`glassdoor.com/job-listing/*`)

```typescript
// extractors/glassdoor.ts
import type { Extractor, ExtractedJob } from "../types";

export const glassdoorExtractor: Extractor = {
  matches: /^https?:\/\/(www\.)?glassdoor\.(com|co\.\w+)\/job-listing\//,

  extract(): ExtractedJob | null {
    // Glassdoor uses heavy React rendering; target stable selectors
    const title = document.querySelector(
      "[data-test='job-title'], .e1tk4kwz5"
    )?.textContent?.trim();

    const company = document.querySelector(
      "[data-test='employer-name'], .e1tk4kwz4"
    )?.textContent?.trim();

    if (!title || !company) return null;

    const location =
      document.querySelector("[data-test='location'], .e1tk4kwz1")
        ?.textContent?.trim() ?? null;

    const descEl = document.querySelector(
      ".jobDescriptionContent, [data-test='job-description']"
    );
    const description = descEl?.innerHTML ?? "";

    const salaryEl = document.querySelector(
      "[data-test='detailSalary'], .e1wijj240"
    );
    const salaryText = salaryEl?.textContent?.trim();

    return {
      title,
      company,
      description,
      location,
      locationType: inferLocationType(location),
      url: window.location.href,
      postedAt: null,
      jobType: null,
      ...parseSalaryFromText(salaryText),
      skills: [],
      source: "CUSTOM", // No GLASSDOOR enum value; use CUSTOM
    };
  },
};
```

### 4.8 Generic fallback

When no site-specific extractor matches, the extension collects the page content and sends it to the existing `/api/jobs/extract` endpoint for AI-powered extraction.

```typescript
// extractors/generic.ts

export function collectPageContent(): {
  url: string;
  html: string;
  title: string;
  meta: Record<string, string>;
} {
  // Collect useful meta tags
  const meta: Record<string, string> = {};
  document.querySelectorAll("meta[property], meta[name]").forEach((el) => {
    const key =
      el.getAttribute("property") ?? el.getAttribute("name") ?? "";
    const value = el.getAttribute("content") ?? "";
    if (key && value) meta[key] = value;
  });

  // Get the main content area, or fall back to body
  const mainEl =
    document.querySelector("main") ??
    document.querySelector("article") ??
    document.querySelector("[role='main']") ??
    document.body;

  // Strip scripts, styles, navs, footers to reduce noise
  const clone = mainEl.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("script, style, nav, footer, header, iframe, noscript")
    .forEach((el) => el.remove());

  return {
    url: window.location.href,
    html: clone.innerHTML.slice(0, 50000), // match the 50k limit in extractJobSchema
    title: document.title,
    meta,
  };
}
```

### Extractor registry and dispatch

```typescript
// extractors/index.ts
import { linkedinExtractor } from "./linkedin";
import { greenhouseExtractor } from "./greenhouse";
import { leverExtractor } from "./lever";
import { ashbyExtractor } from "./ashby";
import { usajobsExtractor } from "./usajobs";
import { indeedExtractor } from "./indeed";
import { glassdoorExtractor } from "./glassdoor";
import { collectPageContent } from "./generic";
import type { Extractor, ExtractedJob } from "../types";

const extractors: Extractor[] = [
  linkedinExtractor,
  greenhouseExtractor,
  leverExtractor,
  ashbyExtractor,
  usajobsExtractor,
  indeedExtractor,
  glassdoorExtractor,
];

export type ExtractionResult =
  | { type: "structured"; data: ExtractedJob }
  | {
      type: "generic";
      url: string;
      html: string;
      title: string;
      meta: Record<string, string>;
    }
  | { type: "none" };

export function extractFromPage(): ExtractionResult {
  const url = window.location.href;

  for (const extractor of extractors) {
    if (extractor.matches.test(url)) {
      const data = extractor.extract();
      if (data) return { type: "structured", data };
      // Extractor matched but failed to parse -- fall through to generic
      break;
    }
  }

  // Generic fallback: collect raw page content for AI extraction
  const content = collectPageContent();
  if (content.html.length < 100) return { type: "none" };

  return { type: "generic", ...content };
}
```

### Shared utility functions

```typescript
// extractors/utils.ts

export function inferLocationType(
  location: string | null
): "REMOTE" | "HYBRID" | "ONSITE" | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  if (lower.includes("remote")) return "REMOTE";
  if (lower.includes("hybrid")) return "HYBRID";
  // Don't assume ONSITE -- only return it if explicitly stated
  return null;
}

export function parseJobType(
  text: string | null
):
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "FREELANCE"
  | "INTERNSHIP"
  | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("full")) return "FULL_TIME";
  if (lower.includes("part")) return "PART_TIME";
  if (lower.includes("contract") || lower.includes("temporary"))
    return "CONTRACT";
  if (lower.includes("freelance")) return "FREELANCE";
  if (lower.includes("intern")) return "INTERNSHIP";
  return null;
}

export function parseSalaryFromText(text: string | undefined): {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
} {
  if (!text) return { salaryMin: null, salaryMax: null, currency: null };

  const currencyMap: Record<string, string> = {
    $: "USD",
    EUR: "EUR",
    GBP: "GBP",
    CHF: "CHF",
  };

  // Match patterns: "$120K - $180K", "60,000 - 90,000 EUR",
  // "$120,000-$180,000/yr"
  const match = text.match(
    /([EUR$GBP]|CHF)?\s*([\d,.]+)\s*[Kk]?\s*[-to]+\s*[EUR$GBP]?\s*([\d,.]+)\s*[Kk]?\s*(?:\/?\s*(?:yr|year|annum|pa))?\s*([EUR$GBP]|CHF|USD)?/
  );
  if (!match) return { salaryMin: null, salaryMax: null, currency: null };

  const currencySymbol = match[1] ?? match[4] ?? "";
  const currency = currencyMap[currencySymbol] ?? currencySymbol || null;

  const normalize = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ""));
    return text.toLowerCase().includes("k") && n < 1000 ? n * 1000 : n;
  };

  return {
    salaryMin: normalize(match[2]),
    salaryMax: normalize(match[3]),
    currency,
  };
}
```

---

## 5. Authentication

### Recommended approach: Clerk session cookie sharing

The Shortlist app uses Clerk for authentication. Clerk stores its session token in an `__clerk_db_jwt` or `__session` cookie scoped to the app domain. The extension can leverage this existing session.

**How it works:**

1. The extension's background service worker makes `fetch()` calls to the Shortlist API origin (e.g., `https://shortlist.johnmoorman.com/api/...`).
2. Chrome automatically includes cookies for that domain on fetch requests made from the extension, provided the extension has `host_permissions` for the app domain.
3. Clerk middleware on the server validates the session cookie as usual -- the extension request is indistinguishable from a browser tab request.

**Advantages:**

- Zero additional auth infrastructure. No API keys to generate, store, or rotate.
- Session lifecycle (expiry, refresh, logout) is handled by Clerk automatically.
- No secrets stored in extension storage (which is inspectable via DevTools).

**Tradeoffs:**

- Requires the user to be signed in to Shortlist in at least one browser tab (or to have an unexpired Clerk session cookie).
- If the user clears cookies, the extension stops working until they sign in again.

**Implementation:**

```typescript
// background/api.ts
const API_BASE = "https://shortlist.johnmoorman.com";  // from extension config

export async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include", // sends cookies for API_BASE domain
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => null);

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        data: null,
        error: "Please sign in to Shortlist to import jobs.",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: data?.error ?? `Request failed (${res.status})`,
      };
    }

    return { ok: true, status: res.status, data, error: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Could not reach Shortlist. Check your internet connection.",
    };
  }
}
```

### Alternative considered: API key approach

Generate a long-lived API key per user, stored in `chrome.storage.sync`. This would decouple the extension from the browser session. However, it requires building API key generation UI, a new auth middleware path, key rotation, and revocation -- significant infrastructure for no real user benefit. The cookie-sharing approach is simpler and more secure. The API key approach should only be revisited if/when Shortlist becomes a multi-tenant SaaS and wants to support third-party integrations.

---

## 6. API Integration

### Existing endpoints the extension uses directly

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/jobs/extract` | POST | AI extraction for generic fallback pages |
| `/api/jobs/import` | POST | Save structured job data to pool + feed |

Both endpoints already accept exactly what the extension produces. No schema changes needed.

### New endpoint: `GET /api/extension/profiles`

The extension needs to fetch the user's profiles so the popup can show a profile selector. The existing codebase doesn't expose a simple "list my profiles" endpoint -- profile data is loaded server-side in the dashboard layout.

```typescript
// src/app/api/extension/profiles/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const profiles = await prisma.profile.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ profiles });
}
```

### New endpoint: `GET /api/extension/status`

Health check that also confirms auth state. The popup calls this on open to determine whether to show the import UI or a "sign in" prompt.

```typescript
// src/app/api/extension/status/route.ts
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json({ authenticated: true, userId });
}
```

### Optional future endpoint: `POST /api/extension/import`

A combined extract-and-import endpoint that accepts raw page HTML and returns the created job, skipping the review step for users who want maximum speed. This would combine the logic of `/api/jobs/extract` and `/api/jobs/import` into one round trip. Not needed for MVP -- the two-step flow works fine.

### Middleware consideration

The new `/api/extension/*` routes are protected by Clerk middleware (they are not in the `isPublicRoute` list), so they automatically require authentication. No middleware changes needed.

### CORS

The extension makes requests from the extension origin (`chrome-extension://<id>`), not from the app domain. Clerk's middleware does not block cross-origin API requests as long as cookies are sent. However, if the server sets restrictive CORS headers, the extension's fetch calls may fail. The Shortlist API does not currently set CORS headers (Next.js API routes don't by default), which means the browser will allow the fetch from the extension context but block the response from being read. To fix this, add CORS headers for the extension origin.

Two options:

**Option A: Extension-specific CORS middleware (recommended for production)**

```typescript
// In middleware.ts or a dedicated CORS utility
// Only allow the specific extension ID
const EXTENSION_ORIGIN = "chrome-extension://abcdefghijklmnop"; // set after publishing

function withExtensionCORS(response: Response, origin: string): Response {
  if (origin === EXTENSION_ORIGIN) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return response;
}
```

**Option B: Broad pattern for development**

During development, allow any `chrome-extension://` origin. Tighten this before production.

---

## 7. Tech Stack

### Build tooling

| Tool | Why |
|---|---|
| **Vite** + `@crxjs/vite-plugin` | The standard for modern Manifest V3 extensions. Hot module reload for popup and content scripts during development. Handles manifest generation from a TypeScript source. |
| **TypeScript** | Matches the main Shortlist codebase. Strict mode. |
| **React 19** | For the popup UI only. Matches the main app. Small footprint -- the popup is a single view. |
| **Tailwind CSS v4** | For the popup UI. Matches the main app's design system. Reuse the same CSS custom properties for consistent theming. |

### Project structure

```
extension/
  src/
    manifest.ts             # Manifest V3 config (compiled by @crxjs/vite-plugin)
    content/
      index.ts              # Content script entry point
      extractors/
        index.ts            # Registry + dispatch
        linkedin.ts
        greenhouse.ts
        lever.ts
        ashby.ts
        usajobs.ts
        indeed.ts
        glassdoor.ts
        generic.ts
        utils.ts
    background/
      index.ts              # Service worker entry point
      api.ts                # Shortlist API client
      state.ts              # Auth + profile state management
    popup/
      index.html            # Popup entry HTML
      main.tsx              # React entry point
      App.tsx               # Main popup component
      components/
        ProfileSelector.tsx
        JobPreview.tsx
        ImportButton.tsx
        StatusMessage.tsx
    types.ts                # Shared types (ExtractedJob, etc.)
  vite.config.ts
  tsconfig.json
  package.json
  tailwind.config.ts
```

### Manifest V3

```typescript
// src/manifest.ts
import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Shortlist Job Importer",
  version: "1.0.0",
  description: "Import job listings into Shortlist with one click.",

  permissions: [
    "activeTab",  // access current tab content when user clicks the icon
    "storage",    // persist preferences (selected profile, etc.)
  ],

  host_permissions: [
    "https://shortlist.johnmoorman.com/*", // API calls with cookies
  ],

  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      16: "icons/icon-16.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
  },

  content_scripts: [
    {
      matches: [
        "*://*.linkedin.com/jobs/view/*",
        "*://boards.greenhouse.io/*/jobs/*",
        "*://jobs.greenhouse.io/*/jobs/*",
        "*://jobs.lever.co/*/*",
        "*://jobs.ashbyhq.com/*/*",
        "*://*.usajobs.gov/job/*",
        "*://*.indeed.com/viewjob*",
        "*://*.glassdoor.com/job-listing/*",
        "*://*.glassdoor.co.*/job-listing/*",
      ],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],

  // Keyboard shortcut for quick import
  commands: {
    import_job: {
      suggested_key: { default: "Alt+Shift+S" },
      description: "Import current page as a job listing",
    },
  },

  icons: {
    16: "icons/icon-16.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },
});
```

Note on `activeTab` vs broad host permissions for content scripts: The `content_scripts` field declares specific URL patterns where the content script runs automatically. For the generic fallback (any page), the user must click the extension icon, which triggers `activeTab` and allows the popup to request content from the current tab via `chrome.scripting.executeScript`. This avoids requesting `<all_urls>` permission, which would scare users during install.

---

## 8. MVP Scope

### Phase 1: Core import flow (build first)

- [ ] Extension scaffold: Vite + TypeScript + React popup + Manifest V3
- [ ] Background service worker with API client (cookie-based auth)
- [ ] Popup UI: auth check, profile selector, job preview, import button, status messages
- [ ] Content script with extractors for **LinkedIn** and **Greenhouse** (highest value targets)
- [ ] Generic fallback: collect page HTML, send to `/api/jobs/extract`
- [ ] New API endpoints: `GET /api/extension/profiles`, `GET /api/extension/status`
- [ ] CORS configuration for the extension origin
- [ ] Badge on the extension icon when a supported page is detected
- [ ] Keyboard shortcut (Alt+Shift+S)

### Phase 2: More extractors + polish

- [ ] Lever, Ashby, Indeed extractors
- [ ] USAJobs, Glassdoor extractors
- [ ] "Already imported" duplicate detection (show a checkmark badge instead of +)
- [ ] Popup shows import history (last 5 imports with links)
- [ ] Right-click context menu: "Import to Shortlist"
- [ ] Popup theme matches the Shortlist app theme (light/dark)

### Phase 3: Power features

- [ ] Batch import: "Import all jobs on this search results page" for LinkedIn/Indeed search results
- [ ] Quick notes: add a note to the job during import
- [ ] Auto-analyze: option to trigger AI analysis immediately after import
- [ ] Desktop notifications when analysis completes
- [ ] Import count badge on the Shortlist dashboard showing recent extension imports

### What is NOT in scope

- **A full job feed in the extension popup.** The extension is an import tool, not a job browser. Users open the Shortlist app to review their feed.
- **Resume tailoring from the extension.** Too complex for a popup. The tailor workflow stays in the app.
- **Extension for Firefox/Safari.** Chrome first. Port later if there is demand (Manifest V3 is largely compatible with Firefox's WebExtensions).

---

## 9. Security

### Permissions rationale

| Permission | Why | Risk |
|---|---|---|
| `activeTab` | Read the current tab's content when the user clicks the icon. Required for generic fallback extraction. | Low. Only activates on explicit user action. No persistent access. |
| `storage` | Persist the user's selected profile and preferences across sessions. | Low. Extension storage is sandboxed. No secrets stored here. |
| `host_permissions: shortlist domain` | Make authenticated API calls to the Shortlist backend with cookies. | Low. Scoped to one domain. |

### Permissions NOT requested

| Permission | Why not |
|---|---|
| `<all_urls>` | Too broad. The `content_scripts` field handles known job boards. `activeTab` handles everything else on user action. |
| `cookies` | Not needed. `fetch()` with `credentials: "include"` handles cookie attachment. The `cookies` permission would give read/write access to all cookies on the app domain, which is unnecessary. |
| `tabs` | Not needed. `activeTab` is sufficient. |
| `webRequest` | Not needed. The extension does not intercept or modify network requests. |

### Data handling

- **No credentials stored in extension storage.** Auth relies on Clerk session cookies managed by the browser.
- **Page content is not persisted locally.** Extracted HTML is sent to the API and discarded. The popup holds it in memory only during the active import flow.
- **The extension reads only job-related DOM elements.** Content scripts use targeted selectors, not `document.body.innerHTML` (except in the generic fallback, where the content is cleaned before sending).
- **All API communication is over HTTPS.** The `host_permissions` URL pattern uses `https://`.

### Content Security Policy

The extension's popup and service worker run in an isolated context with a strict default CSP. No inline scripts, no remote script loading. The React popup is bundled at build time.

---

## 10. Distribution

### Recommended: Chrome Web Store (public listing)

**Advantages:**

- Auto-updates. Users get new extractors and bug fixes without manual action.
- Trust signal. Users are more likely to install a verified extension.
- Required for Manifest V3 extensions in Chrome 127+ (Chrome is phasing out sideloading).

**Process:**

1. Create a Chrome Web Store developer account ($5 one-time fee).
2. Submit the extension for review (typically 1-3 business days).
3. Publish. Updates go through the same review process but are usually faster.

**Listing details:**

- Name: "Shortlist Job Importer"
- Category: Productivity
- Screenshots: popup in action on a LinkedIn job page, import success state
- Privacy policy: required by Chrome Web Store. A simple page explaining that the extension reads job listing content from the current page and sends it to the user's Shortlist account. No data is sold or shared with third parties.

### Development: Sideload (unpacked)

During development, load the extension unpacked via `chrome://extensions` > "Load unpacked" > select the `extension/dist` directory. This is the standard development workflow and does not require a Web Store account.

### Self-hosted alternative

If the Chrome Web Store review process is too slow during rapid iteration, self-host the `.crx` file and use Chrome's enterprise policy to allow the extension. This is only practical for personal use -- it will not work for other users without enterprise policy configuration. Not recommended for the SaaS launch.

---

## Appendix A: Message Flow (Content Script to API)

```
User clicks extension icon on linkedin.com/jobs/view/12345
    |
    v
Popup opens
    |
    +-- popup sends chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" })
    |       |
    |       v
    |   Background worker calls GET /api/extension/status
    |       |
    |       v
    |   Response: { authenticated: true }
    |
    +-- popup sends chrome.runtime.sendMessage({ type: "GET_PROFILES" })
    |       |
    |       v
    |   Background worker calls GET /api/extension/profiles
    |       |
    |       v
    |   Response: { profiles: [{ id: "clx...", name: "Frontend Berlin",
    |                             isActive: true }] }
    |
    +-- popup sends chrome.tabs.sendMessage(tabId, { type: "EXTRACT" })
    |       |
    |       v
    |   Content script runs linkedinExtractor.extract()
    |       |
    |       v
    |   Returns: { type: "structured", data: { title: "Frontend Engineer",
    |              company: "Acme", ... } }
    |
    v
Popup shows job preview with profile selector
    |
    v
User clicks "Import to Shortlist"
    |
    +-- popup sends chrome.runtime.sendMessage({
    |     type: "IMPORT_JOB",
    |     profileId: "clx...",
    |     job: { title: "Frontend Engineer", ... }
    |   })
    |       |
    |       v
    |   Background worker calls POST /api/jobs/import
    |       |
    |       v
    |   Response: { job: { id: "clx...", ... } }
    |
    v
Popup shows success: "Imported! View in Shortlist ->"
```

For the generic fallback, the flow adds one extra step: the background worker calls `POST /api/jobs/extract` first, shows the preview, and then proceeds to `/api/jobs/import` on confirmation.

## Appendix B: Extension <-> Service Worker Message Types

```typescript
// types.ts -- shared between popup, content script, and background

type Message =
  // Auth
  | { type: "GET_AUTH_STATUS" }
  | { type: "AUTH_STATUS"; authenticated: boolean }

  // Profiles
  | { type: "GET_PROFILES" }
  | {
      type: "PROFILES";
      profiles: { id: string; name: string; isActive: boolean }[];
    }

  // Extraction
  | { type: "EXTRACT" }
  | { type: "EXTRACTED"; result: ExtractionResult }

  // Import (structured -- extractor succeeded)
  | { type: "IMPORT_JOB"; profileId: string; job: ExtractedJob }
  | { type: "IMPORT_RESULT"; ok: boolean; jobId?: string; error?: string }

  // Import (generic fallback -- needs AI extraction first)
  | {
      type: "EXTRACT_AND_IMPORT";
      profileId: string;
      html: string;
      url: string;
    }
  | { type: "EXTRACT_AND_IMPORT_PREVIEW"; fields: ExtractedJob }
  | {
      type: "EXTRACT_AND_IMPORT_CONFIRM";
      profileId: string;
      job: ExtractedJob;
      originalInput: string;
    }
  | {
      type: "EXTRACT_AND_IMPORT_RESULT";
      ok: boolean;
      jobId?: string;
      error?: string;
    };
```

## Appendix C: Source Mapping

The extension needs to set the correct `source` value when importing jobs so they integrate cleanly with the existing `ScraperSource` enum and dedup logic.

| Site | `source` value | `externalId` derivation |
|---|---|---|
| LinkedIn | `LINKEDIN` | Job ID from URL path (`/jobs/view/12345` -> `"12345"`) |
| Greenhouse | `GREENHOUSE` | Job ID from URL path (`/jobs/67890` -> `"67890"`) + company slug prefix |
| Lever | `LEVER` | UUID from URL path |
| Ashby | `ASHBY` | UUID from URL path |
| Indeed | `INDEED` | `jk` query parameter from URL |
| USAJobs | `CUSTOM` | Control number from URL path |
| Glassdoor | `CUSTOM` | URL |
| Generic fallback | `CUSTOM` | URL or `crypto.randomUUID()` (same logic as existing import route) |

**Important:** For LinkedIn, Greenhouse, Lever, and Ashby, the extension uses the same `source` + `externalId` scheme as the server-side scrapers. This means if a job was already scraped by the daily cron, the `JobPool.upsert` in `/api/jobs/import` will find the existing pool entry (via `@@unique([source, externalId])`), and the import will create only the `Job` junction row. No duplicate pool entries.

However, the current `/api/jobs/import` route hardcodes `source: "CUSTOM"`. To enable this dedup behavior, the import endpoint needs a small change:

```typescript
// Proposed change to /api/jobs/import route.ts
// Add `source` and `externalId` to importJobSchema:
export const importJobSchema = z.object({
  // ... existing fields ...
  source: z
    .enum([
      "LINKEDIN",
      "GREENHOUSE",
      "LEVER",
      "ASHBY",
      "INDEED",
      "CUSTOM",
    ])
    .default("CUSTOM"),
  externalId: z.string().optional(), // override auto-derived ID
});
```

This is backward-compatible: the web app's import modal continues to work without changes because `source` defaults to `CUSTOM`.
