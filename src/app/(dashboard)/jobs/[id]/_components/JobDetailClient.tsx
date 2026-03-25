"use client";

import Link from "next/link";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useDashboardStore } from "@/lib/store";
import { JobDetailActions } from "@/components/jobs/JobDetailActions";
import { JobNotesInput } from "@/components/jobs/JobNotesInput";
import { JobDescription } from "@/components/jobs/JobDescription";
import { AnalyzeButton } from "@/components/jobs/AnalyzeButton";
import { ReanalyzeButton } from "@/components/jobs/ReanalyzeButton";
import { updateCustomJob } from "@/app/(dashboard)/dashboard/actions";

const SCORE_CONFIGS = [
  { min: 90, label: "Strong match", color: "#16a34a" },
  { min: 75, label: "Good match", color: "#d97706" },
  { min: 0, label: "Weak match", color: "#dc2626" },
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
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
};

interface JobDetailClientProps {
  jobId: string;
  description: string | null;
}

export function JobDetailClient({ jobId, description }: JobDetailClientProps) {
  const hydrated = useDashboardStore((s) => s.hydrated);
  const job = useDashboardStore((s) => s.jobs.find((j) => j.id === jobId) ?? null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sync = useDashboardStore((s) => s.sync);
  const storeUpdateJobAiFields = useDashboardStore((s) => s.updateJobAiFields);
  const storeClearJobAiFields = useDashboardStore((s) => s.clearJobAiFields);

  // Store not yet hydrated — show skeleton while data loads
  if (!hydrated) {
    return <JobDetailSkeleton />;
  }

  if (!job) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-[var(--text)]">
          Job not found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          This listing may have been removed or is no longer available.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
        >
          Back to feed
        </Link>
      </div>
    );
  }

  const pool = job.jobPool;
  const isCustom = pool.source === "CUSTOM";

  const postedDate = pool.postedAt
    ? formatDistanceToNow(new Date(pool.postedAt), { addSuffix: true })
    : null;

  const postedDateFull = pool.postedAt
    ? format(new Date(pool.postedAt), "MMM d, yyyy")
    : null;

  const metaParts = [
    pool.location,
    pool.locationType ? LOCATION_TYPE_LABELS[pool.locationType] : null,
    pool.jobType ? JOB_TYPE_LABELS[pool.jobType] : null,
    pool.salary,
  ].filter(Boolean);

  const scoreConfig =
    job.aiScore !== null ? getScoreConfig(job.aiScore) : null;

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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--text)] sm:text-3xl">
              {pool.title}
            </h1>
            <p className="mt-1 text-lg font-medium text-[var(--text-muted)]">
              {pool.company}
            </p>
          </div>
          {isCustom && (
            <button
              onClick={() => { setEditing((e) => !e); setSaveError(null); }}
              className="mt-1 shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              {editing ? "Cancel" : "Edit details"}
            </button>
          )}
        </div>
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
        {pool.skills.length > 0 && !editing && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pool.skills.map((skill: string) => (
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

      {/* Inline edit form — custom jobs only */}
      {editing && isCustom && (
        <CustomJobEditForm
          job={job}
          description={description ?? ""}
          onSave={async (data) => {
            setSaving(true);
            setSaveError(null);
            const result = await updateCustomJob(data);
            if (result.error) {
              setSaveError(result.error);
            } else {
              await sync();
              setEditing(false);
            }
            setSaving(false);
          }}
          saving={saving}
          saveError={saveError}
        />
      )}

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
            <JobDescription source={description ?? ""} />
          </div>
        </div>

        {/* Right: Match analysis + actions — first on mobile */}
        <div className="order-first w-full shrink-0 lg:order-last lg:w-72 xl:w-80">
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
                    <p className="text-xs text-[var(--text-muted)]">
                      Match score
                    </p>
                  </div>
                </div>

                {/* AI summary */}
                {job.aiSummary && (
                  <p className="mb-4 text-sm text-[var(--text-muted)]">
                    {job.aiSummary}
                  </p>
                )}

                {/* Match points */}
                {job.aiMatchPoints.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Why it fits
                    </p>
                    <ul className="space-y-1.5">
                      {job.aiMatchPoints.map((point: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-[var(--text)]"
                        >
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
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-[var(--text)]"
                        >
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
                <ReanalyzeButton
                  jobId={job.id}
                  profileId={job.profileId}
                  onCleared={() => storeClearJobAiFields(job.id)}
                  onAnalyzed={(result) => storeUpdateJobAiFields(job.id, result)}
                />
              </>
            ) : (
              <div className="space-y-3 py-2">
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--text)]">
                    Not yet scored
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Get an AI-powered match score for this listing.
                  </p>
                </div>
                <AnalyzeButton
                  jobId={job.id}
                  profileId={job.profileId}
                  onAnalyzed={(result) => storeUpdateJobAiFields(job.id, result)}
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <JobDetailActions
            jobId={job.id}
            profileId={job.profileId}
            feedStatus={job.feedStatus}
            externalUrl={pool.url}
          />

          {/* Notes */}
          <div className="mt-4">
            <JobNotesInput
              jobId={job.id}
              profileId={job.profileId}
              initialNotes={job.userNotes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline edit form for CUSTOM jobs ─── */

type JobForEdit = NonNullable<ReturnType<typeof useDashboardStore.getState>["jobs"][number]>;

function CustomJobEditForm({
  job,
  description,
  onSave,
  saving,
  saveError,
}: {
  job: JobForEdit;
  description: string;
  onSave: (data: unknown) => void;
  saving: boolean;
  saveError: string | null;
}) {
  const pool = job.jobPool;
  const [title, setTitle] = useState(pool.title);
  const [company, setCompany] = useState(pool.company);
  const [location, setLocation] = useState(pool.location ?? "");
  const [locationType, setLocationType] = useState(pool.locationType ?? "");
  const [url, setUrl] = useState(pool.url ?? "");
  const [jobType, setJobType] = useState(pool.jobType ?? "");
  const [salaryMin, setSalaryMin] = useState(pool.salaryMin?.toString() ?? "");
  const [salaryMax, setSalaryMax] = useState(pool.salaryMax?.toString() ?? "");
  const [currency, setCurrency] = useState(pool.currency ?? "");
  const [skills, setSkills] = useState(pool.skills.join(", "));
  const [editDescription, setEditDescription] = useState(description);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      jobId: job.id,
      profileId: job.profileId,
      title: title.trim(),
      company: company.trim(),
      description: editDescription.trim(),
      location: location.trim() || null,
      locationType: locationType || null,
      url: url.trim() || null,
      jobType: jobType || null,
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
      salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
      currency: currency.trim() || null,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
  const labelCls = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2 className="text-sm font-semibold text-[var(--text)]">Edit job details</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} placeholder="Job title" />
        </div>
        <div>
          <label className={labelCls}>Company *</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} required className={inputCls} placeholder="Company name" />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="e.g. Berlin, Germany" />
        </div>
        <div>
          <label className={labelCls}>Work type</label>
          <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className={selectCls}>
            <option value="">—</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">On-site</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Job type</label>
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} className={selectCls}>
            <option value="">—</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="FREELANCE">Freelance</option>
            <option value="INTERNSHIP">Internship</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} placeholder="https://..." type="url" />
        </div>
        <div>
          <label className={labelCls}>Salary min</label>
          <input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className={inputCls} placeholder="60000" type="number" min="1" />
        </div>
        <div>
          <label className={labelCls}>Salary max</label>
          <input value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className={inputCls} placeholder="90000" type="number" min="1" />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} placeholder="EUR" maxLength={10} />
        </div>
        <div>
          <label className={labelCls}>Skills (comma-separated)</label>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputCls} placeholder="React, TypeScript, Node.js" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Description *</label>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          required
          rows={10}
          className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
        />
      </div>

      {saveError && (
        <p className="text-sm text-red-500 dark:text-red-400">{saveError}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading job details">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="h-7 w-3/4 rounded bg-[var(--bg-subtle)]" />
            <div className="h-4 w-1/3 rounded bg-[var(--bg-subtle)]" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-[var(--bg-subtle)]" />
              <div className="h-5 w-20 rounded-full bg-[var(--bg-subtle)]" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            {[100, 95, 88, 100, 72, 90, 80].map((w, i) => (
              <div key={i} className="h-3 rounded bg-[var(--bg-subtle)]" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full space-y-4 lg:w-72 lg:shrink-0">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
            <div className="h-16 w-16 mx-auto rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-4 w-2/3 mx-auto rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-1/2 mx-auto rounded bg-[var(--bg-subtle)]" />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2">
            {[80, 65, 75].map((w, i) => (
              <div key={i} className="h-3 rounded bg-[var(--bg-subtle)]" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
