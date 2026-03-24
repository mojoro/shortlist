import type { ExtractResult, ImportPayload } from "../types";

const PROD_URL = "https://shortlist.johnmoorman.com";
const DEV_URL = "http://localhost:3000";

interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/** Resolve the API base URL. Checks storage override first, then auto-detects localhost. */
export async function getBaseUrl(): Promise<string> {
  try {
    const result = await chrome.storage.local.get("apiBaseUrl");
    if (result.apiBaseUrl) return result.apiBaseUrl as string;
  } catch {}

  // Auto-detect: if localhost is reachable, use it (dev mode)
  try {
    const res = await fetch(`${DEV_URL}/api/extension/status`, {
      credentials: "include",
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok || res.status === 401) return DEV_URL;
  } catch {}

  return PROD_URL;
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

export function checkAuth() {
  return apiCall<AuthStatus>("/api/extension/status");
}

export function fetchProfiles() {
  return apiCall<ProfilesResponse>("/api/extension/profiles");
}

export function extractJob(payload: { input: string; profileId: string }) {
  return apiCall<ExtractResult>("/api/jobs/extract", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function importJob(payload: ImportPayload & { profileId: string }) {
  return apiCall<{ job: { id: string } }>("/api/jobs/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
