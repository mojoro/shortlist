"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

interface SignedInHeroProps {
  dashboardHref: string;
}

export function SignedInHero({ dashboardHref }: SignedInHeroProps) {
  const { user } = useUser();
  const firstName = user?.firstName;

  return (
    <div>
      <h1
        style={{
          fontSize: "clamp(40px, 7vw, 64px)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.0,
          color: "#fff",
          marginBottom: "28px",
        }}
      >
        Welcome back
        {firstName ? (
          <>
            ,<br />
            {firstName}.
          </>
        ) : (
          "."
        )}
      </h1>
      <Link
        href={dashboardHref}
        className="inline-flex h-11 items-center rounded-lg px-7 text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: "#22d3ee", color: "#080808" }}
      >
        Go to dashboard →
      </Link>
    </div>
  );
}
