"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useDashboardStore } from "@/lib/store";
import { fetchDashboardData } from "@/app/(dashboard)/actions-sync";

/**
 * Invisible component that prefetches dashboard data as soon as Clerk
 * confirms the user is signed in — even while they're still on the landing page.
 * By the time they click "Go to dashboard", the store is already hydrated.
 *
 * Safe to mount anywhere Clerk is available. Does nothing if not signed in.
 */
export function DashboardPrefetcher() {
  const { isLoaded, isSignedIn } = useAuth();
  const hydrate = useDashboardStore((s) => s.hydrate);
  const hydrated = useDashboardStore((s) => s.hydrated);
  const didFetch = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hydrated || didFetch.current) return;
    didFetch.current = true;

    fetchDashboardData().then((data) => {
      if (data) hydrate(data);
    });
  }, [isLoaded, isSignedIn, hydrated, hydrate]);

  return null;
}
