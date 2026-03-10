"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { APP_CONFIG } from "@/config/app";

const NAV_TABS = [
  { label: "Feed", href: "/dashboard", active: true },
  { label: "Detail", href: "/jobs", active: false },
  { label: "Tailor", href: "/tailor", active: false },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="border-b border-[--border] bg-[--bg-card]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold text-[--text] hover:opacity-80 transition-opacity"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[--accent] text-[--accent-fg] text-xs font-bold"
            aria-hidden="true"
          >
            S
          </span>
          {APP_CONFIG.name}
        </Link>

        {/* Center tabs */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {NAV_TABS.map(({ label, href, active }) => {
            const isCurrent = active && pathname.startsWith(href);
            if (!active) {
              return (
                <span
                  key={label}
                  className="cursor-not-allowed select-none rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[--text-muted] opacity-40"
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
                  "rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
                  isCurrent
                    ? "bg-[--accent] text-[--accent-fg]"
                    : "text-[--text-muted] hover:text-[--text]",
                ].join(" ")}
                aria-current={isCurrent ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: email + theme toggle */}
        <div className="flex items-center gap-3">
          {user?.primaryEmailAddress && (
            <span className="hidden text-xs text-[--text-muted] sm:block">
              {user.primaryEmailAddress.emailAddress}
            </span>
          )}
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="flex h-8 w-8 items-center justify-center rounded-md text-[--text-muted] transition-colors hover:bg-[--bg-subtle] hover:text-[--text] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            {resolvedTheme === "dark" ? (
              // Sun icon
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              // Moon icon
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
