"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/(dashboard)/settings/actions";
import { APP_CONFIG } from "@/config/app";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type Phase = "form" | "loading" | "zero-match";

type WizardData = {
  name: string;
  targetRoles: string;
  targetLocations: string;
  remotePreference: "REMOTE_ONLY" | "HYBRID_OK" | "ANY" | "ONSITE_ONLY";
  masterResume: string;
  currency: string;
  targetSalaryMin: string;
  targetSalaryMax: string;
  // Contact details (step 3)
  displayName: string;
  email: string;
  phone: string;
  contactLocation: string;
  linkedinUrl: string;
  portfolioUrl: string;
  githubUrl: string;
  // Full CV (step 4)
  curriculumVitae: string;
  // Excluded keywords (step 5)
  excludedKeywords: string[];
};

const TOTAL_STEPS = 7;

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
    displayName:      "",
    email:            "",
    phone:            "",
    contactLocation:  "",
    linkedinUrl:      "",
    portfolioUrl:     "",
    githubUrl:        "",
    curriculumVitae:  "",
    excludedKeywords: [],
  });

  // Keyword chip input state
  const [keywordInput, setKeywordInput] = useState("");

  function update(field: keyof WizardData) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => setData((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function addKeyword(raw: string) {
    const kw = raw.trim().toLowerCase();
    if (!kw) return;
    setData((prev) => ({
      ...prev,
      excludedKeywords: prev.excludedKeywords.includes(kw)
        ? prev.excludedKeywords
        : [...prev.excludedKeywords, kw],
    }));
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setData((prev) => ({
      ...prev,
      excludedKeywords: prev.excludedKeywords.filter((k) => k !== kw),
    }));
  }

  function handleUrlBlur(field: keyof WizardData, value: string) {
    if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
      setData((prev) => ({ ...prev, [field]: `https://${value}` }));
    }
  }

  function canAdvance() {
    if (step === 1) return data.targetRoles.trim().length > 0;
    return true;
  }

  function handleStepAdvance(nextStep: number) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[OnboardingWizard] Step advance — from: ${step}, to: ${nextStep}`);
    }
    setStep((s) => s + 1);
  }

  function handleStepBack(prevStep: number) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[OnboardingWizard] Step back — from: ${step}, to: ${prevStep}`);
    }
    setStep((s) => s - 1);
  }

  function handleComplete() {
    if (process.env.NODE_ENV === "development") {
      console.log("[OnboardingWizard] Submitting — step:", step, "roles:", data.targetRoles);
    }
    setPhase("loading");
    startTransition(async () => {
      try {
        const roles = data.targetRoles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const result = await completeOnboarding({
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
          displayName:      data.displayName.trim() || undefined,
          email:            data.email.trim() || undefined,
          phone:            data.phone.trim() || undefined,
          contactLocation:  data.contactLocation.trim() || undefined,
          linkedinUrl:      data.linkedinUrl.trim() || undefined,
          portfolioUrl:     data.portfolioUrl.trim() || undefined,
          githubUrl:        data.githubUrl.trim() || undefined,
          curriculumVitae:  data.curriculumVitae.trim() || undefined,
          excludedKeywords: data.excludedKeywords.length > 0
            ? data.excludedKeywords
            : undefined,
        });
        if (process.env.NODE_ENV === "development") {
          console.log("[OnboardingWizard] completeOnboarding response:", result);
        }
        document.cookie = "shortlist-onboarded=true; path=/";
        if (result.jobsFound === 0) {
          setPhase("zero-match");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.log("[OnboardingWizard] completeOnboarding error:", err);
        }
        setPhase("form");
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong. Please try again, or contact support if this keeps happening.";
        setError(message);
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

  if (phase === "zero-match") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-subtle)] p-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div
          className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-2xl">
            🔍
          </span>
          <p className="mt-4 text-lg font-semibold text-[var(--text)]">
            No matches yet
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            We didn&apos;t find any matches yet — we&apos;ll search again tomorrow,
            or you can adjust your criteria in Settings.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 cursor-pointer rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90"
          >
            Go to dashboard
          </button>
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
          {/* ── Step 1: Target roles ──────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  What kind of role are you looking for?
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Enter the job titles you&apos;d apply for.
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canAdvance()) {
                      handleStepAdvance(step + 1);
                    }
                  }}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canAdvance()) {
                      handleStepAdvance(step + 1);
                    }
                  }}
                />
                <p className={HINT_CLS}>
                  A short name for this search — handy if you run multiple job
                  searches.
                </p>
              </div>
            </>
          )}

          {/* ── Step 2: Location & remote preference ─────────── */}
          {step === 2 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  Where would you like to work?
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  We&apos;ll use this to filter listings for you.
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canAdvance()) {
                      handleStepAdvance(step + 1);
                    }
                  }}
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

          {/* ── Step 3: Contact details (NEW) ─────────────────── */}
          {step === 3 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  Your contact details
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  These appear at the top of your tailored resume. All fields are
                  optional — you can fill them in later.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS} htmlFor="displayName">
                    Your full name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Jane Smith"
                    value={data.displayName}
                    onChange={update("displayName")}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="contactEmail">
                    Email address
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    className={INPUT_CLS}
                    placeholder="jane@example.com"
                    value={data.email}
                    onChange={update("email")}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="text"
                    className={INPUT_CLS}
                    placeholder="+49 123 456 789"
                    value={data.phone}
                    onChange={update("phone")}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="contactLocation">
                    Your location
                  </label>
                  <input
                    id="contactLocation"
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Berlin, Germany"
                    value={data.contactLocation}
                    onChange={update("contactLocation")}
                  />
                  <p className={HINT_CLS}>City, country — for your resume header.</p>
                </div>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="linkedinUrl">
                  LinkedIn URL
                </label>
                <input
                  id="linkedinUrl"
                  type="text"
                  className={INPUT_CLS}
                  placeholder="https://linkedin.com/in/janesmith"
                  value={data.linkedinUrl}
                  onChange={update("linkedinUrl")}
                  onBlur={(e) => handleUrlBlur("linkedinUrl", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS} htmlFor="portfolioUrl">
                    Portfolio / website
                  </label>
                  <input
                    id="portfolioUrl"
                    type="text"
                    className={INPUT_CLS}
                    placeholder="https://janesmith.dev"
                    value={data.portfolioUrl}
                    onChange={update("portfolioUrl")}
                    onBlur={(e) => handleUrlBlur("portfolioUrl", e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="githubUrl">
                    GitHub
                  </label>
                  <input
                    id="githubUrl"
                    type="text"
                    className={INPUT_CLS}
                    placeholder="https://github.com/janesmith"
                    value={data.githubUrl}
                    onChange={update("githubUrl")}
                    onBlur={(e) => handleUrlBlur("githubUrl", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Step 4: Full CV (NEW) ─────────────────────────── */}
          {step === 4 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  Paste your complete work history
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  This is your full career history — every role, project, and skill
                  you&apos;ve ever had. The AI uses this to write tailored resumes
                  for each job. The more detail, the better the output.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="curriculumVitae">
                  Full CV / work history{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    (optional — you can add it later)
                  </span>
                </label>
                <textarea
                  id="curriculumVitae"
                  className={[
                    INPUT_CLS,
                    "min-h-[260px] resize-y font-[var(--font-geist-mono)] text-xs leading-relaxed",
                  ].join(" ")}
                  placeholder={`Jane Smith\n\nExperience\n──────────\nSenior Software Engineer — Acme Corp  (2021–present)\n- Built and maintained APIs serving 2M daily active users\n- Led migration from monolith to microservices, cutting p99 latency by 40%\n- Mentored 3 junior engineers\n\nSoftware Engineer — Beta Ltd  (2019–2021)\n- Developed React dashboards used by 500 internal analysts\n- Integrated third-party payment APIs (Stripe, Adyen)\n\nEducation\n─────────\nBSc Computer Science — University of Warsaw  (2015–2019)\n\nSkills\n──────\nTypeScript, React, Next.js, Node.js, PostgreSQL, Docker, AWS`}
                  value={data.curriculumVitae}
                  onChange={update("curriculumVitae")}
                  autoFocus
                />
                <p className={HINT_CLS}>
                  Include everything — dates, company names, responsibilities, achievements,
                  and skills. Plain text or light markdown both work.
                </p>
              </div>
            </>
          )}

          {/* ── Step 5: Excluded keywords (NEW) ──────────────── */}
          {step === 5 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  Any roles you want to skip?
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Jobs containing these words will be hidden from your feed — saves
                  you time scrolling past things that aren&apos;t a fit.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="keywordInput">
                  Keywords to exclude{" "}
                  <span className="font-normal text-[var(--text-muted)]">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="keywordInput"
                    type="text"
                    className={INPUT_CLS}
                    placeholder="e.g. manager, lead, senior"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addKeyword(keywordInput);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => addKeyword(keywordInput)}
                    className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-muted)] whitespace-nowrap transition-colors hover:text-[var(--text)]"
                  >
                    Add
                  </button>
                </div>
                <p className={HINT_CLS}>Press Enter or comma to add. Case-insensitive.</p>
              </div>
              {data.excludedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.excludedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-1 text-xs font-medium text-[var(--text)]"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        aria-label={`Remove ${kw}`}
                        className="cursor-pointer leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {data.excludedKeywords.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">
                  No keywords added yet. You can skip this step and add them later in
                  Settings.
                </p>
              )}
            </>
          )}

          {/* ── Step 6: Master resume ─────────────────────────── */}
          {step === 6 && (
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

          {/* ── Step 7: Salary ────────────────────────────────── */}
          {step === 7 && (
            <>
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">
                  What&apos;s your salary target?
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  We&apos;ll use this to flag listings that are way outside your
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
              onClick={() => handleStepBack(step - 1)}
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
              onClick={() => handleStepAdvance(step + 1)}
              disabled={!canAdvance()}
              className="cursor-pointer rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {/* Steps 3–6 are all optional; show "Skip" when empty, "Next" when filled */}
              {step >= 3 && step <= 6
                ? (
                    (step === 3 && !data.displayName.trim() && !data.email.trim() && !data.contactLocation.trim() && !data.phone.trim() && !data.linkedinUrl.trim() && !data.portfolioUrl.trim() && !data.githubUrl.trim()) ||
                    (step === 4 && !data.curriculumVitae.trim()) ||
                    (step === 5 && data.excludedKeywords.length === 0) ||
                    (step === 6 && !data.masterResume.trim())
                      ? "Skip"
                      : "Next"
                  )
                : "Next"}
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
