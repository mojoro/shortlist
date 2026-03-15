"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { JobDescription } from "@/components/jobs/JobDescription";
import { JobDescriptionPane } from "@/components/tailor/JobDescriptionPane";
import { GeneratePane } from "@/components/tailor/GeneratePane";
import { PDFPreview } from "@/components/tailor/PDFPreview";
import { MobileTabBar, type MobileTab } from "@/components/tailor/MobileTabBar";
import type { SaveStatus } from "@/components/tailor/AutoSaveIndicator";

interface TailorPanelProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobUrl: string;
  jobLocation: string | null;
  jobLocationType: string | null;
  jobType: string | null;
  jobSalary: string | null;
  jobPostedAt: string | null;
  jobSkills: string[];
  aiScore: number | null;
  aiSummary: string | null;
  aiMatchPoints: string[];
  aiGapPoints: string[];
  initialMarkdown: string;
  initialTailoredResumeId: string | null;
  masterResume: string;
}

export function TailorPanel({
  jobId,
  jobTitle,
  jobCompany,
  jobDescription,
  jobUrl,
  jobLocation,
  jobLocationType,
  jobType,
  jobSalary,
  jobPostedAt,
  jobSkills,
  aiScore,
  aiSummary,
  aiMatchPoints,
  aiGapPoints,
  initialMarkdown,
  initialTailoredResumeId,
  masterResume,
}: TailorPanelProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [pdfMarkdown, setPdfMarkdown] = useState(initialMarkdown);
  const [tailoredResumeId, setTailoredResumeId] = useState<string | null>(
    initialTailoredResumeId
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [jdCollapsed, setJdCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const router = useRouter();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMarkdownChange(value: string) {
    setMarkdown(value);

    // Debounce PDF re-render to avoid constant flickering while typing
    if (pdfTimerRef.current) clearTimeout(pdfTimerRef.current);
    pdfTimerRef.current = setTimeout(() => setPdfMarkdown(value), 1500);

    if (!tailoredResumeId) return; // no ID yet — save happens after stream ends

    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      fetch("/api/tailor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailoredResumeId, jobId, markdown: value }),
      })
        .then((res) => setSaveStatus(res.ok ? "saved" : "error"))
        .catch(() => setSaveStatus("error"));
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pdfTimerRef.current) clearTimeout(pdfTimerRef.current);
    };
  }, []);

  function handleShowPreview() {
    setShowPreview(true);
  }

  function handleExportTriggered() {
    if (!tailoredResumeId) return;
    // Fire-and-forget: mark exported in DB
    fetch("/api/tailor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tailoredResumeId, jobId, markdown, wasExported: true }),
    }).catch(console.error);
    // Open original job listing in new tab, redirect current tab to pipeline
    window.open(jobUrl, "_blank", "noopener,noreferrer");
    router.push("/pipeline");
  }

  const filename = `${jobTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-resume.pdf`;

  return (
    <>
      {/* ── Desktop (md+) ───────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 top-16 z-10 hidden bg-[var(--bg)] md:flex overflow-hidden">
        <JobDescriptionPane
          jobId={jobId}
          title={jobTitle}
          company={jobCompany}
          description={jobDescription}
          jobUrl={jobUrl}
          location={jobLocation}
          locationType={jobLocationType}
          jobType={jobType}
          salary={jobSalary}
          postedAt={jobPostedAt}
          skills={jobSkills}
          aiScore={aiScore}
          aiSummary={aiSummary}
          aiMatchPoints={aiMatchPoints}
          aiGapPoints={aiGapPoints}
          isCollapsed={jdCollapsed}
          onToggleCollapse={() => setJdCollapsed((c) => !c)}
        />

        {/* Editor — hidden on md when showPreview, always visible on xl */}
        <div
          className={`flex min-w-0 flex-1 flex-col overflow-hidden ${
            showPreview ? "hidden xl:flex" : "flex"
          }`}
        >
          <GeneratePane
            jobId={jobId}
            tailoredResumeId={tailoredResumeId}
            onResumeIdChange={setTailoredResumeId}
            markdown={markdown}
            onMarkdownChange={handleMarkdownChange}
            saveStatus={saveStatus}
            onShowPreview={handleShowPreview}
            masterResume={masterResume}
          />
        </div>

        {/* PDF preview — replaces editor on md, shown alongside on xl */}
        {showPreview && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-[var(--border)]">
            <PDFPreview
              markdown={pdfMarkdown}
              filename={filename}
              onBack={() => setShowPreview(false)}
              onMarkApplied={handleExportTriggered}
            />
          </div>
        )}
      </div>

      {/* ── Mobile (<md) ────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 top-16 z-10 flex flex-col overflow-hidden bg-[var(--bg)] md:hidden">
        <MobileTabBar
          activeTab={mobileTab}
          hasResume={!!markdown}
          onChange={setMobileTab}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          {mobileTab === "jd" && (
            <div className="h-full overflow-y-auto px-4 py-4">
              <a
                href={`/jobs/${jobId}`}
                className="mb-3 block text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                ← View full details
              </a>
              <h2 className="mb-1 text-sm font-bold text-[var(--text)]">{jobTitle}</h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">{jobCompany}</p>
              <JobDescription source={jobDescription} />
            </div>
          )}
          {mobileTab === "editor" && (
            <GeneratePane
              jobId={jobId}
              tailoredResumeId={tailoredResumeId}
              onResumeIdChange={setTailoredResumeId}
              markdown={markdown}
              onMarkdownChange={handleMarkdownChange}
              saveStatus={saveStatus}
              onShowPreview={() => setMobileTab("preview")}
              masterResume={masterResume}
            />
          )}
          {mobileTab === "preview" && (
            <PDFPreview
              markdown={pdfMarkdown}
              filename={filename}
              onBack={() => setMobileTab("editor")}
              onMarkApplied={handleExportTriggered}
            />
          )}
        </div>
      </div>
    </>
  );
}
