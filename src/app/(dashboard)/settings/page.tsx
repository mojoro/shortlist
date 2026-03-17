import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/get-active-profile";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [profile, allProfiles] = await Promise.all([
    getActiveProfile(userId),
    prisma.profile.findMany({
      where:   { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!profile) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your profile, search criteria, and resume.
        </p>
      </div>
      <SettingsClient key={profile.id} profile={profile} allProfiles={allProfiles} />
    </div>
  );
}
