"use client";
import { useDashboardStore } from "@/lib/store";

export function getFeedbackMetadata(recentErrors: string[]) {
  const activeProfile = useDashboardStore.getState().activeProfile;
  return {
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    profileId: activeProfile?.id ?? null,
    profileName: activeProfile?.name ?? null,
    recentErrors,
    timestamp: new Date().toISOString(),
  };
}
