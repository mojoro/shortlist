"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

/* ─── Hero CTA buttons ────────────────────────────────────── */

export function HeroCTA() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show signed-in CTA only after Clerk confirms auth; default to signed-out buttons
  if (isLoaded && isSignedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-lg bg-[#22d3ee] px-7 text-sm font-semibold text-[#080808] transition-all hover:opacity-90"
        >
          Go to dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/sign-up"
        className="inline-flex h-11 items-center rounded-lg bg-[#22d3ee] px-7 text-sm font-semibold text-[#080808] transition-all hover:opacity-90"
      >
        Get started free
      </Link>
      <Link
        href="/sign-in"
        className="inline-flex h-11 items-center rounded-lg border border-[#222] px-7 text-sm font-medium text-[#999] transition-colors hover:border-[#444] hover:text-white"
      >
        Sign in
      </Link>
    </div>
  );
}

/* ─── Bottom CTA strip ────────────────────────────────────── */

export function BottomCTA() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show signed-in CTA only after Clerk confirms auth; default to signed-out
  if (isLoaded && isSignedIn) {
    return (
      <>
        <h2 className="text-[clamp(22px,4vw,30px)] font-black leading-[1.1] tracking-[-0.03em]">
          Keep going.
          <br />
          <span className="text-[#555]">Your matches are waiting.</span>
        </h2>
        <p className="mt-3 text-[13px] text-[#888]">
          Pick up where you left off.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center rounded-lg bg-[#22d3ee] px-8 text-sm font-semibold text-[#080808] transition-all hover:opacity-90"
        >
          Go to dashboard →
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="text-[clamp(22px,4vw,30px)] font-black leading-[1.1] tracking-[-0.03em]">
        Start your search.
        <br />
        <span className="text-[#555]">It&apos;s free.</span>
      </h2>
      <p className="mt-3 text-[13px] text-[#888]">
        Set up your profile in under two minutes.
      </p>
      <Link
        href="/sign-up"
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-[#22d3ee] px-8 text-sm font-semibold text-[#080808] transition-all hover:opacity-90"
      >
        Get started free
      </Link>
    </>
  );
}
