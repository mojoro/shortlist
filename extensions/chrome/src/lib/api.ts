import type { SelectorMap, ExtractedJob } from "../types";

const PROD_URL = "https://shortlist.johnmoorman.com";
const DEV_URL = "http://localhost:3000";

interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/** Resolve the API base URL from extension storage, defaulting to production. */
export async function getBaseUrl(): Promise<string> {
  try {
    const result = await chrome.storage.local.get("apiBaseUrl");
    return (result.apiBaseUrl as string) || PROD_URL;
  } catch {
    return PROD_URL;
  }
}

/** Generic API call that includes cookies for Clerk session auth. */
export async function apiCall<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const baseUrl = await getBaseUrl();

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
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
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Could not reach Shortlist. Check your internet connection.",
    };
  }
}

// ── Typed API helpers ────────────────────────────────────────────────────

interface AuthStatus {
  authenticated: boolean;
  userId?: string;
}

interface ProfilesResponse {
  profiles: Array<{ id: string; name: string; isActive: boolean }>;
}

interface ImportResponse {
  job: { id: string };
}

interface ExtractResponse {
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

export function checkAuth() {
  return apiCall<AuthStatus>("/api/extension/status");
}

export function fetchProfiles() {
  return apiCall<ProfilesResponse>("/api/extension/profiles");
}

export function importJob(payload: {
  profileId: string;
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
  source?: string;
  externalId?: string | null;
}) {
  const { externalId, ...rest } = payload;
  const body = externalId != null ? { ...rest, externalId } : rest;
  return apiCall<ImportResponse>("/api/jobs/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function extractJob(payload: { input: string; profileId: string }) {
  return apiCall<ExtractResponse>("/api/jobs/extract", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function identifySelectors(payload: {
  skeleton: string;
  profileId: string;
}): Promise<ApiResponse<{ selectors: SelectorMap }>> {
  return apiCall("/api/jobs/extract/identify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function normalizeExtraction(payload: {
  title: string | null;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  jobTypeText: string | null;
  skillsText: string | null;
  descriptionHtml: string;
  postedDateText: string | null;
  url: string;
  profileId: string;
}): Promise<ApiResponse<ExtractedJob>> {
  return apiCall("/api/jobs/extract/normalize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { DEV_URL, PROD_URL };
