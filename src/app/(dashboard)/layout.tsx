import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { APP_CONFIG } from "@/config/app";
import { AppNav } from "@/components/layout/AppNav";
import { getFollowUpCount } from "@/app/(dashboard)/pipeline/actions";

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
  const followUpCount = userId
    ? await getFollowUpCount(userId).catch(() => 0)
    : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AppNav followUpCount={followUpCount} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
