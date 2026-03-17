"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { APP_CONFIG } from "@/config/app";

interface LandingNavProps {
  isSignedIn: boolean;
}

export function LandingNav({ isSignedIn }: LandingNavProps) {
  const { user } = useUser();
  const initial =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ??
    "?";
  return (
    <header style={{ backgroundColor: "#080808" }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#ffffff" />
            <path
              d="M8 17L13 22L24 10"
              stroke="#080808"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span
            style={{
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {APP_CONFIG.name}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <span
                style={{
                  border: "1px solid #333",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontSize: "12px",
                  color: "#fff",
                  background: "transparent",
                  fontWeight: 600,
                }}
              >
                {initial}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center rounded-lg bg-white px-4 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#e5e5e5]"
              >
                Dashboard →
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden text-sm font-medium text-[#555] transition-colors hover:text-[#888] sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-8 items-center rounded-lg bg-white px-4 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#e5e5e5]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
