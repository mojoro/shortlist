"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { APP_CONFIG } from "@/config/app";

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
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

        {/* Right side: email + theme toggle */}
        <div className="flex items-center gap-3">
          {user?.primaryEmailAddress && (
            <span className="hidden text-xs text-[var(--text-muted)] sm:block">
              {user.primaryEmailAddress.emailAddress}
            </span>
          )}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] transition-all hover:border-[var(--border-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={mounted ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
            suppressHydrationWarning
          >
            {/* Only render after mount so server and client agree on the initial icon */}
            {mounted && (resolvedTheme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ))}
          </button>
        </div>
      </div>
    </header>
  );
}
