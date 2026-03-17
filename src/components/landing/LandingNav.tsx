"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { APP_CONFIG } from "@/config/app";

interface LandingNavProps {
  isSignedIn: boolean;
}

export function LandingNav({ isSignedIn }: LandingNavProps) {
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ??
    "?";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header style={{ backgroundColor: "#080808" }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#22d3ee" />
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
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center rounded-lg px-4 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#22d3ee", color: "#080808" }}
              >
                Dashboard →
              </Link>

              {/* Avatar chip + dropdown */}
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  style={{
                    border: "1px solid #333",
                    borderRadius: "999px",
                    padding: "3px 10px",
                    fontSize: "12px",
                    color: "#fff",
                    background: "transparent",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#555")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                >
                  {initial}
                </button>

                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "#111",
                      border: "1px solid #222",
                      borderRadius: "8px",
                      minWidth: "148px",
                      padding: "4px",
                      zIndex: 50,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    }}
                  >
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "7px 10px",
                        fontSize: "13px",
                        color: "#ccc",
                        borderRadius: "5px",
                        textDecoration: "none",
                        transition: "background 0.1s, color 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#1a1a1a";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#ccc";
                      }}
                    >
                      Settings
                    </Link>
                    <SignOutButton>
                      <button
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "7px 10px",
                          fontSize: "13px",
                          color: "#ccc",
                          background: "transparent",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          transition: "background 0.1s, color 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#1a1a1a";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#ccc";
                        }}
                      >
                        Sign out
                      </button>
                    </SignOutButton>
                  </div>
                )}
              </div>
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
                className="inline-flex h-8 items-center rounded-lg px-4 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#22d3ee", color: "#080808" }}
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
