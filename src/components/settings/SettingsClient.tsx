"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import type { Profile } from "@prisma/client";
import {
  updateProfileInfo,
  updateSearchCriteria,
  updateResume,
  updateResumeWritingRules,
  createProfile,
  switchProfile,
  deleteProfile,
  rematchProfile,
} from "@/app/(dashboard)/settings/actions";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitTags(val: string): string[] {
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinTags(arr: string[]): string {
  return arr.join(", ");
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-[var(--text-muted)]">{children}</p>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    />
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-[var(--text)]">{children}</h2>
  );
}

function SaveButton({
  isPending,
  saved,
  label = "Save",
}: {
  isPending: boolean;
  saved: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex min-h-[36px] items-center rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-fg)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
    >
      {isPending ? "Saving…" : saved ? "Saved ✓" : label}
    </button>
  );
}

function Divider() {
  return <hr className="border-[var(--border)]" />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profile:     Profile;
  allProfiles: Profile[];
}

// ─── Profiles section ─────────────────────────────────────────────────────────

function ProfilesSection({ profile, allProfiles }: Props) {
  const router = useRouter();
  const [newName, setNewName]         = useState("");
  const [creating, startCreating]     = useTransition();
  const [switching, startSwitching]   = useTransition();
  const [deleting, startDeleting]     = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateError(null);
    startCreating(async () => {
      try {
        await createProfile({ name: newName.trim() });
        setNewName("");
        router.refresh();
      } catch {
        setCreateError("Couldn't create profile. Please try again.");
      }
    });
  }

  function handleSwitch(profileId: string) {
    startSwitching(async () => {
      await switchProfile({ profileId });
      router.refresh();
    });
  }

  function handleDelete(profileId: string) {
    startDeleting(async () => {
      await deleteProfile({ profileId });
      setConfirmDeleteId(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <SectionHeading>Profiles</SectionHeading>
      <p className="text-sm text-[var(--text-muted)]">
        Each profile is a separate job search with its own criteria and resume.
        The active profile drives your feed.
      </p>

      <ul className="space-y-2">
        {allProfiles.map((p) => (
          <li
            key={p.id}
            className={[
              "flex items-center justify-between rounded-lg border px-4 py-3",
              p.isActive
                ? "border-[var(--accent)] bg-[var(--bg-subtle)]"
                : "border-[var(--border)] bg-[var(--bg-card)]",
            ].join(" ")}
          >
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{p.name}</p>
              {p.isActive && (
                <p className="text-xs text-[var(--accent)]">Active</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!p.isActive && (
                <button
                  onClick={() => handleSwitch(p.id)}
                  disabled={switching}
                  className="cursor-pointer text-xs font-medium text-[var(--text-muted)] underline underline-offset-2 transition-colors hover:text-[var(--text)] disabled:opacity-50"
                >
                  {switching ? "Switching…" : "Make active"}
                </button>
              )}
              {confirmDeleteId === p.id ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Delete?</span>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting}
                    className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(p.id)}
                  className="text-xs text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400"
                  aria-label={`Delete profile ${p.name}`}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="flex items-end gap-3">
        <div className="flex-1">
          <Label>New profile name</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder='e.g. "Frontend Berlin" or "Automation Remote"'
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="inline-flex min-h-[36px] items-center rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>
      {createError && (
        <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>
      )}
    </section>
  );
}

// ─── Profile info section ─────────────────────────────────────────────────────

function ProfileInfoSection({ profile }: { profile: Profile }) {
  const [fields, setFields] = useState({
    name:         profile.name,
    displayName:  profile.displayName  ?? "",
    email:        profile.email        ?? "",
    phone:        profile.phone        ?? "",
    location:     profile.location     ?? "",
    linkedinUrl:  profile.linkedinUrl  ?? "",
    portfolioUrl: profile.portfolioUrl ?? "",
    githubUrl:    profile.githubUrl    ?? "",
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]            = useState(false);
  const [error, setError]            = useState<string | null>(null);

  function handleChange(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      setSaved(false);
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateProfileInfo({ profileId: profile.id, ...fields });
        setSaved(true);
      } catch {
        setError("Couldn't save. Please try again.");
      }
    });
  }

  return (
    <section>
      <SectionHeading>Profile info</SectionHeading>
      <p className="mt-1 mb-5 text-sm text-[var(--text-muted)]">
        Your name and contact details — used in tailored resume headers.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Profile name</Label>
            <Input value={fields.name} onChange={handleChange("name")} required />
            <Hint>Internal label for this search profile.</Hint>
          </div>
          <div>
            <Label>Display name</Label>
            <Input value={fields.displayName} onChange={handleChange("displayName")} placeholder="John Moorman" />
            <Hint>Full name as it appears on your resume.</Hint>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Email</Label>
            <Input type="email" value={fields.email} onChange={handleChange("email")} placeholder="john@example.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input type="tel" value={fields.phone} onChange={handleChange("phone")} placeholder="+49 123 456789" />
          </div>
        </div>
        <div>
          <Label>Location</Label>
          <Input value={fields.location} onChange={handleChange("location")} placeholder="Berlin, Germany" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>LinkedIn</Label>
            <Input value={fields.linkedinUrl} onChange={handleChange("linkedinUrl")} placeholder="linkedin.com/in/you" />
          </div>
          <div>
            <Label>Portfolio</Label>
            <Input value={fields.portfolioUrl} onChange={handleChange("portfolioUrl")} placeholder="yoursite.com" />
          </div>
          <div>
            <Label>GitHub</Label>
            <Input value={fields.githubUrl} onChange={handleChange("githubUrl")} placeholder="github.com/you" />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <SaveButton isPending={isPending} saved={saved} />
      </form>
    </section>
  );
}

// ─── Search criteria section ──────────────────────────────────────────────────

function SearchCriteriaSection({ profile }: { profile: Profile }) {
  const [fields, setFields] = useState({
    targetRoles:      joinTags(profile.targetRoles),
    targetLocations:  joinTags(profile.targetLocations),
    remotePreference: profile.remotePreference as string,
    currency:         profile.currency,
    targetSalaryMin:  profile.targetSalaryMin?.toString() ?? "",
    targetSalaryMax:  profile.targetSalaryMax?.toString() ?? "",
    requiredSkills:   joinTags(profile.requiredSkills),
    niceToHaveSkills: joinTags(profile.niceToHaveSkills),
    excludedKeywords: joinTags(profile.excludedKeywords),
  });
  const [isPending,   startTransition]   = useTransition();
  const [rematching,  startRematch]      = useTransition();
  const [saved,       setSaved]          = useState(false);
  const [rematchResult, setRematchResult] = useState<{ removed: number; added: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      setSaved(false);
      setRematchResult(null);
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateSearchCriteria({
          profileId:        profile.id,
          targetRoles:      splitTags(fields.targetRoles),
          targetLocations:  splitTags(fields.targetLocations),
          remotePreference: fields.remotePreference,
          currency:         fields.currency,
          targetSalaryMin:  fields.targetSalaryMin ? parseInt(fields.targetSalaryMin, 10) : null,
          targetSalaryMax:  fields.targetSalaryMax ? parseInt(fields.targetSalaryMax, 10) : null,
          requiredSkills:   splitTags(fields.requiredSkills),
          niceToHaveSkills: splitTags(fields.niceToHaveSkills),
          excludedKeywords: splitTags(fields.excludedKeywords),
        });
        setSaved(true);
      } catch {
        setError("Couldn't save. Please try again.");
      }
    });
  }

  function handleRematch() {
    setRematchResult(null);
    startRematch(async () => {
      try {
        const result = await rematchProfile(profile.id);
        setRematchResult(result);
      } catch {
        setError("Couldn't refresh matches. Please try again.");
      }
    });
  }

  return (
    <section>
      <SectionHeading>Search criteria</SectionHeading>
      <p className="mt-1 mb-5 text-sm text-[var(--text-muted)]">
        These drive your match scores and which jobs appear in your feed.
        Separate multiple values with commas.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Target roles</Label>
          <Input
            value={fields.targetRoles}
            onChange={handleChange("targetRoles")}
            placeholder="Frontend Engineer, Fullstack Engineer"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Target locations</Label>
            <Input
              value={fields.targetLocations}
              onChange={handleChange("targetLocations")}
              placeholder="Berlin, Remote"
            />
          </div>
          <div>
            <Label>Remote preference</Label>
            <Select value={fields.remotePreference} onChange={handleChange("remotePreference")}>
              <option value="ANY">Any</option>
              <option value="REMOTE_ONLY">Remote only</option>
              <option value="HYBRID_OK">Hybrid OK</option>
              <option value="ONSITE_ONLY">On-site only</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Min salary</Label>
            <Input
              type="number"
              value={fields.targetSalaryMin}
              onChange={handleChange("targetSalaryMin")}
              placeholder="60000"
            />
          </div>
          <div>
            <Label>Max salary</Label>
            <Input
              type="number"
              value={fields.targetSalaryMax}
              onChange={handleChange("targetSalaryMax")}
              placeholder="100000"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Input
              value={fields.currency}
              onChange={handleChange("currency")}
              placeholder="EUR"
              maxLength={5}
            />
          </div>
        </div>
        <div>
          <Label>Required skills</Label>
          <Input
            value={fields.requiredSkills}
            onChange={handleChange("requiredSkills")}
            placeholder="TypeScript, React, Next.js"
          />
        </div>
        <div>
          <Label>Nice-to-have skills</Label>
          <Input
            value={fields.niceToHaveSkills}
            onChange={handleChange("niceToHaveSkills")}
            placeholder="GraphQL, Docker"
          />
        </div>
        <div>
          <Label>Excluded keywords</Label>
          <Input
            value={fields.excludedKeywords}
            onChange={handleChange("excludedKeywords")}
            placeholder="Senior, Lead, 10+ years"
          />
          <Hint>Jobs containing these words in the title or description are hidden automatically.</Hint>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <SaveButton isPending={isPending} saved={saved} />
          {saved && (
            <button
              type="button"
              onClick={handleRematch}
              disabled={rematching}
              className="inline-flex min-h-[36px] items-center rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
            >
              {rematching ? "Refreshing…" : "Refresh job matches"}
            </button>
          )}
        </div>
        {rematchResult && (
          <p className="text-xs text-[var(--text-muted)]">
            Done — {rematchResult.added} new{" "}
            {rematchResult.added === 1 ? "match" : "matches"} added
            {rematchResult.removed > 0
              ? `, ${rematchResult.removed} stale ${rematchResult.removed === 1 ? "listing" : "listings"} removed`
              : ""}.
          </p>
        )}
      </form>
    </section>
  );
}

