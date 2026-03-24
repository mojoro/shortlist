import {
  checkAuth,
  fetchProfiles,
  importJob,
  extractJob,
} from "../lib/api";
import type { Message, ExtractedJob, ImportRecord } from "../types";

/**
 * Background service worker — coordinates between popup, content script,
 * and the Shortlist API.
 */

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

// ── Badge management ─────────────────────────────────────────────────────

// When a content script detects a job page, show a badge on the icon
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender: chrome.runtime.MessageSender,
  ) => {
    if (message.type === "JOB_PAGE_DETECTED" && sender.tab?.id) {
      chrome.action.setBadgeText({ text: "+", tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#6366f1",
        tabId: sender.tab.id,
      });
    }
  },
);

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
        return true; // keep channel open for async

      case "GET_PROFILES":
        handleGetProfiles(sendResponse);
        return true;

      case "IMPORT_JOB":
        handleImportJob(message.profileId, message.profileName, message.job, sendResponse);
        return true;

      case "EXTRACT_AND_IMPORT":
        handleExtractAndImport(
          message.profileId,
          message.profileName,
          message.html,
          message.url,
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

async function handleExtractAndImport(
  profileId: string,
  profileName: string,
  html: string,
  url: string,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const extractResult = await extractJob({ input: html, profileId });
  if (!extractResult.ok || !extractResult.data) {
    sendResponse({
      type: "EXTRACT_AND_IMPORT_RESULT",
      ok: false,
      error: extractResult.error ?? "Extraction failed",
    });
    return;
  }

  const extracted = extractResult.data;

  const importResult = await importJob({
    profileId,
    originalInput: url,
    title: extracted.title,
    company: extracted.company,
    description: extracted.description,
    location: extracted.location,
    locationType: extracted.locationType,
    url: extracted.url ?? url,
    postedAt: extracted.postedAt,
    jobType: extracted.jobType,
    salaryMin: extracted.salaryMin,
    salaryMax: extracted.salaryMax,
    currency: extracted.currency,
    skills: extracted.skills,
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
    type: "EXTRACT_AND_IMPORT_RESULT",
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
