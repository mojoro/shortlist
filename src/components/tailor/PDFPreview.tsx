"use client";

import { usePDF, PDFViewer } from "@react-pdf/renderer";
import { ResumePDFDocument } from "@/components/tailor/ResumePDFDocument";

interface PDFPreviewProps {
  markdown: string;
  filename?: string;
  onBack?: () => void;
  onDownload?: () => void;
}

export function PDFPreview({
  markdown,
  filename = "resume.pdf",
  onBack,
  onDownload,
}: PDFPreviewProps) {
  const [{ url, loading }] = usePDF({
    document: <ResumePDFDocument markdown={markdown} />,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
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
        <a
          href={url ?? "#"}
          download={filename}
          onClick={loading ? (e) => e.preventDefault() : onDownload}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {loading ? "Preparing…" : "↓ Download PDF"}
        </a>
      </div>
      <div className="min-h-0 flex-1">
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <ResumePDFDocument markdown={markdown} />
        </PDFViewer>
      </div>
    </div>
  );
}
