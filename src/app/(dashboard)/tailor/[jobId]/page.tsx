import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TailorPanel } from "@/components/tailor/TailorPanel";
import type { Metadata } from "next";

const getTailorJob = cache(async (jobId: string) => {
  return prisma.job.findFirst({
    where: { id: jobId },
    include: {
      jobPool: true,
      profile: { select: { userId: true, masterResume: true } },
      application: {
        include: {
          tailoredResumes: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, markdown: true },
          },
        },
      },
    },
  });
});

interface Props {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const { userId } = await auth();
  if (!userId) return { title: "Tailor resume" };

  const job = await getTailorJob(jobId);

  if (!job || job.profile.userId !== userId) return { title: "Tailor resume" };

  return { title: `Tailor — ${job.jobPool.title} at ${job.jobPool.company}` };
}

export default async function TailorPage({ params }: Props) {
  const { jobId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const job = await getTailorJob(jobId);

  if (!job || job.profile.userId !== userId) notFound();

  const pool = job.jobPool;
  const latest = job.application?.tailoredResumes[0] ?? null;

  return (
    <TailorPanel
      jobId={job.id}
      jobTitle={pool.title}
      jobCompany={pool.company}
      jobDescription={pool.description}
      jobUrl={pool.url}
      jobLocation={pool.location ?? null}
      jobLocationType={pool.locationType ?? null}
      jobType={pool.jobType ?? null}
      jobSalary={pool.salary ?? null}
      jobPostedAt={pool.postedAt?.toISOString() ?? null}
      jobSkills={pool.skills}
      aiScore={job.aiScore ?? null}
      aiSummary={job.aiSummary ?? null}
      aiMatchPoints={job.aiMatchPoints}
      aiGapPoints={job.aiGapPoints}
      initialMarkdown={latest?.markdown ?? ""}
      initialTailoredResumeId={latest?.id ?? null}
      masterResume={job.profile.masterResume ?? ""}
    />
  );
}
