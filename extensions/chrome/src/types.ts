// ── Import history ────────────────────────────────────────────────────────

export interface ImportRecord {
  jobId: string;
  title: string;
  company: string;
  source: string;
  importedAt: string;
  profileName: string;
}

// ── Extracted job data ────────────────────────────────────────────────────

export interface ExtractedJob {
  title: string;
  company: string;
  description: string;
  location: string | null;
  locationType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  url: string;
  postedAt: string | null;
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
  externalId: string | null;
  source:
    | "LINKEDIN"
    | "GREENHOUSE"
    | "LEVER"
    | "ASHBY"
    | "INDEED"
    | "USAJOBS"
    | "CUSTOM";
}

// ── Selector map for AI-identified fields ────────────────────────────────

export interface SelectorMap {
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  jobType: string | null;
  skills: string | null;
  description: string | null;
  postedDate: string | null;
}

// ── Raw extraction before normalization ──────────────────────────────────

export interface RawExtraction {
  title: string | null;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  jobTypeText: string | null;
  skillsText: string | null;
  descriptionHtml: string;
  postedDateText: string | null;
  url: string;
}

// ── Extraction result variants ───────────────────────────────────────────

export type ExtractionResult =
  | { type: "extracted"; raw: RawExtraction }
  | { type: "needs_identification"; skeleton: string; url: string; domain: string }
  | { type: "none" };

// ── Chrome message types ─────────────────────────────────────────────────

export type Message =
  // Auth
  | { type: "GET_AUTH_STATUS" }
  | { type: "AUTH_STATUS"; authenticated: boolean }

  // Profiles
  | { type: "GET_PROFILES" }
  | {
      type: "PROFILES";
      profiles: Array<{ id: string; name: string; isActive: boolean }>;
    }

  // Extraction (popup -> content script)
  | { type: "EXTRACT" }
  | { type: "EXTRACTED"; result: ExtractionResult }

  // Two-step AI extraction
  | { type: "IDENTIFY_SELECTORS"; skeleton: string; profileId: string }
  | { type: "SELECTORS_IDENTIFIED"; selectors: SelectorMap }
  | { type: "APPLY_SELECTORS"; selectors: SelectorMap }
  | { type: "SELECTORS_APPLIED"; result: ExtractionResult }
  | { type: "NORMALIZE_AND_IMPORT"; raw: RawExtraction; profileId: string; profileName: string }
  | { type: "IMPORT_COMPLETE"; jobId: string }

  // Import (structured job from extractor)
  | { type: "IMPORT_JOB"; profileId: string; profileName: string; job: ExtractedJob }
  | { type: "IMPORT_RESULT"; ok: boolean; jobId?: string; error?: string }

  // Import history
  | { type: "GET_IMPORT_HISTORY" }
  | { type: "IMPORT_HISTORY"; history: ImportRecord[] };