// ─── Resume section ───────────────────────────────────────────────────────────

function ResumeSection({ profile }: { profile: Profile }) {
  const [masterResume,    setMasterResume]    = useState(profile.masterResume    ?? "");
  const [curriculumVitae, setCurriculumVitae] = useState(profile.curriculumVitae ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved,     setSaved]        = useState(false);
  const [error,     setError]        = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateResume({ profileId: profile.id, masterResume, curriculumVitae });
        setSaved(true);
      } catch {
        setError("Couldn't save. Please try again.");
      }
    });
  }

  return (
    <section>
      <SectionHeading>Resume</SectionHeading>
      <p className="mt-1 mb-5 text-sm text-[var(--text-muted)]">
        Your base resume is used as the template for tailoring. Your full CV gives the
        AI more content to draw from when generating tailored versions.
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label>Base resume</Label>
          <Hint>
            The curated resume you normally send out. Used as the format template for
            tailoring.
          </Hint>
          <div className="mt-2" data-color-mode="auto">
            <MDEditor
              value={masterResume}
              onChange={(val) => { setMasterResume(val ?? ""); setSaved(false); }}
              height={320}
              preview="edit"
            />
          </div>
        </div>
        <div>
          <Label>Full CV</Label>
          <Hint>
            Everything you&apos;ve ever done — all experience, all skills. The AI draws
            from this when tailoring. Leave blank to use your base resume instead.
          </Hint>
          <div className="mt-2" data-color-mode="auto">
            <MDEditor
              value={curriculumVitae}
              onChange={(val) => { setCurriculumVitae(val ?? ""); setSaved(false); }}
              height={320}
              preview="edit"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <SaveButton isPending={isPending} saved={saved} />
      </form>
    </section>
  );
}

