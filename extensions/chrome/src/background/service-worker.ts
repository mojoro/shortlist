import {
  checkAuth,
  fetchProfiles,
  extractJob,
  importJob,
} from "../lib/api";
import type { Message, ImportPayload, ImportRecord } from "../types";

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

      case "EXTRACT_JOB":
        handleExtractJob(message.html, message.profileId, sendResponse);
        return true;

      case "IMPORT_JOB":
        handleImportJob(message.profileId, message.profileName, message.data, sendResponse);
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

async function handleExtractJob(
  html: string,
  profileId: string,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await extractJob({ input: html, profileId });
  sendResponse({
    type: "EXTRACT_RESULT",
    ok: result.ok,
    data: result.data ?? undefined,
    error: result.error ?? undefined,
  });
}

async function handleImportJob(
  profileId: string,
  profileName: string,
  data: ImportPayload,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await importJob({ profileId, ...data });
  const jobId = result.data?.job?.id;

  if (result.ok && jobId) {
    await saveImportRecord({
      jobId,
      title: data.title,
      company: data.company,
      source: "CUSTOM",
      importedAt: new Date().toISOString(),
      profileName,
    });
  }

  sendResponse({
    type: "IMPORT_RESULT",
    ok: result.ok,
    jobId,
    error: result.error ?? undefined,
  });
}

async function handleGetImportHistory(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const history = await getImportHistory();
  sendResponse({ type: "IMPORT_HISTORY", history });
}
