"use client";

import dynamic from "next/dynamic";
import { ResumePDFDocument } from "@/components/tailor/ResumePDFDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
        Loading preview…
      </div>
    ),
  }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

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
        <div onClick={onDownload}>
          <PDFDownloadLink
            document={<ResumePDFDocument markdown={markdown} />}
            fileName={filename}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {({ loading }) => (loading ? "Preparing…" : "↓ Download PDF")}
          </PDFDownloadLink>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <ResumePDFDocument markdown={markdown} />
        </PDFViewer>
      </div>
    </div>
  );
}