// ─── Resume writing rules section ─────────────────────────────────────────────

function toLines(arr: string[] | null): string {
  return (arr ?? []).join("\n");
}

function fromLines(val: string): string[] {
  return val.split("\n").map((s) => s.trim()).filter(Boolean);
}

function ResumeWritingRulesSection({ profile }: { profile: Profile }) {
  const [fields, setFields] = useState({
    protectedPhrases: toLines(profile.protectedPhrases),
    bannedPhrases:    toLines(profile.bannedPhrases),
    verifiedMetrics:  toLines(profile.verifiedMetrics),
    neverClaim:       toLines(profile.neverClaim),
  });
  const [isPending, startTransition] = useTransition();
  const [saved,     setSaved]        = useState(false);
  const [error,     setError]        = useState<string | null>(null);

  function handleChange(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      setSaved(false);
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateResumeWritingRules({
          profileId:        profile.id,
          protectedPhrases: fromLines(fields.protectedPhrases),
          bannedPhrases:    fromLines(fields.bannedPhrases),
          verifiedMetrics:  fromLines(fields.verifiedMetrics),
          neverClaim:       fromLines(fields.neverClaim),
        });
        setSaved(true);
      } catch {
        setError("Couldn't save. Please try again.");
      }
    });
  }

  const textareaClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-y";

  return (
    <section>
      <SectionHeading>Resume writing rules</SectionHeading>
      <p className="mt-1 mb-5 text-sm text-[var(--text-muted)]">
        Fine-tune how the AI writes your resume. One entry per line.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Protected phrases</Label>
          <textarea
            rows={3}
            className={textareaClass}
            value={fields.protectedPhrases}
            onChange={handleChange("protectedPhrases")}
            placeholder={"cross-functional collaboration\nzero-downtime deployments"}
          />
          <Hint>Use these verbatim — the AI will never paraphrase them.</Hint>
        </div>
        <div>
          <Label>Banned phrases</Label>
          <textarea
            rows={3}
            className={textareaClass}
            value={fields.bannedPhrases}
            onChange={handleChange("bannedPhrases")}
            placeholder={"passionate about\nresults-driven\nthought leader"}
          />
          <Hint>The AI will never use these phrases in any resume it writes.</Hint>
        </div>
        <div>
          <Label>Verified metrics</Label>
          <textarea
            rows={3}
            className={textareaClass}
            value={fields.verifiedMetrics}
            onChange={handleChange("verifiedMetrics")}
            placeholder={"reduced deploy time by 40%\ngrew ARR from $2M to $8M"}
          />
          <Hint>Use these figures exactly — no rounding, rewording, or omitting.</Hint>
        </div>
        <div>
          <Label>Never claim</Label>
          <textarea
            rows={3}
            className={textareaClass}
            value={fields.neverClaim}
            onChange={handleChange("neverClaim")}
            placeholder={"Kubernetes production experience\nteam management"}
          />
          <Hint>Never imply or claim experience with these — even if adjacent skills exist.</Hint>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <SaveButton isPending={isPending} saved={saved} />
      </form>
    </section>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function SettingsClient({ profile, allProfiles }: Props) {
  return (
    <div className="space-y-10">
      <ProfilesSection profile={profile} allProfiles={allProfiles} />
      <Divider />
      <ProfileInfoSection profile={profile} />
      <Divider />
      <SearchCriteriaSection profile={profile} />
      <Divider />
      <ResumeSection profile={profile} />
      <Divider />
      <ResumeWritingRulesSection profile={profile} />
      <Divider />
      <section>
        <SectionHeading>Account</SectionHeading>
        <p className="mt-1 mb-4 text-sm text-[var(--text-muted)]">
          Sign out of your account on this device.
        </p>
        <SignOutButton redirectUrl="/">
          <button className="inline-flex min-h-[36px] items-center rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
            Sign out
          </button>
        </SignOutButton>
      </section>
    </div>
  );
}
