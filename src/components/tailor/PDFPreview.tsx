"use client";

import { useState, useRef, useEffect } from "react";
import { usePDF, PDFViewer } from "@react-pdf/renderer";
import { ResumePDFDocument } from "@/components/tailor/ResumePDFDocument";

interface PDFPreviewProps {
  markdown:       string;
  filename?:      string;
  onBack?:        () => void;
  onMarkApplied?: () => void;
}

export function PDFPreview({
  markdown,
  filename = "resume.pdf",
  onBack,
  onMarkApplied,
}: PDFPreviewProps) {
  const [{ url, loading }] = usePDF({
    document: <ResumePDFDocument markdown={markdown} />,
  });
  const [appliedToast, setAppliedToast] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
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

  function handleMarkApplied() {
    anchorRef.current?.click();
    onMarkApplied?.();
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 4000);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 gap-3 flex-wrap">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-sm text-[var(--accent)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            ← Back to edit
          </button>
        ) : (
          <span className="text-sm font-medium text-[var(--text-muted)]">
            PDF Preview
          </span>
        )}

        <div className="flex items-center gap-2">
          {/* Plain download — no DB write */}
          <a
            ref={anchorRef}
            href={url ?? "#"}
            download={filename}
            onClick={loading ? (e) => e.preventDefault() : undefined}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {loading ? "Preparing…" : "↓ Download PDF"}
          </a>

          {/* Download + mark applied — DB write */}
          {onMarkApplied && (
            <button
              onClick={loading ? undefined : handleMarkApplied}
              disabled={loading}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
            >
              {loading ? "Preparing…" : "↓ Download & mark as applied"}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {isMobile ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              PDF preview isn&apos;t supported in mobile browsers.
            </p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Open PDF
              </a>
            )}
          </div>
        ) : (
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <ResumePDFDocument markdown={markdown} />
          </PDFViewer>
        )}
      </div>

      {/* Applied toast */}
      {appliedToast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 shadow-lg dark:border-green-800/50 dark:bg-green-950/60 dark:text-green-300">
          Job marked as applied and moved to your pipeline.
        </div>
      )}
    </div>
  );
}
