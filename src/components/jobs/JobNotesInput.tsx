"use client";

import { useState, useRef, useEffect } from "react";
import { updateJobNotes } from "@/app/(dashboard)/dashboard/actions";

interface JobNotesInputProps {
  jobId: string;
  profileId: string;
  initialNotes: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function JobNotesInput({ jobId, profileId, initialNotes }: JobNotesInputProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateJobNotes(jobId, profileId, value);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="job-notes"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
        >
          Your notes
        </label>
        {saveStatus === "saving" && (
          <span className="text-xs text-[var(--text-muted)]">Saving…</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-[var(--text-muted)]">Saved</span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs text-red-500 dark:text-red-400">Couldn&apos;t save</span>
        )}
      </div>
      <textarea
        id="job-notes"
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        rows={4}
        placeholder="Keep track of anything relevant about this listing…"
        className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      />
    </div>
  );
}
