"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { APP_CONFIG } from "@/config/app";
import { BrandMark } from "@/components/ui/BrandMark";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMessageSquare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
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

function IconArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", exact: true, icon: <IconGrid /> },
  { label: "Users", href: "/admin/users", exact: false, icon: <IconUsers /> },
  { label: "Feedback", href: "/admin/feedback", exact: false, icon: <IconMessageSquare /> },
  { label: "Pool", href: "/admin/pool", exact: false, icon: <IconDatabase /> },
  { label: "System", href: "/admin/system", exact: false, icon: <IconActivity /> },
  { label: "Analytics", href: "/admin/analytics", exact: false, icon: <IconBarChart /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <BrandMark size="sm" />
          <span className="text-sm font-semibold text-[var(--text)]">
            {APP_CONFIG.name} Admin
          </span>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <IconArrowLeft />
          <span>Back</span>
        </Link>
      </div>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className={[
          "fixed left-0 top-0 z-40",
          "hidden sm:flex flex-col",
          "h-full w-56",
          "border-r border-[var(--border)] bg-[var(--bg-card)]",
        ].join(" ")}
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-[var(--border)] px-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-sm transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <BrandMark size="lg" />
            <span className="text-[15px] font-semibold text-[var(--text)]">
              Admin
            </span>
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
          {NAV_ITEMS.map(({ label, href, exact, icon }) => {
            const isCurrent = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={[
                  "flex h-10 w-full items-center gap-3 rounded-lg px-3 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
                  isCurrent
                    ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                <span className="shrink-0">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 space-y-0.5 border-t border-[var(--border)] px-3 py-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
            suppressHydrationWarning
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
          >
            <span className="shrink-0" suppressHydrationWarning>
              {mounted ? (isDark ? <IconSun /> : <IconMoon />) : <IconMoon />}
            </span>
            <span className="text-sm font-medium" suppressHydrationWarning>
              {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
            </span>
          </button>

          {/* Back to app */}
          <Link
            href="/dashboard"
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
          >
            <span className="shrink-0">
              <IconArrowLeft />
            </span>
            <span className="text-sm font-medium">Back to app</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
