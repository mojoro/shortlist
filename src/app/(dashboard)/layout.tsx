import type { Metadata } from "next";
import { APP_CONFIG } from "@/config/app";
import { AppNav } from "@/components/layout/AppNav";

export const metadata: Metadata = {
  title: {
    template: `%s — ${APP_CONFIG.name}`,
    default: APP_CONFIG.name,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[--bg]">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
