import { formatDistanceToNow } from "date-fns";
import { ScoreBadge } from "@/components/jobs/ScoreBadge";
import type { JobWithApplication } from "@/types";

// ─── Avatar palette ───────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "#e0e7ff", text: "#4338ca" }, // indigo
  { bg: "#fce7f3", text: "#be185d" }, // pink
  { bg: "#d1fae5", text: "#065f46" }, // emerald
  { bg: "#fef3c7", text: "#92400e" }, // amber
  { bg: "#ede9fe", text: "#5b21b6" }, // violet
  { bg: "#fee2e2", text: "#991b1b" }, // red
  { bg: "#cffafe", text: "#0e7490" }, // cyan
  { bg: "#f0fdf4", text: "#15803d" }, // green
];

function getAvatarColors(company: string) {
  return AVATAR_PALETTE[company.charCodeAt(0) % AVATAR_PALETTE.length];
}

// ─── Display label maps ───────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  GREENHOUSE: "Greenhouse",
  LEVER: "Lever",
  ASHBY: "Ashby",
  INDEED: "Indeed",
  BERLIN_STARTUP_JOBS: "Berlin Startup Jobs",
  HONEYPOT: "Honeypot",
  YC_JOBS: "Y Combinator",
  NO_FLUFF_JOBS: "No Fluff Jobs",
  CUSTOM: "Custom",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface JobCardProps {
  job: JobWithApplication;
}

export function JobCard({ job }: JobCardProps) {
  const avatarColors = getAvatarColors(job.company);
  const avatarLetter = job.company[0]?.toUpperCase() ?? "?";

  const postedDate = job.postedAt
    ? formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })
    : null;

  const displaySkills = job.skills.slice(0, 4);
  const remainingCount = job.skills.length - displaySkills.length;

  const locationLabel = job.locationType
    ? (LOCATION_TYPE_LABELS[job.locationType] ?? null)
    : null;
  const locationDisplay = [job.location, locationLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-xl border border-[--border] bg-[--bg] p-4 transition-shadow hover:shadow-md sm:p-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
            aria-hidden="true"
          >
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[--text] sm:text-base">
              {job.title}
            </h2>
            <p className="truncate text-xs text-[--text-muted] sm:text-sm">
              {job.company}
              {locationDisplay ? ` · ${locationDisplay}` : ""}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <ScoreBadge score={job.aiScore} />
        </div>
      </div>

      {/* Middle — AI summary */}
      <div className="mt-3">
        {job.aiSummary ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-[--text-muted]">
            {job.aiSummary}
          </p>
        ) : (
          <p className="text-sm italic text-[--text-muted]">Analysis pending</p>
        )}
      </div>

      {/* Bottom row — chips + source/date */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {job.salary && <Chip>{job.salary}</Chip>}
          {job.jobType && (
            <Chip>{JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</Chip>
          )}
          {displaySkills.map((skill) => (
            <Chip key={skill}>{skill}</Chip>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-[--text-muted]">
              +{remainingCount} more
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[--text-muted]">
          <span>{SOURCE_LABELS[job.source] ?? job.source}</span>
          {postedDate && (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={job.postedAt?.toISOString()}>
                {postedDate}
              </time>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Chip primitive ───────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[--bg-subtle] px-2 py-0.5 text-xs text-[--text-muted] ring-1 ring-inset ring-[--border]">
      {children}
    </span>
  );
}
