import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ExtractionResult, RawExtraction, ImportRecord, SelectorMap, Message } from "../types";
import { getBaseUrl } from "../lib/api";

// ── Types ────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  name: string;
  isActive: boolean;
}

type Status =
  | "idle"
  | "loading"
  | "reading"
  | "identifying"
  | "extracting"
  | "importing"
  | "success"
  | "error";

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

const STATUS_LABELS: Partial<Record<Status, string>> = {
  reading: "Reading page...",
  identifying: "Identifying job fields...",
  extracting: "Extracting content...",
  importing: "Importing...",
};

// ── App ──────────────────────────────────────────────────────────────────

function Popup() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [rawExtraction, setRawExtraction] = useState<RawExtraction | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importedJobId, setImportedJobId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [baseUrl, setBaseUrl] = useState("https://shortlist.johnmoorman.com");
  const [aiIdentified, setAiIdentified] = useState(false);

  useEffect(() => {
    async function init() {
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

      const active = profs.find((p) => p.isActive);
      if (active) setSelectedProfileId(active.id);
      else if (profs.length > 0) setSelectedProfileId(profs[0].id);

      // 4. Extract from the current tab
      setStatus("reading");
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) {
          setStatus("idle");
          return;
        }

        let extraction: ExtractionResult | null = null;

        try {
          const result = await sendTabMessage<{
            type: string;
            result: ExtractionResult;
          }>(tab.id, { type: "EXTRACT" });
          extraction = result?.result ?? null;
        } catch {
          // Content script not present — fall back to scripting API
          try {
            const [injected] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                const el =
                  document.querySelector("[role='main'] article") ??
                  document.querySelector("[role='main']") ??
                  document.querySelector("main") ??
                  document.querySelector("article") ??
                  document.body;
                const clone = el.cloneNode(true) as HTMLElement;
                clone.querySelectorAll(
                  "script, style, nav, footer, header, iframe, noscript, " +
                  "svg, img, video, audio, canvas, [aria-hidden='true']"
                ).forEach((n) => n.remove());
                return {
                  skeleton: clone.innerHTML.slice(0, 15000),
                  url: window.location.href,
                  domain: window.location.hostname,
                };
              },
            });
            if (injected?.result) {
              const r = injected.result;
              if (r.skeleton && r.skeleton.length >= 50) {
                extraction = {
                  type: "needs_identification",
                  skeleton: r.skeleton,
                  url: r.url,
                  domain: r.domain,
                };
              }
            }
          } catch {
            // Page is restricted (chrome://, edge://, etc.)
          }
        }

        if (!extraction || extraction.type === "none") {
          setStatus("idle");
          return;
        }

        // 5. Handle extraction result
        if (extraction.type === "extracted") {
          setRawExtraction(extraction.raw);
          setStatus("idle");
          return;
        }

        // 6. Needs AI identification
        if (extraction.type === "needs_identification") {
          const profileId = active?.id ?? profs[0]?.id;
          if (!profileId) {
            setStatus("error");
            setErrorMessage("No profile found. Create one in Shortlist first.");
            return;
          }

          setStatus("identifying");
          const identifyResult = await sendMessage<{
            type: string;
            selectors?: SelectorMap;
            ok?: boolean;
            error?: string;
          }>({
            type: "IDENTIFY_SELECTORS",
            skeleton: extraction.skeleton,
            profileId,
          });

          if (!identifyResult.selectors) {
            setStatus("error");
            setErrorMessage(identifyResult.error ?? "Could not identify job fields on this page");
            return;
          }

          setStatus("extracting");
          setAiIdentified(true);

          // Apply selectors in the content script
          if (tab.id) {
            try {
              const applyResult = await sendTabMessage<{
                type: string;
                result: ExtractionResult;
              }>(tab.id, {
                type: "APPLY_SELECTORS",
                selectors: identifyResult.selectors,
              });

              if (applyResult?.result?.type === "extracted") {
                setRawExtraction(applyResult.result.raw);
                setStatus("idle");
              } else {
                setStatus("error");
                setErrorMessage("Could not extract job details from this page");
              }
            } catch {
              // Content script not injected — cannot apply selectors
              setStatus("error");
              setErrorMessage("Could not extract job details from this page");
            }
          }
          return;
        }
      } catch {
        setStatus("error");
        setErrorMessage("Something went wrong reading this page");
      }
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
    if (!selectedProfileId || !rawExtraction) return;

    setStatus("importing");
    setErrorMessage("");

    try {
      const result = await sendMessage<{
        type: string;
        ok?: boolean;
        jobId?: string;
        error?: string;
      }>({
        type: "NORMALIZE_AND_IMPORT",
        raw: rawExtraction,
        profileId: selectedProfileId,
        profileName: selectedProfileName,
      });

      if (result.ok || result.type === "IMPORT_COMPLETE") {
        setStatus("success");
        setImportedJobId(result.jobId ?? null);
        if (result.jobId) {
          addToHistory({
            jobId: result.jobId,
            title: rawExtraction.title ?? "Imported job",
            company: rawExtraction.company ?? "Unknown company",
            source: "CUSTOM",
            importedAt: new Date().toISOString(),
            profileName: selectedProfileName,
          });
        }
      } else {
        setStatus("error");
        setErrorMessage(result.error ?? "Import failed");
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

  const statusLabel = STATUS_LABELS[status];

  return (
    <div className="popup">
      <Header />

      {/* Job preview */}
      {rawExtraction && status === "idle" && (
        <div className="job-preview">
          <div className="title">{rawExtraction.title || "Untitled"}</div>
          <div className="company">{rawExtraction.company || "Unknown company"}</div>
          {rawExtraction.location && (
            <div className="location">{rawExtraction.location}</div>
          )}
          {aiIdentified && (
            <div className="generic-notice">AI-identified</div>
          )}
        </div>
      )}
      {!rawExtraction && status === "idle" && (
        <div className="empty-state">
          <p>Could not read this page. Try reloading it first.</p>
        </div>
      )}

      {/* Status message */}
      {statusLabel && (
        <div className="status status-loading">{statusLabel}</div>
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
      {rawExtraction && status === "idle" && (
        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={!selectedProfileId}
        >
          Import to Shortlist
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
