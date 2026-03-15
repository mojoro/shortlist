"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { APP_CONFIG } from "@/config/app";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_TABS = [
  { label: "Feed",     href: "/dashboard", matchPath: "/dashboard", active: true },
  { label: "Detail",   href: "/dashboard", matchPath: "/jobs",      active: true },
  { label: "Pipeline", href: "/pipeline",  matchPath: "/pipeline",  active: true },
  { label: "Tailor",   href: "/tailor",    matchPath: "/tailor",    active: false },
] as const;

interface AppNavProps {
  followUpCount?: number;
}

export function AppNav({ followUpCount = 0 }: AppNavProps) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <header
      className="border-b border-[var(--border)] bg-[var(--bg-card)]"
      style={{ boxShadow: "0 1px 0 var(--border), 0 2px 8px rgba(0,0,0,0.06)" }}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold shadow-sm"
            aria-hidden="true"
          >
            S
          </span>
          <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
            {APP_CONFIG.name}
          </span>
        </Link>

        {/* Center tabs */}
        <nav
          className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5"
          aria-label="Main navigation"
        >
          {NAV_TABS.map(({ label, href, matchPath, active }) => {
            const isCurrent = active && pathname.startsWith(matchPath);
            if (!active) {
              return (
                <span
                  key={label}
                  className="cursor-not-allowed select-none rounded-md px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] opacity-35"
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
                className={[
                  "relative inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  isCurrent
                    ? "bg-[var(--bg-card)] text-[var(--text)] shadow-sm ring-1 ring-inset ring-[var(--border)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
                aria-current={isCurrent ? "page" : undefined}
              >
                {label}
                {label === "Pipeline" && followUpCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {followUpCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side: email + settings + theme toggle */}
        <div className="flex items-center gap-3">
          {user?.primaryEmailAddress && (
            <span className="hidden text-xs text-[var(--text-muted)] sm:block">
              {user.primaryEmailAddress.emailAddress}
            </span>
          )}
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] transition-all hover:border-[var(--border-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <SignOutButton redirectUrl="/">
            <button
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] transition-all hover:border-[var(--border-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </SignOutButton>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
