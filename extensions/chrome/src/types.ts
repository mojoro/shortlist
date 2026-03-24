// ── Import history ────────────────────────────────────────────────────────

export interface ImportRecord {
  jobId: string;
  title: string;
  company: string;
  source: string;
  importedAt: string;
  profileName: string;
}

// ── Page content collected by content script ─────────────────────────────

export interface PageContent {
  url: string;
  html: string;
  title: string;
}

// ── Extract endpoint response ────────────────────────────────────────────

export interface ExtractResult {
  title: string;
  company: string;
  description: string;
  location: string | null;
  locationType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  url: string | null;
  postedAt: string | null;
  jobType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  skills: string[];
}

// ── Import endpoint payload ──────────────────────────────────────────────

export interface ImportPayload {
  originalInput: string;
  title: string;
  company: string;
  description: string;
  location?: string | null;
  locationType?: string | null;
  url?: string | null;
  postedAt?: string | null;
  jobType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  skills?: string[];
}

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

  // Page content (popup -> content script)
  | { type: "GET_PAGE_CONTENT" }
  | { type: "PAGE_CONTENT"; content: PageContent }

  // Extract (popup -> service worker -> server)
  | { type: "EXTRACT_JOB"; html: string; profileId: string }
  | { type: "EXTRACT_RESULT"; ok: boolean; data?: ExtractResult; error?: string }

  // Import (popup -> service worker -> server)
  | { type: "IMPORT_JOB"; profileId: string; profileName: string; data: ImportPayload }
  | { type: "IMPORT_RESULT"; ok: boolean; jobId?: string; error?: string }

  // Import history
  | { type: "GET_IMPORT_HISTORY" }
  | { type: "IMPORT_HISTORY"; history: ImportRecord[] };
