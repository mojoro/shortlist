import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TailorPanel } from "@/components/tailor/TailorPanel";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const { userId } = await auth();
  if (!userId) return { title: "Tailor resume" };

  const job = await prisma.job.findFirst({
    where: { id: jobId },
    include: { profile: { select: { userId: true } } },
  });

  if (!job || job.profile.userId !== userId) return { title: "Tailor resume" };

  return { title: `Tailor — ${job.title} at ${job.company}` };
}

export default async function TailorPage({ params }: Props) {
  const { jobId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const job = await prisma.job.findFirst({
    where: { id: jobId },
    include: {
      profile: { select: { userId: true } },
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

  if (!job || job.profile.userId !== userId) notFound();

  const latest = job.application?.tailoredResumes[0] ?? null;

  return (
    <TailorPanel
      jobId={job.id}
      jobTitle={job.title}
      jobCompany={job.company}
      jobDescription={job.description}
      jobUrl={job.url}
      jobLocation={job.location ?? null}
      jobLocationType={job.locationType ?? null}
      jobType={job.jobType ?? null}
      jobSalary={job.salary ?? null}
      jobPostedAt={job.postedAt?.toISOString() ?? null}
      jobSkills={job.skills}
      aiScore={job.aiScore ?? null}
      aiSummary={job.aiSummary ?? null}
      aiMatchPoints={job.aiMatchPoints}
      aiGapPoints={job.aiGapPoints}
      initialMarkdown={latest?.markdown ?? ""}
      initialTailoredResumeId={latest?.id ?? null}
    />
  );
}
