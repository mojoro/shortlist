import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ExtractResult, ImportPayload, ImportRecord, PageContent, Message } from "../types";
import { getBaseUrl } from "../lib/api";

// ── Types ────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  name: string;
  isActive: boolean;
}

type Status =
  | "loading"
  | "extracting"
  | "idle"
  | "importing"
  | "success"
  | "error";

// ── Helpers ──────────────────────────────────────────────────────────────

function sendMessage<T>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message);
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
  extracting: "Extracting job details...",
  importing: "Importing...",
};

// ── App ──────────────────────────────────────────────────────────────────

function Popup() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [extracted, setExtracted] = useState<ExtractResult | null>(null);
  const [pageTitle, setPageTitle] = useState<string>("");
  const [pageUrl, setPageUrl] = useState<string>("");
  const [pageHtml, setPageHtml] = useState<string>("");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importedJobId, setImportedJobId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [baseUrl, setBaseUrl] = useState("https://shortlist.johnmoorman.com");

  useEffect(() => {
    async function init() {
      // 1. Resolve base URL
      const url = await getBaseUrl();
      setBaseUrl(url);

      // 2. Check auth
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

      // 3. Load import history
      const historyResult = await sendMessage<{
        type: string;
        history: ImportRecord[];
      }>({ type: "GET_IMPORT_HISTORY" });
      setImportHistory(historyResult.history ?? []);

      // 4. Fetch profiles
      const profilesResult = await sendMessage<{
        type: string;
        profiles: Profile[];
      }>({ type: "GET_PROFILES" });

      const profs = profilesResult.profiles ?? [];
      setProfiles(profs);

      const active = profs.find((p) => p.isActive);
      if (active) setSelectedProfileId(active.id);
      else if (profs.length > 0) setSelectedProfileId(profs[0].id);

      const profileId = active?.id ?? profs[0]?.id;
      if (!profileId) {
        setStatus("error");
        setErrorMessage("No profile found. Create one in Shortlist first.");
        return;
      }

      // 5. Collect page content
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setStatus("idle");
        return;
      }

      let content: PageContent | null = null;

      // Try content script first
      try {
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: "GET_PAGE_CONTENT",
        });
        if (result?.content) {
          content = result.content;
        }
      } catch {
        // Content script not injected — fall back to scripting API
      }

      if (!content) {
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
              clone
                .querySelectorAll(
                  "script, style, nav, footer, header, iframe, noscript, " +
                    "svg, img, video, audio, canvas, " +
                    "[role='navigation'], [role='banner'], [role='contentinfo'], " +
                    "[aria-hidden='true']",
                )
                .forEach((n) => n.remove());
              return {
                url: window.location.href,
                html: clone.innerHTML.slice(0, 50000),
                title: document.title,
              };
            },
          });
          if (injected?.result) {
            content = injected.result;
          }
        } catch {
          // Page is restricted (chrome://, edge://, etc.)
        }
      }

      if (!content || content.html.length < 50) {
        setStatus("idle");
        return;
      }

      setPageTitle(content.title);
      setPageUrl(content.url);
      setPageHtml(content.html);

      // 6. Send to extract endpoint
      setStatus("extracting");

      const extractResult = await sendMessage<{
        type: string;
        ok?: boolean;
        data?: ExtractResult;
        error?: string;
      }>({
        type: "EXTRACT_JOB",
        html: content.html,
        profileId,
      });

      if (extractResult.ok && extractResult.data) {
        setExtracted(extractResult.data);
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMessage(
          extractResult.error ?? "Could not extract job details from this page.",
        );
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
    if (!selectedProfileId || !extracted) return;

    setStatus("importing");
    setErrorMessage("");

    const data: ImportPayload = {
      originalInput: pageUrl || extracted.url || pageHtml,
      title: extracted.title,
      company: extracted.company,
      description: extracted.description,
      location: extracted.location,
      locationType: extracted.locationType,
      url: extracted.url || pageUrl || null,
      postedAt: extracted.postedAt,
      jobType: extracted.jobType,
      salaryMin: extracted.salaryMin,
      salaryMax: extracted.salaryMax,
      currency: extracted.currency,
      skills: extracted.skills,
    };

    try {
      const result = await sendMessage<{
        type: string;
        ok?: boolean;
        jobId?: string;
        error?: string;
      }>({
        type: "IMPORT_JOB",
        profileId: selectedProfileId,
        profileName: selectedProfileName,
        data,
      });

      if (result.ok) {
        setStatus("success");
        setImportedJobId(result.jobId ?? null);
        if (result.jobId) {
          addToHistory({
            jobId: result.jobId,
            title: extracted.title,
            company: extracted.company,
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

      {/* Extracting status with page title */}
      {status === "extracting" && (
        <div className="status status-loading">
          {pageTitle
            ? `Extracting from: ${pageTitle.slice(0, 60)}${pageTitle.length > 60 ? "..." : ""}`
            : "Extracting job details..."}
        </div>
      )}

      {/* Job preview */}
      {extracted && status === "idle" && (
        <div className="job-preview">
          <div className="title">{extracted.title}</div>
          <div className="company">{extracted.company}</div>
          {extracted.location && (
            <div className="location">{extracted.location}</div>
          )}
        </div>
      )}
      {!extracted && status === "idle" && (
        <div className="empty-state">
          <p>No job listing found on this page. Try navigating to a job posting.</p>
        </div>
      )}

      {/* Importing status */}
      {status === "importing" && (
        <div className="status status-loading">Importing...</div>
      )}

      {/* Profile selector */}
      {profiles.length > 1 && (
        <select
          className="profile-select"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          disabled={status === "importing" || status === "extracting"}
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
      {extracted && status === "idle" && (
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
