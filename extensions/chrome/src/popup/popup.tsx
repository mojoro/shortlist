import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ExtractionResult, ExtractedJob, Message } from "../types";

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

const SHORTLIST_URL = "https://shortlist.johnmoorman.com";

// ── App ──────────────────────────────────────────────────────────────────

function Popup() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importedJobId, setImportedJobId] = useState<string | null>(null);

  // Initialize: check auth, fetch profiles, extract from current tab
  useEffect(() => {
    async function init() {
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

      // 2. Fetch profiles
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

      // 3. Extract from the current tab
      setStatus("extracting");
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab?.id) {
          const result = await sendTabMessage<{
            type: string;
            result: ExtractionResult;
          }>(tab.id, { type: "EXTRACT" });
          setExtraction(result.result);
        } else {
          setExtraction({ type: "none" });
        }
      } catch {
        // Content script not injected on this page -- use generic fallback
        setExtraction({ type: "none" });
      }

      setStatus("idle");
    }

    init();
  }, []);

  // ── Import handler ───────────────────────────────────────────────────

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
          job: extraction.data,
        });

        if (result.ok) {
          setStatus("success");
          setImportedJobId(result.jobId ?? null);
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
          html: extraction.html,
          url: extraction.url,
        });

        if (result.ok) {
          setStatus("success");
          setImportedJobId(result.jobId ?? null);
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
            onClick={() => chrome.tabs.create({ url: SHORTLIST_URL })}
          >
            Open Shortlist
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
                url: `${SHORTLIST_URL}/jobs/${importedJobId}`,
              })
            }
          >
            View in Shortlist
          </button>
        )}
        <button
          className="btn btn-link"
          onClick={() =>
            chrome.tabs.create({ url: `${SHORTLIST_URL}/dashboard` })
          }
        >
          Open Dashboard
        </button>
      </div>
    );
  }

  // No extractable content
  if (extraction?.type === "none") {
    return (
      <div className="popup">
        <Header />
        <div className="empty-state">
          <p>No job listing detected on this page.</p>
          <p style={{ marginTop: 8, fontSize: 12 }}>
            Try opening a specific job posting page.
          </p>
        </div>
        <button
          className="btn btn-link"
          onClick={() =>
            chrome.tabs.create({ url: `${SHORTLIST_URL}/dashboard` })
          }
        >
          Open Shortlist
        </button>
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
          <div className="title">{extraction.title || "Untitled Page"}</div>
          <div className="generic-notice">
            AI will extract job details from this page
          </div>
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

// ── Mount ────────────────────────────────────────────────────────────────

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Popup />);
}
