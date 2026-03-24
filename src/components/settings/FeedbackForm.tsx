"use client";

import { useState, useTransition } from "react";
import { submitFeedback } from "@/app/(dashboard)/settings/feedback-actions";
import { useErrorBuffer } from "@/lib/use-error-buffer";
import { getFeedbackMetadata } from "@/lib/get-feedback-metadata";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [isPending, startTransition] = useTransition();

  const { getRecentErrors } = useErrorBuffer();

  const charCount = message.length;
  const isValid = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;

  function handleSubmit() {
    if (!isValid || isPending) return;

    startTransition(async () => {
      try {
        const metadata = await getFeedbackMetadata(getRecentErrors());
        await submitFeedback({ message, metadata });
        setMessage("");
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setErrorText(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          aria-label="Your feedback"
          placeholder="What could we improve? What's working well?"
          rows={4}
          maxLength={MAX_LENGTH}
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        <span
          className={`absolute bottom-2.5 right-3 text-xs ${
            charCount > MAX_LENGTH || (charCount > 0 && charCount < MIN_LENGTH)
              ? "text-red-500"
              : "text-[var(--text-muted)]"
          }`}
        >
          {charCount}/{MAX_LENGTH}
        </span>
      </div>

      {charCount > 0 && charCount < MIN_LENGTH && (
        <p className="text-xs text-red-500">
          At least {MIN_LENGTH} characters needed
        </p>
      )}

      {status === "success" && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Thanks for your feedback!
        </p>
      )}

      {status === "error" && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorText}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid || isPending}
        className="inline-flex min-h-[36px] items-center rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-fg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {isPending ? "Sending..." : "Send feedback"}
      </button>
    </div>
  );
}
