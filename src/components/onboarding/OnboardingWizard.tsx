"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/(dashboard)/settings/actions";
import { APP_CONFIG } from "@/config/app";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type Phase = "form" | "loading";

type WizardData = {
  name: string;
  targetRoles: string;
  targetLocations: string;
  remotePreference: "REMOTE_ONLY" | "HYBRID_OK" | "ANY" | "ONSITE_ONLY";
  masterResume: string;
  currency: string;
  targetSalaryMin: string;
  targetSalaryMax: string;
};

const TOTAL_STEPS = 4;

const REMOTE_OPTIONS = [
  { value: "ANY",         label: "Anywhere — remote, hybrid, or on-site" },
  { value: "REMOTE_ONLY", label: "Remote only" },
  { value: "HYBRID_OK",   label: "Remote or hybrid" },
  { value: "ONSITE_ONLY", label: "On-site only" },
] as const;

const CURRENCIES = ["EUR", "USD", "GBP", "PLN", "CHF", "CAD", "AUD"];

const INPUT_CLS =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const LABEL_CLS = "block text-sm font-medium text-[var(--text)] mb-1.5";
const HINT_CLS  = "mt-1.5 text-xs text-[var(--text-muted)]";

export function OnboardingWizard() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>({
    name:             "",
    targetRoles:      "",
    targetLocations:  "",
    remotePreference: "ANY",
    masterResume:     "",
    currency:         "EUR",
    targetSalaryMin:  "",
    targetSalaryMax:  "",
  });

  function update(field: keyof WizardData) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => setData((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function canAdvance() {
    if (step === 1) return data.targetRoles.trim().length > 0;
    return true;
  }

  function handleComplete() {
    setPhase("loading");
    startTransition(async () => {
      try {
        const roles = data.targetRoles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        await completeOnboarding({
          name:             data.name.trim() || roles[0] || "My Profile",
          targetRoles:      roles,
          targetLocations:  data.targetLocations
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          remotePreference: data.remotePreference,
          currency:         data.currency,
          targetSalaryMin:  data.targetSalaryMin
            ? parseInt(data.targetSalaryMin, 10)
            : null,
          targetSalaryMax:  data.targetSalaryMax
            ? parseInt(data.targetSalaryMax, 10)
            : null,
          masterResume:     data.masterResume.trim() || undefined,
        });
        document.cookie = "shortlist-onboarded=1; path=/";
        router.push("/dashboard");
      } catch {
        setPhase("form");
        setError("Something went wrong. Please try again.");
      }
    });
  }

  if (phase === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-subtle)] p-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
          <p className="text-base font-semibold text-[var(--text)]">
            Finding your matches…
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Searching the job pool for roles that fit your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-subtle)] p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Branding + progress */}
        <div className="mb-8 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-bold shadow-sm">
            S
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--text)]">
            {APP_CONFIG.name}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Step {step} of {TOTAL_STEPS}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={[
                  "h-2 rounded-full transition-all duration-300",
                  i + 1 === step
                    ? "w-6 bg-[var(--accent)]"
                    : i + 1 < step
                      ? "w-2 bg-[var(--accent)] opacity-40"
                      : "w-2 bg-[var(--border)]",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="space-y-5">
          {step === 1 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  What kind of role are you looking for?
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Enter the job titles you'd apply for.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="targetRoles">
                  Job titles
                </label>
                <input
                  id="targetRoles"
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Software Engineer, Full-Stack Developer…"
                  value={data.targetRoles}
                  onChange={update("targetRoles")}
                  autoFocus
                />
                <p className={HINT_CLS}>Separate multiple titles with commas.</p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="profileName">
                  Profile label{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    (optional)
                  </span>
                </label>
                <input
                  id="profileName"
                  type="text"
                  className={INPUT_CLS}
                  placeholder="e.g. Frontend Engineer — Berlin"
                  value={data.name}
                  onChange={update("name")}
                />
                <p className={HINT_CLS}>
                  A short name for this search — handy if you run multiple job
                  searches.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  Where would you like to work?
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  We'll use this to filter listings for you.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="targetLocations">
                  Locations
                </label>
                <input
                  id="targetLocations"
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Berlin, Warsaw, Amsterdam…"
                  value={data.targetLocations}
                  onChange={update("targetLocations")}
                  autoFocus
                />
                <p className={HINT_CLS}>
                  Separate multiple locations with commas. Leave blank to skip
                  location filtering.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="remotePreference">
                  Remote preference
                </label>
                <select
                  id="remotePreference"
                  className={INPUT_CLS}
                  value={data.remotePreference}
                  onChange={update("remotePreference")}
                >
                  {REMOTE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  Paste your resume
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  We use this to score how well each job fits you and to help
                  tailor your applications. You can update it any time in
                  settings.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="masterResume">
                  Your resume{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    (optional — you can add it later)
                  </span>
                </label>
                <textarea
                  id="masterResume"
                  className={[
                    INPUT_CLS,
                    "min-h-[220px] resize-y font-[var(--font-geist-mono)] text-xs leading-relaxed",
                  ].join(" ")}
                  placeholder={`Jane Smith\njane@example.com · linkedin.com/in/jane\n\nExperience\n──────────\nSenior Software Engineer — Acme Corp  (2021–present)\n- Built and maintained APIs serving 2M daily active users\n- Led migration from monolith to microservices, cutting p99 latency by 40%\n\nEducation\n─────────\nBSc Computer Science — University of Warsaw  (2017–2021)`}
                  value={data.masterResume}
                  onChange={update("masterResume")}
                  autoFocus
                />
                <p className={HINT_CLS}>
                  Plain text is fine. Paste from a document or type directly.
                </p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  What's your salary target?
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  We'll use this to flag listings that are way outside your
                  range. You can skip this for now.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="currency">
                  Currency
                </label>
                <select
                  id="currency"
                  className={INPUT_CLS}
                  value={data.currency}
                  onChange={update("currency")}
                  autoFocus
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS} htmlFor="salaryMin">
                    Minimum (annual)
                  </label>
                  <input
                    id="salaryMin"
                    type="number"
                    min={0}
                    className={INPUT_CLS}
                    placeholder="60 000"
                    value={data.targetSalaryMin}
                    onChange={update("targetSalaryMin")}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="salaryMax">
                    Maximum (annual)
                  </label>
                  <input
                    id="salaryMax"
                    type="number"
                    min={0}
                    className={INPUT_CLS}
                    placeholder="100 000"
                    value={data.targetSalaryMax}
                    onChange={update("targetSalaryMax")}
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={isPending}
              className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="cursor-pointer rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="cursor-pointer rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Setting up…" : "Get started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
