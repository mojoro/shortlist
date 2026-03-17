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
  const lastSyncedAt = useDashboardStore((s) => s.lastSyncedAt);

  // Hydrate synchronously on first render — NOT in useEffect.
  // This ensures the store is populated before any child component renders.
  const didHydrate = useRef(false);
  if (!didHydrate.current) {
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
