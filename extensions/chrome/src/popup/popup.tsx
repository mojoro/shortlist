import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ExtractionResult, ExtractedJob, ImportRecord, Message } from "../types";
import { getBaseUrl } from "../lib/api";

// ── Types ────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  name: string;
  isActive: boolean;
}

type Status = "idle" | "loading" | "extracting" | "importing" | "success" | "error";

// ── Helpers ──────────────────────────────────────────────────────────────

function sendMessage<T>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

function sendTabMessage<T>(tabId: number, message: Message): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message);
}

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ── App ──────────────────────────────────────────────────────────────────

function Popup() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importedJobId, setImportedJobId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [baseUrl, setBaseUrl] = useState("https://shortlist.johnmoorman.com");

  // Initialize: check auth, fetch profiles, extract from current tab
  useEffect(() => {
    async function init() {
      // 0. Resolve base URL for links
      const url = await getBaseUrl();
      setBaseUrl(url);

      // 1. Check auth
      const authResult = await sendMessage<{
        type: string;
        authenticated: boolean;
      }>({ type: "GET_AUTH_STATUS" });

      if (!authResult.authenticated) {
        setAuthenticated(false);
        setStatus("idle");
        return;
      }
      setAuthenticated(true);

      // 2. Load import history
      const historyResult = await sendMessage<{
        type: string;
        history: ImportRecord[];
      }>({ type: "GET_IMPORT_HISTORY" });
      setImportHistory(historyResult.history ?? []);

      // 3. Fetch profiles
      const profilesResult = await sendMessage<{
        type: string;
        profiles: Profile[];
      }>({ type: "GET_PROFILES" });

      const profs = profilesResult.profiles ?? [];
      setProfiles(profs);

      // Default to the active profile
      const active = profs.find((p) => p.isActive);
      if (active) setSelectedProfileId(active.id);
      else if (profs.length > 0) setSelectedProfileId(profs[0].id);

      // 4. Extract from the current tab
      setStatus("extracting");
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab?.id) {
          let result: { type: string; result: ExtractionResult } | null = null;

          // Try messaging the content script (already injected via manifest)
          try {
            result = await sendTabMessage<{
              type: string;
              result: ExtractionResult;
            }>(tab.id, { type: "EXTRACT" });
          } catch {
            // Content script not present (page loaded before extension install/refresh).
            // Fall back to collecting page content directly via scripting API.
            try {
              const [injected] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  const mainEl =
                    document.querySelector("main") ??
                    document.querySelector("article") ??
                    document.querySelector("[role='main']") ??
                    document.body;
                  const clone = mainEl.cloneNode(true) as HTMLElement;
                  clone.querySelectorAll("script, style, nav, footer, header, iframe, noscript")
                    .forEach((el) => el.remove());
                  return {
                    url: window.location.href,
                    html: clone.innerText.slice(0, 50000),
                    title: document.title,
                  };
                },
              });
              if (injected?.result) {
                result = {
                  type: "EXTRACTED",
                  result: {
                    type: "generic",
                    url: injected.result.url,
                    html: injected.result.html,
                    title: injected.result.title,
                    meta: {},
                  },
                };
              }
            } catch {
              // Page is restricted (chrome://, edge://, etc.)
            }
          }

          setExtraction(result?.result ?? null);
        }
      } catch {
        setExtraction(null);
      }

      setStatus("idle");
    }

    init();
  }, []);

  // ── Import handler ───────────────────────────────────────────────────

  const selectedProfileName =
    profiles.find((p) => p.id === selectedProfileId)?.name ?? "Unknown";

  function addToHistory(record: ImportRecord) {
    setImportHistory((prev) => [record, ...prev].slice(0, 5));
  }

  async function handleImport() {
    if (!selectedProfileId || !extraction) return;

    setStatus("importing");
    setErrorMessage("");

    try {
      if (extraction.type === "structured") {
        const result = await sendMessage<{
          type: string;
          ok: boolean;
          jobId?: string;
          error?: string;
        }>({
          type: "IMPORT_JOB",
          profileId: selectedProfileId,
          profileName: selectedProfileName,
          job: extraction.data,
        });

        if (result.ok) {
          setStatus("success");
          setImportedJobId(result.jobId ?? null);
          if (result.jobId) {
            addToHistory({
              jobId: result.jobId,
              title: extraction.data.title,
              company: extraction.data.company,
              source: extraction.data.source,
              importedAt: new Date().toISOString(),
              profileName: selectedProfileName,
            });
          }
        } else {
          setStatus("error");
          setErrorMessage(result.error ?? "Import failed");
        }
      } else if (extraction.type === "generic") {
        const result = await sendMessage<{
          type: string;
          ok: boolean;
          jobId?: string;
          error?: string;
        }>({
          type: "EXTRACT_AND_IMPORT",
          profileId: selectedProfileId,
          profileName: selectedProfileName,
          html: extraction.html,
          url: extraction.url,
        });

        if (result.ok) {
          setStatus("success");
          setImportedJobId(result.jobId ?? null);
          if (result.jobId) {
            addToHistory({
              jobId: result.jobId,
              title: extraction.title || "Imported job",
              company: "Via AI extraction",
              source: "CUSTOM",
              importedAt: new Date().toISOString(),
              profileName: selectedProfileName,
            });
          }
        } else {
          setStatus("error");
          setErrorMessage(result.error ?? "Import failed");
        }
      }
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  // Loading state
  if (authenticated === null) {
    return (
      <div className="popup">
        <Header />
        <div className="status status-loading">Connecting...</div>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return (
      <div className="popup">
        <Header />
        <div className="auth-prompt">
          <p>Sign in to Shortlist to import jobs.</p>
          <button
            className="btn btn-primary"
            onClick={() => chrome.tabs.create({ url: `${baseUrl}/sign-in` })}
          >
            Sign in to Shortlist
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="popup">
        <Header />
        <div className="status status-success">
          Job imported successfully!
        </div>
        {importedJobId && (
          <button
            className="btn btn-link"
            onClick={() =>
              chrome.tabs.create({
                url: `${baseUrl}/jobs/${importedJobId}`,
              })
            }
          >
            View in Shortlist
          </button>
        )}
        <button
          className="btn btn-link"
          onClick={() =>
            chrome.tabs.create({ url: `${baseUrl}/dashboard` })
          }
        >
          Open Dashboard
        </button>
        <ImportHistory history={importHistory} baseUrl={baseUrl} />
      </div>
    );
  }



  return (
    <div className="popup">
      <Header />

      {/* Job preview */}
      {extraction?.type === "structured" && (
        <JobPreview job={extraction.data} />
      )}
      {extraction?.type === "generic" && (
        <div className="job-preview">
          <div className="title">{extraction.title || document.title || "This page"}</div>
          <div className="generic-notice">
            AI will extract job details from this page
          </div>
        </div>
      )}
      {extraction === null && status === "idle" && (
        <div className="empty-state">
          <p>Could not read this page. Try reloading it first.</p>
        </div>
      )}

      {/* Extracting state */}
      {status === "extracting" && (
        <div className="status status-loading">Reading page...</div>
      )}

      {/* Profile selector */}
      {profiles.length > 1 && (
        <select
          className="profile-select"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          disabled={status === "importing"}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.isActive ? " (active)" : ""}
            </option>
          ))}
        </select>
      )}

      {/* Import button */}
      {extraction && status !== "extracting" && (
        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={status === "importing" || !selectedProfileId}
        >
          {status === "importing"
            ? "Importing..."
            : extraction.type === "generic"
              ? "Extract & Import"
              : "Import to Shortlist"}
        </button>
      )}

      {/* Error message */}
      {status === "error" && (
        <div className="status status-error">{errorMessage}</div>
      )}

      <ImportHistory history={importHistory} baseUrl={baseUrl} />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function Header() {
  return (
    <div className="popup-header">
      <h1>Shortlist</h1>
    </div>
  );
}

function JobPreview({ job }: { job: ExtractedJob }) {
  return (
    <div className="job-preview">
      <div className="title">{job.title}</div>
      <div className="company">{job.company}</div>
      {job.location && <div className="location">{job.location}</div>}
    </div>
  );
}

function ImportHistory({ history, baseUrl }: { history: ImportRecord[]; baseUrl: string }) {
  if (history.length === 0) return null;

  return (
    <div className="import-history">
      <div className="import-history-label">Recent imports</div>
      <ul className="import-history-list">
        {history.map((record) => (
          <li key={record.jobId}>
            <button
              className="import-history-item"
              onClick={() =>
                chrome.tabs.create({
                  url: `${baseUrl}/jobs/${record.jobId}`,
                })
              }
            >
              <span className="import-history-title">
                {record.title}
                <span className="import-history-company">
                  {" "}@ {record.company}
                </span>
              </span>
              <span className="import-history-time">
                {timeAgo(record.importedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Mount ────────────────────────────────────────────────────────────────

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Popup />);
}
