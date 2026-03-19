import {
  checkAuth,
  fetchProfiles,
  importJob,
  extractJob,
} from "../lib/api";
import type { Message, ExtractedJob } from "../types";

/**
 * Background service worker — coordinates between popup, content script,
 * and the Shortlist API.
 */

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
        handleImportJob(message.profileId, message.job, sendResponse);
        return true;

      case "EXTRACT_AND_IMPORT":
        handleExtractAndImport(
          message.profileId,
          message.html,
          message.url,
          sendResponse,
        );
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
  });

  sendResponse({
    type: "IMPORT_RESULT",
    ok: result.ok,
    jobId: result.data?.job?.id,
    error: result.error,
  });
}

async function handleExtractAndImport(
  profileId: string,
  html: string,
  url: string,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  // Step 1: AI extraction
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

  // Step 2: Import the extracted job
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

  sendResponse({
    type: "EXTRACT_AND_IMPORT_RESULT",
    ok: importResult.ok,
    jobId: importResult.data?.job?.id,
    error: importResult.error,
  });
}
