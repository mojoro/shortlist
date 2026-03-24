import {
  checkAuth,
  fetchProfiles,
  importJob,
  identifySelectors,
  normalizeExtraction,
} from "../lib/api";
import type { Message, ExtractedJob, RawExtraction, ImportRecord } from "../types";

// ── Import history ──────────────────────────────────────────────────────

const MAX_HISTORY = 5;

async function saveImportRecord(record: ImportRecord): Promise<void> {
  const { importHistory = [] } = await chrome.storage.local.get("importHistory");
  const updated = [record, ...importHistory].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ importHistory: updated });
}

async function getImportHistory(): Promise<ImportRecord[]> {
  const { importHistory = [] } = await chrome.storage.local.get("importHistory");
  return importHistory;
}

// ── Message handler ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    switch (message.type) {
      case "GET_AUTH_STATUS":
        handleAuthStatus(sendResponse);
        return true;

      case "GET_PROFILES":
        handleGetProfiles(sendResponse);
        return true;

      case "IMPORT_JOB":
        handleImportJob(message.profileId, message.profileName, message.job, sendResponse);
        return true;

      case "IDENTIFY_SELECTORS":
        handleIdentifySelectors(message.skeleton, message.profileId, sendResponse);
        return true;

      case "NORMALIZE_AND_IMPORT":
        handleNormalizeAndImport(
          message.raw,
          message.profileId,
          message.profileName,
          sendResponse,
        );
        return true;

      case "GET_IMPORT_HISTORY":
        handleGetImportHistory(sendResponse);
        return true;
    }
  },
);

// ── Handlers ─────────────────────────────────────────────────────────────

async function handleAuthStatus(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await checkAuth();
  sendResponse({
    type: "AUTH_STATUS",
    authenticated: result.ok && (result.data?.authenticated ?? false),
  });
}

async function handleGetProfiles(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await fetchProfiles();
  sendResponse({
    type: "PROFILES",
    profiles: result.data?.profiles ?? [],
  });
}

async function handleImportJob(
  profileId: string,
  profileName: string,
  job: ExtractedJob,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await importJob({
    profileId,
    originalInput: job.url,
    title: job.title,
    company: job.company,
    description: job.description,
    location: job.location,
    locationType: job.locationType,
    url: job.url,
    postedAt: job.postedAt,
    jobType: job.jobType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
    skills: job.skills,
    source: job.source,
    externalId: job.externalId,
  });

  const jobId = result.data?.job?.id;

  if (result.ok && jobId) {
    await saveImportRecord({
      jobId,
      title: job.title,
      company: job.company,
      source: job.source,
      importedAt: new Date().toISOString(),
      profileName,
    });
  }

  sendResponse({
    type: "IMPORT_RESULT",
    ok: result.ok,
    jobId,
    error: result.error,
  });
}

async function handleIdentifySelectors(
  skeleton: string,
  profileId: string,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await identifySelectors({ skeleton, profileId });

  if (result.ok && result.data?.selectors) {
    sendResponse({
      type: "SELECTORS_IDENTIFIED",
      selectors: result.data.selectors,
    });
  } else {
    sendResponse({
      type: "IMPORT_RESULT",
      ok: false,
      error: result.error ?? "Could not identify job fields on this page",
    });
  }
}

async function handleNormalizeAndImport(
  raw: RawExtraction,
  profileId: string,
  profileName: string,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const normalizeResult = await normalizeExtraction({ ...raw, profileId });
  if (!normalizeResult.ok || !normalizeResult.data) {
    sendResponse({
      type: "IMPORT_RESULT",
      ok: false,
      error: normalizeResult.error ?? "Normalization failed",
    });
    return;
  }

  const extracted = normalizeResult.data;

  const importResult = await importJob({
    profileId,
    originalInput: raw.url,
    title: extracted.title,
    company: extracted.company,
    description: extracted.description,
    location: extracted.location,
    locationType: extracted.locationType,
    url: extracted.url ?? raw.url,
    postedAt: extracted.postedAt,
    jobType: extracted.jobType,
    salaryMin: extracted.salaryMin,
    salaryMax: extracted.salaryMax,
    currency: extracted.currency,
    skills: extracted.skills,
    source: extracted.source,
    externalId: extracted.externalId,
  });

  const jobId = importResult.data?.job?.id;

  if (importResult.ok && jobId) {
    await saveImportRecord({
      jobId,
      title: extracted.title,
      company: extracted.company,
      source: "CUSTOM",
      importedAt: new Date().toISOString(),
      profileName,
    });
  }

  sendResponse({
    type: importResult.ok ? "IMPORT_COMPLETE" : "IMPORT_RESULT",
    ok: importResult.ok,
    jobId,
    error: importResult.error,
  });
}

async function handleGetImportHistory(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const history = await getImportHistory();
  sendResponse({ type: "IMPORT_HISTORY", history });
}
