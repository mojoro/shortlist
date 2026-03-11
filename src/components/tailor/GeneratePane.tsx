"use client";

import dynamic from "next/dynamic";
import { useState, useRef } from "react";
import { AutoSaveIndicator, type SaveStatus } from "@/components/tailor/AutoSaveIndicator";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
      Loading editor…
    </div>
  ),
});

type PaneState = "idle" | "streaming" | "editor";

interface GeneratePaneProps {
  jobId: string;
  tailoredResumeId: string | null;
  onResumeIdChange: (id: string) => void;
  markdown: string;
  onMarkdownChange: (value: string) => void;
  saveStatus: SaveStatus;
  onShowPreview: () => void;
}

export function GeneratePane({
  jobId,
  tailoredResumeId,
  onResumeIdChange,
  markdown,
  onMarkdownChange,
  saveStatus,
  onShowPreview,
}: GeneratePaneProps) {
  const [paneState, setPaneState] = useState<PaneState>(markdown ? "editor" : "idle");
  const [additionalContext, setAdditionalContext] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    setError(null);
    setStreamingText("");
    setPaneState("streaming");
    setConfirmRegenerate(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          additionalContext: additionalContext.trim() || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Generation failed. Please try again.");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(fullText);
      }

      // Stream done — persist to DB and get ID
      onMarkdownChange(fullText);
      const saveRes = await fetch("/api/tailor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, markdown: fullText }),
      });

      if (saveRes.ok) {
        const data = await saveRes.json() as { tailoredResumeId: string };
        onResumeIdChange(data.tailoredResumeId);
      }

      setPaneState("editor");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPaneState("idle");
        return;
      }
      setError((err as Error).message ?? "Something went wrong. Please try again.");
      setPaneState("idle");
    }
  }

  // ── Idle state ──────────────────────────────────────────────────────────
  if (paneState === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-2 text-2xl text-[var(--accent)]">✦</div>
          <h2 className="mb-1 text-base font-bold text-[var(--text)]">
            {markdown ? "Generate a new version" : "Generate tailored resume"}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {markdown
              ? "This will replace your current version. Update your instructions below if needed."
              : "AI reads your full experience profile, picks the most relevant parts for this role, and writes a focused resume."}
          </p>
        </div>

        {error && (
          <p className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="w-full max-w-sm space-y-3">
          <div>
            <label
              htmlFor="additional-context"
              className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
            >
              Additional instructions{" "}
              <span className="font-normal opacity-60">(optional)</span>
            </label>
            <textarea
              id="additional-context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. Focus on my Python experience. Keep it to one page. I'm applying as a senior, emphasise team leadership."
              maxLength={500}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
            <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
              {additionalContext.length}/500
            </p>
          </div>

          <div className="flex gap-2">
            {markdown && (
              <button
                onClick={() => setPaneState("editor")}
                className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                ← Back to editor
              </button>
            )}
            <button
              onClick={handleGenerate}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Streaming state ──────────────────────────────────────────────────────
  if (paneState === "streaming") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
          <span className="text-xs text-[var(--text-muted)]">Tailoring your resume…</span>
          <button
            onClick={() => abortRef.current?.abort()}
            className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Cancel
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text)]">
            {streamingText}
            <span className="inline-block h-4 w-0.5 animate-pulse bg-[var(--accent)]" />
          </pre>
        </div>
      </div>
    );
  }

  // ── Editor state ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2">
        <AutoSaveIndicator status={saveStatus} />
        <div className="flex items-center gap-2">
          {confirmRegenerate ? (
            <>
              <span className="text-xs text-[var(--text-muted)]">Overwrite your edits?</span>
              <button
                onClick={() => {
                  setConfirmRegenerate(false);
                  setPaneState("idle"); // go to idle so user can update instructions
                }}
                className="text-xs font-medium text-red-500 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Yes, regenerate
              </button>
              <button
                onClick={() => setConfirmRegenerate(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmRegenerate(true)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              ↺ Regenerate
            </button>
          )}
          <button
            onClick={onShowPreview}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Preview & Export →
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1" data-color-mode="auto">
        <MDEditor
          value={markdown}
          onChange={(v) => onMarkdownChange(v ?? "")}
          height="100%"
          preview="edit"
        />
      </div>
    </div>
  );
}
