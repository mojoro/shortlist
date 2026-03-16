"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BrandMark } from "@/components/ui/BrandMark";
import { APP_CONFIG } from "@/config/app";

interface LandingNavProps {
  isSignedIn: boolean;
}

export function LandingNav({ isSignedIn }: LandingNavProps) {
  const { user } = useUser();

  const initial =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ??
    null;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg-card)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark size="md" />
          <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
            {APP_CONFIG.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              {initial && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-semibold">
                  {initial}
                </span>
              )}
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Dashboard →
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-8 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Get started
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
