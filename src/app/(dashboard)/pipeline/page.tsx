import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PipelineStats } from "@/components/pipeline/PipelineStats";
import { FollowUpBanner } from "@/components/pipeline/FollowUpBanner";
import { PipelineTable } from "@/components/pipeline/PipelineTable";
import type { ApplicationWithJob } from "@/types";

export const metadata: Metadata = { title: "Your pipeline" };

export default async function PipelinePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  try {
    const profile = await prisma.profile.findFirst({
      where: { userId },
      orderBy: { isActive: "desc" },
      select: { id: true },
    });

    if (!profile) {
      return (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-[var(--text)]">
            Set up your profile first to start tracking applications.
          </p>
        </div>
      );
    }

    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);

    const applications = await prisma.application.findMany({
      where: { profileId: profile.id },
      include: {
        job: {
          include: { jobPool: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const TERMINAL = new Set(["ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED"]);
    const activeApps = applications.filter((a) => !TERMINAL.has(a.status));
    const closedApps = applications.filter((a) => TERMINAL.has(a.status));

    const followUpDue = activeApps.filter(
      (a) => a.followUpAt && new Date(a.followUpAt) <= endOfToday
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Your pipeline
          </h1>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {applications.length === 0
              ? "No applications yet"
              : `${activeApps.length} active application${activeApps.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <PipelineStats
          activeCount={activeApps.length}
          appliedCount={applications.filter((a) => a.status === "APPLIED").length}
          interviewingCount={applications.filter((a) => a.status === "INTERVIEWING").length}
          offerCount={applications.filter((a) => a.status === "OFFER").length}
        />

        {followUpDue.length > 0 && (
          <FollowUpBanner dueApplications={followUpDue as ApplicationWithJob[]} />
        )}

        <PipelineTable
          activeApplications={activeApps as ApplicationWithJob[]}
          closedApplications={closedApps as ApplicationWithJob[]}
        />
      </div>
    );
  } catch {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-[var(--text)]">
          Couldn&apos;t load your pipeline right now
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          We&apos;re having trouble connecting. Try refreshing in a moment.
        </p>
      </div>
    );
  }
}
