import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_CONFIG } from "@/config/app";
import { LandingNav } from "@/components/landing/LandingNav";
import { FeatureRow } from "@/components/landing/FeatureRow";
import { HeroDemoPreview } from "@/components/landing/HeroDemoPreview";
import { HeroCTA, BottomCTA } from "@/components/landing/AuthAwareCTA";
import { DashboardPrefetcher } from "@/components/providers/DashboardPrefetcher";

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — AI job search`,
  description:
    "Get access to a feed of job listings scored against your background. Tailor your resume to every job posting in seconds. Track your entire job search in one place.",
};

/* ─── Panel shell ──────────────────────────────────────────── */

function PanelShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 border-b border-b-[var(--border)] bg-[var(--bg-subtle)] px-3 py-[7px]">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]"
            />
          ))}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {label}
        </span>
      </div>
      <div className="px-3.5 pb-3 pt-3.5">{children}</div>
    </div>
  );
}

/* ─── Text bar (skeleton line) ─────────────────────────────── */

function Bar({ w, h = 3, o = 1 }: { w: string; h?: number; o?: number }) {
  return (
    <div
      className="rounded-[2px] bg-[var(--border-strong)]"
      style={{ height: `${h}px`, width: w, opacity: o }}
    />
  );
}

/* ─── Product panels ───────────────────────────────────────── */

function JobFeedPanel() {
  const rows = [
    { score: 94, tag: "GO", o: 1 },
    { score: 81, tag: "EXAMINE", o: 0.6 },
    { score: 62, tag: null, o: 0.25 },
  ];
  return (
    <PanelShell label="Job Feed">
      <div className="flex flex-col gap-2">
        {rows.map(({ score, tag, o }) => (
          <div
            key={score}
            className="flex items-center gap-2.5"
            style={{ opacity: o }}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-[10px] font-black ${
                score === 94 ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "bg-[var(--bg-subtle)] text-[var(--text)]"
              }`}
            >
              {score}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Bar w={`${55 + (score % 22)}%`} h={4} />
              <Bar w={`${30 + (score % 15)}%`} h={3} o={0.55} />
            </div>
            {tag && (
              <span
                className={`whitespace-nowrap rounded-[3px] border px-[7px] py-0.5 text-[8px] font-bold tracking-[0.06em] ${
                  tag === "GO"
                    ? "border-[var(--accent-muted)] bg-[var(--accent-muted)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                }`}
              >
                {tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function JobDetailPanel() {
  return (
    <PanelShell label="Job Detail">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-base font-black text-[var(--accent-fg)]">
          94
        </div>
        <div className="flex flex-1 flex-col gap-[5px]">
          <Bar w="70%" h={4} />
          <span className="text-[8px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
            Strong match
          </span>
        </div>
      </div>

      <div className="mb-2">
        <p className="mb-[5px] text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Match points
        </p>
        {["72%", "58%", "48%"].map((w, i) => (
          <div key={i} className="mb-1 flex items-center gap-1.5">
            <span className="w-2 text-[8px] text-[var(--text-muted)]">✓</span>
            <Bar w={w} h={3} />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-[5px] text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Gap points
        </p>
        {["44%", "32%"].map((w, i) => (
          <div key={i} className="mb-1 flex items-center gap-1.5">
            <span className="w-2 text-[8px] text-[var(--border-strong)]">—</span>
            <Bar w={w} h={3} o={0.45} />
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function ImportPanel() {
  return (
    <PanelShell label="Import">
      <div className="mb-3 flex gap-1.5">
        <div className="flex h-7 flex-1 items-center rounded border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5">
          <span className="text-[9px] text-[var(--text-muted)]">https://...</span>
        </div>
        <div className="flex h-7 items-center whitespace-nowrap rounded border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-[9px] font-bold text-[var(--text-muted)]">
          Extract
        </div>
      </div>
      <div className="border-t border-t-[var(--border)] pt-3">
        <div className="rounded border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2.5">
          <p className="mb-1 text-[11px] font-bold text-[var(--text)]">Senior Product Engineer</p>
          <p className="text-[9px] text-[var(--text-muted)]">Acme Corp · Full-time</p>
        </div>
      </div>
    </PanelShell>
  );
}

function TailorPanel() {
  return (
    <PanelShell label="Tailor">
      <div className="mb-2.5 flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Job Description
          </p>
          <div className="flex flex-col gap-1">
            <Bar w="90%" h={3} />
            <Bar w="75%" h={3} o={0.7} />
            <Bar w="85%" h={3} o={0.6} />
            <Bar w="60%" h={3} o={0.45} />
          </div>
        </div>
        <div className="w-px shrink-0 bg-[var(--border)]" />
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Your Resume
          </p>
          <div className="flex flex-col gap-1">
            <Bar w="80%" h={3} />
            <Bar w="95%" h={3} o={0.7} />
            <Bar w="70%" h={3} o={0.6} />
            <Bar w="85%" h={3} o={0.45} />
          </div>
        </div>
      </div>
      <div className="inline-flex h-[22px] items-center rounded bg-[var(--accent)] px-2.5 text-[9px] font-bold text-[var(--accent-fg)]">
        Export PDF
      </div>
    </PanelShell>
  );
}

function WritingRulesPanel() {
  const sections = [
    { label: "Protected Phrases", pills: ["my results", "proven track record"] },
    { label: "Never Claim", pills: ["supervised a team", "led org"] },
  ];
  return (
    <PanelShell label="Writing Rules">
      <div className="flex flex-col gap-3">
        {sections.map(({ label, pills }) => (
          <div key={label}>
            <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {label}
            </p>
            <div className="flex flex-wrap gap-[5px]">
              {pills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[9px] text-[var(--text-muted)]"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function PipelinePanel() {
  const cols = [
    { label: "Interested", n: 2 },
    { label: "Applied", n: 3 },
    { label: "Interview", n: 1 },
    { label: "Offer", n: 0 },
  ];
  return (
    <PanelShell label="Pipeline">
      <div className="flex gap-2">
        {cols.map(({ label, n }) => (
          <div key={label} className="min-w-0 flex-1">
            <p className="mb-1.5 truncate text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              {label}
            </p>
            <div className="flex flex-col gap-1">
              {Array.from({ length: n }).map((_, i) => (
                <div
                  key={i}
                  className="h-5 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function ProfilesPanel() {
  const profiles = [
    { name: "Frontend Remote", active: true },
    { name: "Backend Berlin", active: false },
  ];
  return (
    <PanelShell label="Profiles">
      <div className="flex flex-col gap-1.5">
        {profiles.map(({ name, active }) => (
          <div
            key={name}
            className={`flex items-center gap-2 rounded border px-2.5 py-2 ${
              active ? "border-[var(--border)] bg-[var(--bg-subtle)]" : "border-[var(--border)] bg-[var(--bg)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                active ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
              }`}
            />
            <span
              className={`flex-1 text-[10px] ${
                active ? "font-semibold text-[var(--text)]" : "font-normal text-[var(--text-muted)]"
              }`}
            >
              {name}
            </span>
            {active ? (
              <span className="text-[8px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Active
              </span>
            ) : (
              <span className="rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[8px] font-bold text-[var(--text-muted)]">
                Switch
              </span>
            )}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

/* ─── Feature data ─────────────────────────────────────────── */

interface Feature {
  bold: string;
  italic: string;
  description: string;
  panel: ReactNode;
}

const FEATURES: Feature[] = [
  {
    bold: "Matched.",
    italic: "Not just recent.",
    description:
      "Listings are scored against your skills, location preferences, and target role daily — so the best fits rise above the noise instead of getting buried.",
    panel: <JobFeedPanel />,
  },
  {
    bold: "Analyzed.",
    italic: "Objective insights.",
    description:
      "Each role gets a detailed breakdown — why you fit, why you don't, and a skimmable summary — so you know exactly why a job does or doesn't fit before you apply.",
    panel: <JobDetailPanel />,
  },
  {
    bold: "Import.",
    italic: "From anywhere.",
    description:
      "Paste a job URL or raw text and the app extracts the details automatically. Works with nearly any job board, any format.",
    panel: <ImportPanel />,
  },
  {
    bold: "Tailored.",
    italic: "Your resume fast.",
    description:
      "Pick a role, click Tailor. The AI rewrites your resume in your preferred format to mirror the job description. Once you have it, edit it. Keep what matters, cut what doesn't, export straight to PDF.",
    panel: <TailorPanel />,
  },
  {
    bold: "Yours.",
    italic: "Down to the phrasing.",
    description:
      "Set phrases the AI must always protect, phrases it must never use, and claims it should never make on your behalf. Your voice stays yours and your results improve as the AI learns how to write in your voice.",
    panel: <WritingRulesPanel />,
  },
  {
    bold: "Tracked.",
    italic: "Every opportunity.",
    description:
      "A clean pipeline keeps every application in view, paired with your chosen resume version, from first interest through to offer. No scattered files, no lost follow-ups.",
    panel: <PipelinePanel />,
  },
  {
    bold: "Multi-track.",
    italic: "One account.",
    description:
      "Manage as many different searches as you want with a single account — different roles, different cities — each gets its own profile with its own feed, context, pipeline, and settings.",
    panel: <ProfilesPanel />,
  },
];


/* ─── Hero — signed-out ────────────────────────────────────── */

function StatsRow() {
  return (
    <div className="flex flex-row flex-nowrap items-start gap-0">
      {(
        [
          { stat: "<2m", label: "Setup" },
          { stat: "Free", label: "Up to 100k tokens" },
          { stat: "Automated", label: "Hiring manager review" },
        ] as const
      ).map(({ stat, label }, i) => (
        <div key={stat} className="flex items-start">
          {i > 0 && (
            <div className="mx-2.5 h-9 w-px shrink-0 bg-[var(--border)] sm:mx-5" />
          )}
          <div>
            <p className="text-[11px] font-extrabold leading-[1.2] text-[var(--text)] sm:text-[14px]">
              {stat === "<2m" ? <>{"<"}2m</> : stat}
            </p>
            <p className="mt-0.5 text-[9px] text-[var(--text-muted)] sm:text-[12px]">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Left: copy */}
      <div>
        {/* Headline */}
        <h1 className="mb-5 text-[clamp(48px,8vw,72px)] font-black leading-[0.93] tracking-[-0.05em] text-[var(--text)]">
          Get on the
          <br />
          shortlist.
        </h1>

        {/* Eyebrow */}
        <span className="mb-6 inline-flex items-center gap-[7px] rounded-full border border-[var(--border)] px-3 py-[3px] text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
          <span className="h-[5px] w-[5px] shrink-0 animate-pulse rounded-full bg-[var(--accent)]" />
          AI-powered job search
        </span>

        {/* Subline */}
        <p className="mb-9 max-w-[360px] text-[13px] leading-[1.75] text-[var(--text-muted)]">
        Get access to a feed of job listings scored against your background. Tailor your resume to every job posting in seconds. Track your entire job search in one place.
        </p>

        {/* CTAs — client component handles auth detection */}
        <HeroCTA />

        {/* Stats — desktop position (below CTAs, hidden on mobile) */}
        <div className="mt-10 hidden lg:block">
          <StatsRow />
        </div>
      </div>

      {/* Right: preview */}
      <div>
        <HeroDemoPreview />

        {/* Stats — mobile position (below preview, hidden on lg+) */}
        <div className="mt-8 lg:hidden">
          <StatsRow />
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Prefetch dashboard data as soon as Clerk confirms sign-in */}
      <DashboardPrefetcher />
      <LandingNav />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
        <Hero />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          What it does
        </p>
        <div>
          {FEATURES.map(({ bold, italic, description, panel }) => (
            <FeatureRow
              key={bold}
              bold={bold}
              italic={italic}
              description={description}
              panel={panel}
            />
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="border-t border-t-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <BottomCTA />
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="var(--bg-subtle)" />
              <path
                d="M8 17L13 22L24 10"
                stroke="var(--bg)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {APP_CONFIG.name}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Built by{" "}
            <a
              href="https://johnmoorman.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              John Moorman
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
