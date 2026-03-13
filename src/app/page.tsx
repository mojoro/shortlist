import Link from "next/link";
import type { Metadata } from "next";
import { APP_CONFIG } from "@/config/app";

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`,
  description:
    "Find jobs matched to your background, tailor every application in seconds, and track your entire search in one place.",
};

const FEATURES = [
  {
    number: "01",
    title: "Jobs matched to you",
    description:
      "We scan job boards daily and score every listing against your background. Best-fit roles rise to the top — not just the most recently posted ones.",
  },
  {
    number: "02",
    title: "Applications tailored in seconds",
    description:
      "Pick a role, click Tailor, and get a resume rewritten to mirror the job description. Edit it to add your own voice, then export straight to PDF.",
  },
  {
    number: "03",
    title: "Track every application",
    description:
      "A simple pipeline keeps every application in view from first interest through to offer. No spreadsheets, no lost follow-ups.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold shadow-sm">
              S
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {APP_CONFIG.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-8 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        {/* Decorative background letter */}
        <span
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 select-none text-[22rem] font-black leading-none text-[var(--text)] opacity-[0.03] sm:text-[28rem]"
          aria-hidden="true"
        >
          S
        </span>

        {/* Subtle radial gradient for depth */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent) 0%, transparent 70%)",
            opacity: 0.06,
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
            AI-powered job search
          </div>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-[var(--text)] sm:text-7xl">
            Get on the
            <br />
            <span className="text-[var(--accent)]">shortlist.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-muted)] sm:text-xl">
            Find roles that actually fit your background, tailor every application
            in seconds, and track your entire search — all in one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-7 text-sm font-semibold text-[var(--accent-fg)] shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Get started free
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-7 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <p className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          How it works
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ number, title, description }) => (
            <article
              key={number}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-7"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span className="mb-5 block font-mono text-3xl font-black text-[var(--accent)] opacity-70">
                {number}
              </span>
              <h3 className="mb-2.5 text-base font-semibold text-[var(--text)]">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────────────────────────── */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Ready to find your next role?
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Set up your profile in under two minutes.
          </p>
          <Link
            href="/sign-up"
            className="mt-7 inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-8 text-sm font-semibold text-[var(--accent-fg)] shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--accent-fg)] text-[10px] font-bold">
              S
            </span>
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
              className="text-[var(--text)] transition-colors hover:text-[var(--accent)]"
            >
              John Moorman
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}
