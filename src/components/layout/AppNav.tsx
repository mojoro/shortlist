"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { APP_CONFIG } from "@/config/app";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { label: "Feed",     href: "/dashboard", matches: ["/dashboard", "/jobs"] },
  { label: "Pipeline", href: "/pipeline",  matches: ["/pipeline"] },
  { label: "Tailor",   href: "/tailor",    matches: ["/tailor"], disabled: true },
];

interface AppNavProps {
  followUpCount?: number;
}

export function AppNav({ followUpCount = 0 }: AppNavProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const initial =
    user?.firstName?.charAt(0).toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress.charAt(0).toUpperCase() ??
    "?";

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-card)]"
      style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-stretch px-4 sm:px-6">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="mr-8 flex shrink-0 items-center gap-2.5 self-center transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-bold shadow-sm"
            aria-hidden="true"
          >
            S
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-[var(--text)] sm:block">
            {APP_CONFIG.name}
          </span>
        </Link>

        {/* Primary navigation */}
        <nav className="flex items-stretch gap-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, href, matches, disabled }) => {
            const isCurrent = !disabled && matches.some((m) => pathname.startsWith(m));

            if (disabled) {
              return (
                <span
                  key={label}
                  className="inline-flex cursor-not-allowed select-none items-center px-4 text-sm font-medium text-[var(--text-muted)] opacity-35"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  {label}
                </span>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={[
                  "relative inline-flex items-center gap-2 px-4 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
                  isCurrent
                    ? "text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {label}

                {/* Follow-up badge */}
                {label === "Pipeline" && followUpCount > 0 && (
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
                    {followUpCount}
                  </span>
                )}

                {/* Active indicator — sits on the header's bottom border */}
                {isCurrent && (
                  <span
                    className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-[var(--accent)]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {/* Avatar / user menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="Open user menu"
              className={[
                "ml-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                "bg-[var(--accent-muted)] text-[var(--accent)]",
                "hover:ring-2 hover:ring-[var(--accent)] hover:ring-offset-2 hover:ring-offset-[var(--bg-card)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]",
              ].join(" ")}
            >
              {initial}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
                style={{ boxShadow: "var(--shadow-card-hover)" }}
                role="menu"
              >
                {/* Identity */}
                <div className="border-b border-[var(--border)] px-4 py-3">
                  {user?.firstName && (
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {user.firstName}{user.lastName ? ` ${user.lastName}` : ""}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </Link>

                  <div className="mx-4 my-1 border-t border-[var(--border)]" />

                  <SignOutButton redirectUrl="/">
                    <button
                      role="menuitem"
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign out
                    </button>
                  </SignOutButton>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
