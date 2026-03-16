"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchProfile } from "@/app/(dashboard)/settings/actions";

interface Profile {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProfileSwitcherProps {
  profiles: Profile[];
  activeProfileId: string;
}

export function ProfileSwitcher({ profiles, activeProfileId }: ProfileSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSwitch(profileId: string) {
    if (profileId === activeProfileId) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      await switchProfile({ profileId });
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-all",
          "hover:border-[var(--border-strong)] hover:text-[var(--text)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          isPending ? "opacity-60 cursor-wait" : "cursor-pointer",
        ].join(" ")}
      >
        <span className="max-w-[140px] truncate text-[var(--text)]">
          {activeProfile?.name ?? "Profile"}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-lg">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleSwitch(profile.id)}
              className={[
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                "hover:bg-[var(--bg-subtle)] focus-visible:outline-none",
                profile.id === activeProfileId
                  ? "font-semibold text-[var(--text)]"
                  : "text-[var(--text-muted)]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  profile.id === activeProfileId ? "bg-[var(--accent)]" : "bg-transparent",
                ].join(" ")}
              />
              <span className="truncate">{profile.name}</span>
              {profile.id === activeProfileId && (
                <span className="ml-auto shrink-0 text-[var(--accent)]">✓</span>
              )}
            </button>
          ))}
          <div className="mt-1 border-t border-[var(--border)] px-3 py-2 flex items-center justify-between gap-2">
            <a
              href="/settings"
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              Manage profiles →
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center gap-0.5 rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-fg)] hover:opacity-90"
            >
              + New
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
