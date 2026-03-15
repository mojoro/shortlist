"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface ExtractedFields {
  title:        string;
  company:      string;
  description:  string;
  location:     string;
  locationType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  url:          string;
  postedAt:     string;
  jobType:      "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null;
  salaryMin:    number | null;
  salaryMax:    number | null;
  currency:     string;
  skills:       string[];
}

const EMPTY_FIELDS: ExtractedFields = {
  title:        "",
  company:      "",
  description:  "",
  location:     "",
  locationType: null,
  url:          "",
  postedAt:     "",
  jobType:      null,
  salaryMin:    null,
  salaryMax:    null,
  currency:     "",
  skills:       [],
};

const URL_RE = /^https?:\/\//i;

const LOCATION_TYPE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME:  "Full-time",
  PART_TIME:  "Part-time",
  CONTRACT:   "Contract",
  FREELANCE:  "Freelance",
  INTERNSHIP: "Internship",
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--text-muted)]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm " +
  "text-[var(--text)] placeholder:text-[var(--text-muted)] transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent";

const selectCls = inputCls;

// ─── Main component ───────────────────────────────────────────────────────────

interface ImportJobModalProps {
  profileId: string;
  open:      boolean;
  onClose:   () => void;
}

function ImportJobModal({ profileId, open, onClose }: ImportJobModalProps) {
  const router = useRouter();

  const [phase,        setPhase]        = useState<"input" | "review">("input");
  const [inputValue,   setInputValue]   = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [fields,       setFields]       = useState<ExtractedFields>(EMPTY_FIELDS);
  const [skillsText,   setSkillsText]   = useState("");
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (open && phase === "input") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, phase]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function reset() {
    setPhase("input");
    setInputValue("");
    setIsExtracting(false);
    setExtractError(null);
    setFields(EMPTY_FIELDS);
    setSkillsText("");
    setIsSaving(false);
    setSaveError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const isUrl      = URL_RE.test(inputValue.trim());
  const detectHint = inputValue.trim()
    ? isUrl
      ? "URL detected"
      : "Text detected"
    : null;

  async function handleExtract() {
    setExtractError(null);
    setIsExtracting(true);
    try {
      const res = await fetch("/api/jobs/extract", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: inputValue, profileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? "Extraction failed. Please try again.");
        return;
      }
      const extracted = data as Partial<ExtractedFields>;
      const merged: ExtractedFields = {
        title:        extracted.title        ?? "",
        company:      extracted.company      ?? "",
        description:  extracted.description  ?? "",
        location:     extracted.location     ?? "",
        locationType: extracted.locationType ?? null,
        url:          extracted.url          ?? (isUrl ? inputValue.trim() : ""),
        postedAt:     extracted.postedAt     ?? "",
        jobType:      extracted.jobType      ?? null,
        salaryMin:    extracted.salaryMin    ?? null,
        salaryMax:    extracted.salaryMax    ?? null,
        currency:     extracted.currency     ?? "",
        skills:       extracted.skills       ?? [],
      };
      setFields(merged);
      setSkillsText((extracted.skills ?? []).join(", "));
      setPhase("review");
    } catch {
      setExtractError("Something went wrong. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);
    try {
      const parsedSkills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/jobs/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          profileId,
          originalInput: inputValue,
          ...fields,
          skills: parsedSkills,
          salaryMin: fields.salaryMin || null,
          salaryMax: fields.salaryMax || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save. Please try again.");
        return;
      }
      router.refresh();
      handleClose();
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        role="dialog"
        aria-modal="true"
        aria-label="Import job listing"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Import job listing</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {phase === "input"
                ? "Paste a URL or the full page text"
                : "Review the extracted details before saving"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {phase === "input" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setExtractError(null); }}
                  rows={6}
                  placeholder={"Paste a job listing URL\nor the full page text (Ctrl+A, Ctrl+C from the job page)"}
                  className={`${inputCls} resize-none`}
                />
                {detectHint && (
                  <p className="text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 3v2.5L6.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {detectHint}
                    </span>
                  </p>
                )}
              </div>

              {extractError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {extractError}
                </p>
              )}

              <button
                onClick={handleExtract}
                disabled={!inputValue.trim() || isExtracting}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExtracting ? <><Spinner /> Extracting…</> : "Extract details"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Back */}
              <button
                onClick={() => { setPhase("input"); setSaveError(null); }}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M8 2L4 6l4 4" />
                </svg>
                Back
              </button>

              {/* Required fields */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Job title" required>
                  <input
                    type="text"
                    value={fields.title}
                    onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. Frontend Engineer"
                  />
                </Field>
                <Field label="Company" required>
                  <input
                    type="text"
                    value={fields.company}
                    onChange={(e) => setFields((f) => ({ ...f, company: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. Acme Corp"
                  />
                </Field>
              </div>

              <Field label="Listing URL">
                <input
                  type="url"
                  value={fields.url}
                  onChange={(e) => setFields((f) => ({ ...f, url: e.target.value }))}
                  className={inputCls}
                  placeholder="https://…"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Location">
                  <input
                    type="text"
                    value={fields.location}
                    onChange={(e) => setFields((f) => ({ ...f, location: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. Berlin, Germany"
                  />
                </Field>
                <Field label="Work arrangement">
                  <select
                    value={fields.locationType ?? ""}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        locationType: (e.target.value || null) as ExtractedFields["locationType"],
                      }))
                    }
                    className={selectCls}
                  >
                    <option value="">Not specified</option>
                    {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Job type">
                  <select
                    value={fields.jobType ?? ""}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        jobType: (e.target.value || null) as ExtractedFields["jobType"],
                      }))
                    }
                    className={selectCls}
                  >
                    <option value="">Not specified</option>
                    {Object.entries(JOB_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Posted date">
                  <input
                    type="date"
                    value={fields.postedAt}
                    onChange={(e) => setFields((f) => ({ ...f, postedAt: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Salary */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Salary min">
                  <input
                    type="number"
                    value={fields.salaryMin ?? ""}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        salaryMin: e.target.value ? parseInt(e.target.value, 10) : null,
                      }))
                    }
                    className={inputCls}
                    placeholder="60000"
                    min={0}
                  />
                </Field>
                <Field label="Salary max">
                  <input
                    type="number"
                    value={fields.salaryMax ?? ""}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        salaryMax: e.target.value ? parseInt(e.target.value, 10) : null,
                      }))
                    }
                    className={inputCls}
                    placeholder="90000"
                    min={0}
                  />
                </Field>
                <Field label="Currency">
                  <input
                    type="text"
                    value={fields.currency}
                    onChange={(e) => setFields((f) => ({ ...f, currency: e.target.value }))}
                    className={inputCls}
                    placeholder="EUR"
                    maxLength={10}
                  />
                </Field>
              </div>

              <Field label="Skills (comma-separated)">
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className={inputCls}
                  placeholder="TypeScript, React, Node.js"
                />
              </Field>

              <Field label="Description" required>
                <textarea
                  value={fields.description}
                  onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
                  rows={10}
                  className={`${inputCls} resize-y`}
                  placeholder="Paste or edit the job description…"
                />
              </Field>

              {saveError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {saveError}
                </p>
              )}

              <button
                onClick={handleSave}
                disabled={!fields.title.trim() || !fields.company.trim() || !fields.description.trim() || isSaving}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? <><Spinner /> Saving…</> : "Save to feed"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trigger button (exported) ────────────────────────────────────────────────

export function ImportJobButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 1v10M1 6h10" />
        </svg>
        Import job
      </button>
      <ImportJobModal profileId={profileId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
