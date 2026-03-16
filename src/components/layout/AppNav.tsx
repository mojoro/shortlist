"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { APP_CONFIG } from "@/config/app";
import { BrandMark } from "@/components/ui/BrandMark";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconFeed() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPipeline() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Feed",
    href: "/dashboard",
    // Tailor pages are part of the Feed flow — entered from a job card
    matches: ["/dashboard", "/jobs", "/tailor"],
    icon: <IconFeed />,
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    matches: ["/pipeline"],
    icon: <IconPipeline />,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Classes for the hidden label that slides in on sidebar hover */
const LABEL =
  "overflow-hidden whitespace-nowrap max-w-0 opacity-0 " +
  "group-hover:max-w-[160px] group-hover:opacity-100 " +
  "transition-all duration-200 ease-out";

// ── Component ─────────────────────────────────────────────────────────────────

interface AppNavProps {
  followUpCount?: number;
}

export function AppNav({ followUpCount = 0 }: AppNavProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  const initial =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ??
    "?";
  const isDark = resolvedTheme === "dark";

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={[
          "group fixed left-0 top-0 z-40",
          "hidden sm:flex flex-col",
          "h-full w-16 hover:w-[220px]",
          "transition-[width] duration-200 ease-out",
          "border-r border-[var(--border)] bg-[var(--bg-card)]",
        ].join(" ")}
        aria-label="App navigation"
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-[var(--border)] px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-sm transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <BrandMark size="lg" />
            <span className={`${LABEL} text-[15px] font-semibold text-[var(--text)]`}>
              {APP_CONFIG.name}
            </span>
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-4">
          {NAV_ITEMS.map(({ label, href, matches, icon }) => {
            const isCurrent = matches.some((m) => pathname.startsWith(m));
            return (
              <Link
                key={label}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={[
                  "flex h-10 w-10 mx-auto items-center justify-center gap-3 rounded-lg transition-all duration-200 ease-out",
                  "group-hover:w-full group-hover:mx-0 group-hover:px-2.5 group-hover:justify-start",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
                  isCurrent
                    ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                <span className="shrink-0">{icon}</span>
                <span className={`${LABEL} flex items-center gap-2 text-sm font-medium`}>
                  {label}
                  {label === "Pipeline" && followUpCount > 0 && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
                      {followUpCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme + account */}
        <div className="shrink-0 space-y-0.5 border-t border-[var(--border)] px-2 py-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
            suppressHydrationWarning
            className="flex h-10 w-10 mx-auto items-center justify-center gap-3 rounded-lg text-[var(--text-muted)] transition-all duration-200 ease-out hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] group-hover:w-full group-hover:mx-0 group-hover:px-2.5 group-hover:justify-start"
          >
            <span className="shrink-0" suppressHydrationWarning>
              {mounted ? (isDark ? <IconSun /> : <IconMoon />) : <IconMoon />}
            </span>
            <span className={`${LABEL} text-sm font-medium`} suppressHydrationWarning>
              {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
            </span>
          </button>

          {/* Account */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex h-10 w-10 mx-auto items-center justify-center gap-3 rounded-lg transition-all duration-200 ease-out hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] group-hover:w-full group-hover:mx-0 group-hover:px-2.5 group-hover:justify-start"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-semibold">
                {initial}
              </span>
              <span className={`${LABEL} text-left text-sm font-medium text-[var(--text-muted)]`}>
                {user?.firstName ?? "Account"}
              </span>
            </button>

            {/* Account dropdown — opens above and to the right */}
            {menuOpen && (
              <div
                className="absolute bottom-12 left-0 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1"
                style={{ boxShadow: "var(--shadow-card-hover)" }}
                role="menu"
              >
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
                <div className="py-1">
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
                  >
                    <IconSettings />
                    Settings
                  </Link>
                  <div className="mx-4 my-1 border-t border-[var(--border)]" />
                  <SignOutButton redirectUrl="/">
                    <button
                      role="menuitem"
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
                    >
                      <IconSignOut />
                      Sign out
                    </button>
                  </SignOutButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-[var(--border)] bg-[var(--bg-card)] sm:hidden"
        aria-label="Main navigation"
        style={{ boxShadow: "0 -1px 0 var(--border)" }}
      >
        {NAV_ITEMS.map(({ label, href, matches, icon }) => {
          const isCurrent = matches.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={label}
              href={href}
              aria-current={isCurrent ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors",
                isCurrent
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {icon}
              <span>{label}</span>
              {label === "Pipeline" && followUpCount > 0 && (
                <span className="absolute mt-[-18px] ml-8 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
                  {followUpCount}
                </span>
              )}
            </Link>
          );
        })}
        {/* Account item on mobile */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={[
            "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors",
            menuOpen ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]",
          ].join(" ")}
          aria-label="Account"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-[9px] font-bold">
            {initial}
          </span>
          <span>Account</span>
        </button>

        {/* Mobile account sheet */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-full right-0 w-64 rounded-t-xl border-t border-[var(--border)] bg-[var(--bg-card)] py-1"
            style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}
            role="menu"
          >
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
            <div className="py-1">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
                suppressHydrationWarning
              >
                <span className="shrink-0" suppressHydrationWarning>
                  {mounted ? (isDark ? <IconSun /> : <IconMoon />) : <IconMoon />}
                </span>
                <span suppressHydrationWarning>
                  {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
                </span>
              </button>
              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
              >
                <IconSettings />
                Settings
              </Link>
              <div className="mx-4 my-1 border-t border-[var(--border)]" />
              <SignOutButton redirectUrl="/">
                <button
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]"
                >
                  <IconSignOut />
                  Sign out
                </button>
              </SignOutButton>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
