import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { APP_CONFIG } from "@/config/app";
import { AppNav } from "@/components/layout/AppNav";
import { fetchDashboardData } from "@/app/(dashboard)/actions-sync";
import { DashboardDataProvider } from "@/components/providers/DashboardDataProvider";
import type { HydrationPayload } from "@/lib/store";

export const metadata: Metadata = {
  title: {
    template: `%s — ${APP_CONFIG.name}`,
    default: APP_CONFIG.name,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const data = await fetchDashboardData(userId);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AppNav followUpCount={data.followUpCount} />
      {/* sm:ml-16 offsets the 64px fixed sidebar on desktop */}
      {/* pb-24 adds space for the mobile bottom tab bar */}
      <div className="sm:ml-16">
        <main className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 sm:pb-8">
          {data.activeProfile ? (
            <DashboardDataProvider data={data as HydrationPayload}>
              {children}
            </DashboardDataProvider>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
