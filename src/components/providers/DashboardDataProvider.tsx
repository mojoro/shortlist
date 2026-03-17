"use client";

import { useRef, useEffect } from "react";
import { useDashboardStore } from "@/lib/store";
import type { HydrationPayload } from "@/lib/store";

interface Props {
  data: HydrationPayload;
  children: React.ReactNode;
}

export function DashboardDataProvider({ data, children }: Props) {
  const hydrate = useDashboardStore((s) => s.hydrate);
  const sync = useDashboardStore((s) => s.sync);
  const hydrated = useDashboardStore((s) => s.hydrated);
  const lastSyncedAt = useDashboardStore((s) => s.lastSyncedAt);

  // Hydrate synchronously on first render — NOT in useEffect.
  // This ensures the store is populated before any child component renders.
  // If DashboardPrefetcher already hydrated the store from the landing page,
  // use the server's fresher data (it was fetched at request time, not earlier).
  const didHydrate = useRef(false);
  if (!didHydrate.current) {
    // Always hydrate from the server's data — it's authoritative and fresher
    // than any client-side prefetch that may have happened on the landing page.
    hydrate(data);
    didHydrate.current = true;
  }

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
