"use client";

import { useTransition, useState, useEffect, useRef } from "react";

import { adminCopyProfileToAdmin } from "@/app/(admin)/actions";

interface CopyProfileButtonProps {
  profileId: string;
  profileName: string;
}

export function CopyProfileButton({
  profileId,
  profileName,
}: CopyProfileButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  function handleCopy(mode: "full" | "metadata" | "reset") {
    setIsOpen(false);
    startTransition(async () => {
      try {
        await adminCopyProfileToAdmin({ profileId, mode });
        setResult("success");
      } catch {
        setResult("error");
      }
    });
  }

  // Clear result message after 2 seconds
  useEffect(() => {
    if (!result) return;

    const timeout = setTimeout(() => setResult(null), 2000);
    return () => clearTimeout(timeout);
  }, [result]);

  const buttonLabel = isPending
    ? "Copying..."
    : result === "success"
      ? "Copied!"
      : result === "error"
        ? "Failed"
        : "Copy";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isPending || result !== null}
        className={`inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          result === "success"
            ? "text-emerald-500"
            : result === "error"
              ? "text-red-500"
              : "text-[var(--text)] hover:bg-[var(--bg-subtle)]"
        }`}
        title={`Copy "${profileName}" to your account`}
      >
        {buttonLabel}
        {!isPending && result === null && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-[var(--text-muted)]"
          >
            <path
              d="M3 5L6 8L9 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
          <button
            type="button"
            onClick={() => handleCopy("full")}
            className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            Full copy (with jobs)
          </button>
          <button
            type="button"
            onClick={() => handleCopy("reset")}
            className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            Reset copy (all jobs as new)
          </button>
          <button
            type="button"
            onClick={() => handleCopy("metadata")}
            className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            Metadata only
          </button>
        </div>
      )}
    </div>
  );
}
