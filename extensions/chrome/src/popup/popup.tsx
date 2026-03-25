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
  | "duplicate"
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

// ── App ──────────────────────────────────────────────────────────────────

function Popup() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [extracted, setExtracted] = useState<ExtractResult | null>(null);
  const [pageUrl, setPageUrl] = useState<string>("");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importedJobId, setImportedJobId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    async function init() {
      const url = await getBaseUrl();
      setBaseUrl(url);

      // Auth check
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

      // Load history + profiles in parallel
      const [historyResult, profilesResult] = await Promise.all([
        sendMessage<{ type: string; history: ImportRecord[] }>({
          type: "GET_IMPORT_HISTORY",
        }),
        sendMessage<{ type: string; profiles: Profile[] }>({
          type: "GET_PROFILES",
        }),
      ]);

      setImportHistory(historyResult.history ?? []);
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

      // Collect page content
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setStatus("idle");
        return;
      }

      let content: PageContent | null = null;

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
        if (injected?.result) content = injected.result;
      } catch {
        // Page is restricted (chrome://, about:, etc.)
      }

      if (!content || content.html.length < 50) {
        setStatus("idle");
        return;
      }

      setPageUrl(content.url);

      // Extract via API
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
          extractResult.error ?? "Could not extract job details.",
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
      originalInput: pageUrl || extracted.url || "",
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
        status?: number;
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
      } else if (result.status === 409) {
        setStatus("duplicate");
      } else {
        setStatus("error");
        setErrorMessage(result.error ?? "Import failed");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  function handleEditInShortlist() {
    const importUrl = pageUrl
      ? `${baseUrl}/dashboard?import=${encodeURIComponent(pageUrl)}`
      : `${baseUrl}/dashboard`;
    chrome.tabs.create({ url: importUrl });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (authenticated === null) {
    return (
      <div className="popup">
        <Header />
        <div className="status status-loading">Connecting...</div>
      </div>
    );
  }

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

  if (status === "success") {
    return (
      <div className="popup">
        <Header />
        <div className="status status-success">Job imported successfully!</div>
        <div className="button-group">
          {importedJobId && (
            <button
              className="btn btn-primary"
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
        </div>
        <ImportHistory history={importHistory} baseUrl={baseUrl} />
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className="popup">
        <Header />
        <div className="status status-duplicate">
          This job has already been imported.
        </div>
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

      {status === "extracting" && (
        <div className="status status-loading">
          Extracting job details...
        </div>
      )}

      {extracted && status === "idle" && (
        <>
          <div className="job-preview">
            <div className="title">{extracted.title}</div>
            <div className="company">{extracted.company}</div>
            {extracted.location && (
              <div className="location">{extracted.location}</div>
            )}
            {extracted.salaryMin && extracted.salaryMax && (
              <div className="salary">
                {extracted.currency ?? "$"}
                {extracted.salaryMin.toLocaleString()} – {extracted.currency ?? "$"}
                {extracted.salaryMax.toLocaleString()}
              </div>
            )}
          </div>

          {profiles.length > 1 && (
            <select
              className="profile-select"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          )}

          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={!selectedProfileId}
            >
              Import to Shortlist
            </button>
            <button className="btn btn-secondary" onClick={handleEditInShortlist}>
              Edit in Shortlist
            </button>
          </div>
        </>
      )}

      {!extracted && status === "idle" && (
        <div className="empty-state">
          <p>No job listing found on this page.</p>
          <button className="btn btn-secondary" onClick={handleEditInShortlist}>
            Import manually in Shortlist
          </button>
        </div>
      )}

      {status === "importing" && (
        <div className="status status-loading">Importing...</div>
      )}

      {status === "error" && (
        <>
          <div className="status status-error">{errorMessage}</div>
          <button className="btn btn-secondary" onClick={handleEditInShortlist}>
            Try importing in Shortlist instead
          </button>
        </>
      )}

      <ImportHistory history={importHistory} baseUrl={baseUrl} />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function Header() {
  return (
    <div className="popup-header">
      <svg viewBox="0 0 32 32" className="popup-logo" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="var(--primary)" />
        <path
          d="M8 17L13 22L24 10"
          stroke="var(--primary-fg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
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
