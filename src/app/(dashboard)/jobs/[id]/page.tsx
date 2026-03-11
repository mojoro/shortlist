import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { JobDetailActions } from "@/components/jobs/JobDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    select: { title: true, company: true },
  });
  if (!job) return { title: "Job not found" };
  return { title: `${job.title} at ${job.company}` };
}

const SCORE_CONFIGS = [
  { min: 90, label: "Strong match", color: "#16a34a" },
  { min: 75, label: "Good match",   color: "#d97706" },
  { min: 0,  label: "Weak match",   color: "#dc2626" },
] as const;

function getScoreConfig(score: number) {
  return SCORE_CONFIGS.find((c) => score >= c.min) ?? SCORE_CONFIGS[2];
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME:  "Full-time",
  PART_TIME:  "Part-time",
  CONTRACT:   "Contract",
  FREELANCE:  "Freelance",
  INTERNSHIP: "Internship",
};

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      profile: { select: { userId: true } },
    },
  });

  if (!job || job.profile.userId !== userId) notFound();

  const postedDate = job.postedAt
    ? formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })
    : null;

  const postedDateFull = job.postedAt
    ? format(new Date(job.postedAt), "MMM d, yyyy")
    : null;

  const metaParts = [
    job.location,
    job.locationType ? LOCATION_TYPE_LABELS[job.locationType] : null,
    job.jobType ? JOB_TYPE_LABELS[job.jobType] : null,
    job.salary,
  ].filter(Boolean);

  const scoreConfig = job.aiScore !== null ? getScoreConfig(job.aiScore) : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 11L5 7l4-4" />
        </svg>
        Back to feed
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)] sm:text-3xl">
          {job.title}
        </h1>
        <p className="mt-1 text-lg font-medium text-[var(--text-muted)]">{job.company}</p>
        {(metaParts.length > 0 || postedDate) && (
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            {metaParts.join(" · ")}
            {postedDate && (
              <span title={postedDateFull ?? undefined}>
                {metaParts.length > 0 ? " · " : ""}
                {postedDate}
              </span>
            )}
          </p>
        )}
        {job.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.map((skill: string) => (
              <span
                key={skill}
                className="inline-flex items-center rounded px-2 py-0.5 text-xs text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Left: Full job description */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Job description
          </h2>
          <div
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text)]">
              {job.description}
            </p>
          </div>
        </div>

        {/* Right: Match analysis + actions */}
        <div className="w-full shrink-0 lg:w-72 xl:w-80">
          {/* Score + analysis panel */}
          <div
            className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {job.aiScore !== null && scoreConfig ? (
              <>
                {/* Score header */}
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
                    style={{ backgroundColor: scoreConfig.color }}
                    aria-label={`${job.aiScore} — ${scoreConfig.label}`}
                  >
                    {job.aiScore}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {scoreConfig.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Match score</p>
                  </div>
                </div>

                {/* AI summary */}
                {job.aiSummary && (
                  <p className="mb-4 text-sm text-[var(--text-muted)]">{job.aiSummary}</p>
                )}

                {/* Match points */}
                {job.aiMatchPoints.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Why it fits
                    </p>
                    <ul className="space-y-1.5">
                      {job.aiMatchPoints.map((point: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                          <span
                            className="mt-0.5 shrink-0 font-bold text-green-600 dark:text-green-400"
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gap points */}
                {job.aiGapPoints.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Gaps to address
                    </p>
                    <ul className="space-y-1.5">
                      {job.aiGapPoints.map((point: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                          <span
                            className="mt-0.5 shrink-0 font-bold text-red-500 dark:text-red-400"
                            aria-hidden="true"
                          >
                            ✗
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="py-2 text-center">
                <p className="text-sm font-medium text-[var(--text)]">Not yet analyzed</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  A match score will appear here after the next analysis run.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <JobDetailActions
            jobId={job.id}
            profileId={job.profileId}
            feedStatus={job.feedStatus}
            externalUrl={job.url}
          />
        </div>
      </div>
    </div>
  );
}
