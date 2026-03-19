"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/lib/store";
import { fetchDashboardData } from "@/app/(dashboard)/actions-sync";

interface Props {
  userId: string;
  children: React.ReactNode;
}

export function DashboardDataProvider({ userId, children }: Props) {
  const hydrate = useDashboardStore((s) => s.hydrate);
  const sync = useDashboardStore((s) => s.sync);
  const hydrated = useDashboardStore((s) => s.hydrated);
  const lastSyncedAt = useDashboardStore((s) => s.lastSyncedAt);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // If the store is already hydrated (e.g. from a previous page in the same
    // session, or from DashboardPrefetcher on the landing page), just kick off
    // a background sync to refresh any stale data and skip localStorage work.
    if (hydrated) {
      const staleMs = Date.now() - lastSyncedAt;
      if (staleMs > 30_000) sync();
      return;
    }

    // Step 1: restore from localStorage if it exists and belongs to this user.
    // This is synchronous — data is available before the next paint.
    const stored = localStorage.getItem("shortlist-dashboard");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { state?: { userId?: string } };
        if (parsed?.state?.userId === userId) {
          // Rehydrate from storage — marks store as hydrated with cached data
          useDashboardStore.persist.rehydrate();
        } else {
          // Different user — clear stale data
          localStorage.removeItem("shortlist-dashboard");
        }
      } catch {
        localStorage.removeItem("shortlist-dashboard");
      }
    }

    // Step 2: always fetch fresh data from the server in the background.
    // This updates the store (and re-persists to localStorage) silently.
    // If the fetch fails, hydrate with empty data so the page isn't stuck
    // on a skeleton forever.
    fetchDashboardData()
      .then((data) => {
        if (data) hydrate(data);
      })
      .catch(() => {
        hydrate({
          userId,
          activeProfile: null,
          profiles: [],
          jobs: [],
          applications: [],
          followUpCount: 0,
          usage: null,
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background sync on window focus (if stale > 30s)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        const staleMs = Date.now() - lastSyncedAt;
        if (staleMs > 30_000) {
          sync();
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sync, lastSyncedAt]);

  return <>{children}</>;
}
