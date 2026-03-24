"use client";

// Lazily access the store to avoid pulling server-side imports into the
// module graph during test environments (store.ts → dashboard/actions.ts
// → openrouter.ts → server-only env vars).
let _getStoreState: (() => { activeProfile: { id: string; name: string } | null }) | null = null;

async function loadStore() {
  if (!_getStoreState) {
    const { useDashboardStore } = await import("@/lib/store");
    _getStoreState = () => useDashboardStore.getState() as { activeProfile: { id: string; name: string } | null };
  }
  return _getStoreState();
}

export async function getFeedbackMetadata(recentErrors: string[]) {
  const state = await loadStore();
  const activeProfile = state?.activeProfile ?? null;
  return {
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    profileId: activeProfile?.id ?? null,
    profileName: activeProfile?.name ?? null,
    recentErrors,
    timestamp: new Date().toISOString(),
  };
}
