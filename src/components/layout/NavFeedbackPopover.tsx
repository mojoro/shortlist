"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { submitFeedback } from "@/app/(dashboard)/settings/feedback-actions";
import { useErrorBuffer } from "@/lib/use-error-buffer";
import { getFeedbackMetadata } from "@/lib/get-feedback-metadata";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

interface NavFeedbackPopoverProps {
  labelClass: string;
}

function IconFeedback() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function NavFeedbackPopover({ labelClass }: NavFeedbackPopoverProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  const { getRecentErrors } = useErrorBuffer();

  const charCount = message.length;
  const isValid = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleSubmit() {
    if (!isValid || isPending) return;
    startTransition(async () => {
      try {
        const metadata = getFeedbackMetadata(getRecentErrors());
        await submitFeedback({ message, metadata });
        setMessage("");
        setStatus("success");
        setTimeout(() => {
          setOpen(false);
          setStatus("idle");
        }, 1500);
      } catch (err) {
        setStatus("error");
        setErrorText(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    });
  }

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (status === "success") {
            setStatus("idle");
          }
        }}
        aria-label="Send feedback"
        className="flex h-10 w-full items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      >
        <span className="flex w-10 shrink-0 justify-center">
          <IconFeedback />
        </span>
        <span className={`${labelClass} text-sm font-medium`}>Feedback</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Centered modal */}
          <div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
            style={{ boxShadow: "var(--shadow-card-hover)" }}
          >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text)]">
              Send feedback
            </p>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-label="Close feedback"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {status === "success" ? (
            <p className="py-4 text-center text-sm text-green-600 dark:text-green-400">
              Thanks for your feedback!
            </p>
          ) : (
            <>
              <div className="relative mt-3">
                <textarea
                  autoFocus
                  aria-label="Your feedback"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  placeholder="What could we improve?"
                  rows={3}
                  maxLength={MAX_LENGTH}
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                />
                <span
                  className={`absolute bottom-2.5 right-3 text-[10px] ${
                    charCount > 0 && charCount < MIN_LENGTH
                      ? "text-red-500"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {charCount}/{MAX_LENGTH}
                </span>
              </div>

              {status === "error" && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errorText}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!isValid || isPending}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-fg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {isPending ? "Sending..." : "Send"}
              </button>
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}
