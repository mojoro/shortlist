import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { APP_CONFIG } from "@/config/app";
import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/landing/LandingNav";
import { SignedInHero } from "@/components/landing/SignedInHero";
import { FeatureRow } from "@/components/landing/FeatureRow";
import dynamic from "next/dynamic";

// HeroDemoPreview uses a named export, so the .then() re-wrap is required.
// next/dynamic expects a default export; without it the component resolves to undefined.
const HeroDemoPreview = dynamic(
  () =>
    import("@/components/landing/HeroDemoPreview").then((m) => ({
      default: m.HeroDemoPreview,
    })),
  { ssr: false }
);

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — AI job search`,
  description:
    "Score every listing against your background. Tailor every application in seconds. Track your entire search in one place.",
};

/* ─── Panel shell ──────────────────────────────────────────── */

function PanelShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid #1a1a1a",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Chrome bar */}
      <div
        style={{
          background: "#111",
          padding: "7px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div style={{ display: "flex", gap: "4px" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#2a2a2a",
                display: "inline-block",
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#333",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ padding: "14px 14px 12px" }}>{children}</div>
    </div>
  );
}

/* ─── Text bar (skeleton line) ─────────────────────────────── */

function Bar({ w, h = 3, o = 1 }: { w: string; h?: number; o?: number }) {
  return (
    <div
      style={{
        height: `${h}px`,
        background: "#252525",
        borderRadius: "2px",
        width: w,
        opacity: o,
      }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {rows.map(({ score, tag, o }) => (
          <div
            key={score}
            style={{ display: "flex", alignItems: "center", gap: "10px", opacity: o }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                background: score === 94 ? "#22d3ee" : "#1a1a1a",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 900,
                color: score === 94 ? "#080808" : "#fff",
                flexShrink: 0,
              }}
            >
              {score}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
              <Bar w={`${55 + (score % 22)}%`} h={4} />
              <Bar w={`${30 + (score % 15)}%`} h={3} o={0.55} />
            </div>
            {tag && (
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: tag === "GO" ? "#22d3ee" : "#555",
                  background: tag === "GO" ? "rgba(34,211,238,0.08)" : "#141414",
                  padding: "2px 7px",
                  borderRadius: "3px",
                  border: `1px solid ${tag === "GO" ? "rgba(34,211,238,0.2)" : "#1e1e1e"}`,
                  whiteSpace: "nowrap",
                }}
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
      <div
        style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "center" }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            background: "#1a1a1a",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: 900,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          94
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
          <Bar w="70%" h={4} />
          <span
            style={{
              fontSize: "8px",
              color: "#555",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Strong match
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <p
          style={{
            fontSize: "8px",
            color: "#444",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "5px",
          }}
        >
          Match points
        </p>
        {["72%", "58%", "48%"].map((w, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "8px", color: "#444", width: "8px" }}>✓</span>
            <Bar w={w} h={3} />
          </div>
        ))}
      </div>

      <div>
        <p
          style={{
            fontSize: "8px",
            color: "#444",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "5px",
          }}
        >
          Gap points
        </p>
        {["44%", "32%"].map((w, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "8px", color: "#2a2a2a", width: "8px" }}>—</span>
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
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <div
          style={{
            flex: 1,
            height: "28px",
            background: "#161616",
            border: "1px solid #222",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
          }}
        >
          <span style={{ fontSize: "9px", color: "#333" }}>https://...</span>
        </div>
        <div
          style={{
            height: "28px",
            padding: "0 10px",
            background: "#1e1e1e",
            border: "1px solid #2a2a2a",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            fontSize: "9px",
            fontWeight: 700,
            color: "#666",
            whiteSpace: "nowrap",
          }}
        >
          Extract
        </div>
      </div>
      <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "12px" }}>
        <div
          style={{
            background: "#131313",
            border: "1px solid #1e1e1e",
            borderRadius: "4px",
            padding: "10px 12px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#fff",
              marginBottom: "4px",
            }}
          >
            Senior Product Engineer
          </p>
          <p style={{ fontSize: "9px", color: "#555" }}>Acme Corp · Full-time</p>
        </div>
      </div>
    </PanelShell>
  );
}

function TailorPanel() {
  return (
    <PanelShell label="Tailor">
      <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "8px",
              color: "#444",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Job Description
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Bar w="90%" h={3} />
            <Bar w="75%" h={3} o={0.7} />
            <Bar w="85%" h={3} o={0.6} />
            <Bar w="60%" h={3} o={0.45} />
          </div>
        </div>
        <div style={{ width: "1px", background: "#1e1e1e", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "8px",
              color: "#444",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Your Resume
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Bar w="80%" h={3} />
            <Bar w="95%" h={3} o={0.7} />
            <Bar w="70%" h={3} o={0.6} />
            <Bar w="85%" h={3} o={0.45} />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "inline-flex",
          height: "22px",
          alignItems: "center",
          padding: "0 10px",
          background: "#fff",
          color: "#080808",
          borderRadius: "4px",
          fontSize: "9px",
          fontWeight: 700,
        }}
      >
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
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sections.map(({ label, pills }) => (
          <div key={label}>
            <p
              style={{
                fontSize: "8px",
                color: "#444",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              {label}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {pills.map((pill) => (
                <span
                  key={pill}
                  style={{
                    fontSize: "9px",
                    color: "#888",
                    background: "#161616",
                    border: "1px solid #222",
                    borderRadius: "3px",
                    padding: "2px 8px",
                  }}
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
      <div style={{ display: "flex", gap: "8px" }}>
        {cols.map(({ label, n }) => (
          <div key={label} style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "8px",
                color: "#444",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "6px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {Array.from({ length: n }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: "20px",
                    background: "#161616",
                    border: "1px solid #1e1e1e",
                    borderRadius: "3px",
                  }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {profiles.map(({ name, active }) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              background: active ? "#131313" : "#0f0f0f",
              border: `1px solid ${active ? "#222" : "#181818"}`,
              borderRadius: "4px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: active ? "#22d3ee" : "#2a2a2a",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: "10px",
                color: active ? "#fff" : "#555",
                fontWeight: active ? 600 : 400,
              }}
            >
              {name}
            </span>
            {active ? (
              <span
                style={{
                  fontSize: "8px",
                  color: "#444",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Active
              </span>
            ) : (
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  color: "#666",
                  background: "#1a1a1a",
                  border: "1px solid #252525",
                  borderRadius: "3px",
                  padding: "2px 8px",
                }}
              >
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
    italic: "Every angle.",
    description:
      "Each role gets a detailed breakdown — match points, gap points, and an AI summary — so you know exactly why a job does or doesn't fit before you apply.",
    panel: <JobDetailPanel />,
  },
  {
    bold: "Import.",
    italic: "Anything.",
    description:
      "Paste a job URL or raw text and the AI extracts the details automatically. Works with any job board, any format.",
    panel: <ImportPanel />,
  },
  {
    bold: "Tailored.",
    italic: "In seconds.",
    description:
      "Pick a role, click Tailor. The AI rewrites your resume to mirror the job description — keep what matters, cut what doesn't, export straight to PDF.",
    panel: <TailorPanel />,
  },
  {
    bold: "Yours.",
    italic: "Down to the phrasing.",
    description:
      "Set phrases the AI must always protect, phrases it must never use, and claims it should never make on your behalf. Your voice stays yours.",
    panel: <WritingRulesPanel />,
  },
  {
    bold: "Tracked.",
    italic: "All of it.",
    description:
      "A clean pipeline keeps every application in view from first interest through to offer. No spreadsheets, no lost follow-ups.",
    panel: <PipelinePanel />,
  },
  {
    bold: "Multi-track.",
    italic: "One account.",
    description:
      "Running parallel searches — different roles, different cities — each gets its own profile with its own feed, pipeline, and settings.",
    panel: <ProfilesPanel />,
  },
];

/* ─── Hero — signed-out ────────────────────────────────────── */

function StatsRow() {
  return (
    <div className="flex flex-row flex-wrap items-start gap-0">
      {(
        [
          { stat: "<2m", label: "Setup" },
          { stat: "Free", label: "Always" },
          { stat: "AI", label: "Match scoring" },
        ] as const
      ).map(({ stat, label }, i) => (
        <div key={stat} className="flex items-start">
          {i > 0 && (
            <div
              style={{
                width: "1px",
                background: "#1e1e1e",
                height: "36px",
                margin: "0 20px",
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1.2,
              }}
            >
              {stat === "<2m" ? <>{"<"}2m</> : stat}
            </p>
            <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignedOutHero() {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* ── Left: copy ── */}
      <div>
        {/* Eyebrow */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            border: "1px solid rgba(34,211,238,0.2)",
            borderRadius: "999px",
            padding: "3px 12px",
            fontSize: "11px",
            color: "#666",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#22d3ee",
              flexShrink: 0,
              animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
            }}
          />
          AI-powered job search
        </span>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 72px)",
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 0.93,
            color: "#fff",
            marginBottom: "28px",
          }}
        >
          Get on the
          <br />
          shortlist.
        </h1>

        {/* Subline */}
        <p
          style={{
            fontSize: "13px",
            color: "#666",
            lineHeight: 1.75,
            maxWidth: "360px",
            marginBottom: "36px",
          }}
        >
          Score every listing against your background. Tailor every application in seconds.
          Track your entire search in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center rounded-lg px-7 text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "#22d3ee", color: "#080808" }}
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center rounded-lg border border-[#222] px-7 text-sm font-medium text-[#555] transition-colors hover:border-[#444] hover:text-[#888]"
          >
            Sign in
          </Link>
        </div>

        {/* Stats — desktop position (below CTAs, hidden on mobile) */}
        <div className="mt-10 hidden lg:block">
          <StatsRow />
        </div>
      </div>

      {/* ── Right: preview ── */}
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

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  let dashboardHref = "/dashboard";

  if (isSignedIn && userId) {
    const hasProfile = await prisma.profile.findFirst({ where: { userId }, select: { id: true } });
    if (!hasProfile) dashboardHref = "/onboarding";
  }

  return (
    <div style={{ backgroundColor: "#080808", color: "#ffffff" }} className="min-h-screen">
      <LandingNav isSignedIn={isSignedIn} />

      {/* ── Hero ──────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
        {isSignedIn ? (
          <SignedInHero dashboardHref={dashboardHref} />
        ) : (
          <SignedOutHero />
        )}
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <p
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#333",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
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

      {/* ── CTA strip ─────────────────────────────── */}
      <section style={{ backgroundColor: "#0d0d0d", borderTop: "1px solid #111" }}>
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          {isSignedIn ? (
            <>
              <h2
                style={{
                  fontSize: "clamp(22px, 4vw, 30px)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                }}
              >
                Keep going.
                <br />
                <span style={{ color: "#333" }}>Your matches are waiting.</span>
              </h2>
              <p style={{ color: "#444", fontSize: "13px", marginTop: "12px" }}>
                Pick up where you left off.
              </p>
              <Link
                href={dashboardHref}
                className="mt-8 inline-flex h-11 items-center rounded-lg px-8 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#22d3ee", color: "#080808" }}
              >
                Go to dashboard →
              </Link>
            </>
          ) : (
            <>
              <h2
                style={{
                  fontSize: "clamp(22px, 4vw, 30px)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                }}
              >
                Start your search.
                <br />
                <span style={{ color: "#333" }}>It&apos;s free.</span>
              </h2>
              <p style={{ color: "#444", fontSize: "13px", marginTop: "12px" }}>
                Set up your profile in under two minutes.
              </p>
              <Link
                href="/sign-up"
                className="mt-8 inline-flex h-11 items-center rounded-lg px-8 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#22d3ee", color: "#080808" }}
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0" aria-hidden="true">
              <rect width="32" height="32" rx="7" style={{ fill: "#333" }} />
              <path
                d="M8 17L13 22L24 10"
                stroke="#080808"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span style={{ color: "#333", fontSize: "12px", fontWeight: 500 }}>
              {APP_CONFIG.name}
            </span>
          </div>
          <p style={{ color: "#333", fontSize: "12px" }}>
            Built by{" "}
            <a
              href="https://johnmoorman.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#444" }}
              className="transition-colors hover:text-[#888]"
            >
              John Moorman
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
