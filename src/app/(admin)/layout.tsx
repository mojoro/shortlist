import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/env";
import { APP_CONFIG } from "@/config/app";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: {
    template: `%s — ${APP_CONFIG.name} Admin`,
    default: `${APP_CONFIG.name} Admin`,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId || userId !== env.ADMIN_USER_ID) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AdminSidebar />
      <div className="sm:ml-56">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
