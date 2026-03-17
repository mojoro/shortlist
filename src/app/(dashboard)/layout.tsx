import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
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

const getCachedFollowUpCount = unstable_cache(
  async (userId: string) => getFollowUpCount(userId),
  ["follow-up-count"],
  { revalidate: 300, tags: ["follow-up-count"] }
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const followUpCount = userId
    ? await getCachedFollowUpCount(userId).catch(() => 0)
    : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AppNav followUpCount={followUpCount} />
      {/* sm:ml-16 offsets the 64px fixed sidebar on desktop */}
      {/* pb-24 adds space for the mobile bottom tab bar */}
      <div className="sm:ml-16">
        <main className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6 sm:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
