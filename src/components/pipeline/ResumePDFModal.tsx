"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { ResumePDFDocument } from "@/components/tailor/ResumePDFDocument";

interface ResumePDFModalProps {
  markdown: string;
  jobTitle: string;
  company:  string;
  onClose:  () => void;
}

export function ResumePDFModal({
  markdown,
  jobTitle,
  company,
  onClose,
}: ResumePDFModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
        style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.24)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Resume preview"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              {jobTitle}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{company}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close preview"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PDF viewer */}
        <div className="min-h-0 flex-1">
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <ResumePDFDocument markdown={markdown} />
          </PDFViewer>
        </div>
      </div>
    </>
  );
}
