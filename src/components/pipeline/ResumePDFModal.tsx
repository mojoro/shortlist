"use client";

import { useState, useEffect } from "react";
import { usePDF, PDFViewer } from "@react-pdf/renderer";
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
  const [{ url, loading }] = usePDF({
    document: <ResumePDFDocument markdown={markdown} />,
  });
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const filename = `${company} — ${jobTitle}.pdf`;

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
        className="fixed left-1/2 top-1/2 z-50 flex h-[90vh] w-[90vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
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
          <div className="ml-4 flex shrink-0 items-center gap-2">
            {isMobile && !loading && url && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Open PDF
                </a>
                <a
                  href={url}
                  download={filename}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  ↓ Download
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
        </div>

        {/* PDF content */}
        <div className="min-h-0 flex-1">
          {isMobile ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              {loading || !url ? (
                <p className="text-sm text-[var(--text-muted)]">Preparing PDF…</p>
              ) : (
                <>
                  <p className="text-sm text-[var(--text-muted)]">
                    PDF preview isn&apos;t supported in mobile browsers.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      Open PDF
                    </a>
                    <a
                      href={url}
                      download={filename}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      ↓ Download
                    </a>
                  </div>
                </>
              )}
            </div>
          ) : (
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <ResumePDFDocument markdown={markdown} />
            </PDFViewer>
          )}
        </div>
      </div>
    </>
  );
}
