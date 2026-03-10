import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildWhereClause } from "@/lib/jobs";
import { FilterChips } from "@/components/ui/FilterChips";
import { JobFeed } from "@/components/jobs/JobFeed";
import { APP_CONFIG } from "@/config/app";
import type { JobWithApplication } from "@/types";

export const metadata: Metadata = { title: "Your matches" };

const VALID_FILTERS = ["all", "new", "saved", "applied"] as const;

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { filter = "all" } = await searchParams;
  const safeFilter = (VALID_FILTERS as readonly string[]).includes(filter)
    ? filter
    : "all";

  const profile = await prisma.profile.findFirst({
    where: { userId },
    orderBy: { isActive: "desc" },
  });

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-[--text]">
          Welcome to {APP_CONFIG.name}
        </h1>
        <p className="mt-2 text-base text-[--text-muted]">
          You haven&apos;t set up a profile yet. Head to Settings to get started.
        </p>
      </div>
    );
  }

  const [allCount, newCount, savedCount, appliedCount, jobs] =
    await Promise.all([
      prisma.job.count({
        where: { profileId: profile.id, feedStatus: { not: "HIDDEN" } },
      }),
      prisma.job.count({
        where: { profileId: profile.id, feedStatus: "NEW" },
      }),
      prisma.job.count({
        where: { profileId: profile.id, feedStatus: "SAVED" },
      }),
      prisma.job.count({
        where: {
          profileId: profile.id,
          application: { status: { not: "INTERESTED" } },
        },
      }),
      prisma.job.findMany({
        where: buildWhereClause(profile.id, safeFilter),
        include: { application: { select: { status: true } } },
        orderBy: { aiScore: { sort: "desc", nulls: "last" } },
        take: 25,
      }),
    ]);

  const nextCursor = jobs.length === 25 ? jobs[jobs.length - 1].id : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[--text]">Your matches</h1>
        <p className="mt-1 text-sm text-[--text-muted]">
          Sorted by match score · {profile.name}
        </p>
      </div>

      <FilterChips
        allCount={allCount}
        newCount={newCount}
        savedCount={savedCount}
        appliedCount={appliedCount}
      />

      <JobFeed
        key={safeFilter}
        initialJobs={jobs as unknown as JobWithApplication[]}
        initialNextCursor={nextCursor}
        profileId={profile.id}
        filter={safeFilter}
      />
    </div>
  );
}
