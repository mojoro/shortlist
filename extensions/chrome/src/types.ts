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

// ── Extractor interface ──────────────────────────────────────────────────

export interface Extractor {
  /** URL pattern this extractor handles */
  matches: RegExp;
  /** Extract structured job data from the current page DOM */
  extract: () => ExtractedJob | null;
}

// ── Extraction result variants ───────────────────────────────────────────

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

  // Import (structured job from extractor)
  | { type: "IMPORT_JOB"; profileId: string; profileName: string; job: ExtractedJob }
  | { type: "IMPORT_RESULT"; ok: boolean; jobId?: string; error?: string }

  // Import (generic fallback — needs AI extraction first)
  | {
      type: "EXTRACT_AND_IMPORT";
      profileId: string;
      profileName: string;
      html: string;
      url: string;
    }
  | {
      type: "EXTRACT_AND_IMPORT_RESULT";
      ok: boolean;
      jobId?: string;
      error?: string;
    }

  // Import history
  | { type: "GET_IMPORT_HISTORY" }
  | { type: "IMPORT_HISTORY"; history: ImportRecord[] };
