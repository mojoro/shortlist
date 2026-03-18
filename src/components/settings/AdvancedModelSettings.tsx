"use client";

import { useState, useTransition } from "react";
import type { Profile } from "@prisma/client";
import { TAILOR_MODEL, ANALYZE_MODEL, EXTRACT_MODEL } from "@/lib/models";
import { updateModelSettings } from "@/app/(dashboard)/settings/model-actions";

// ── Preset definitions ───────────────────────────────────────────────────

type Preset = { value: string; label: string; description: string; url: string };

const ANALYZE_PRESETS: Preset[] = [
  { value: ANALYZE_MODEL, label: "Claude Haiku 4.5", description: "Fast, accurate, cost-effective (default)", url: "https://openrouter.ai/anthropic/claude-haiku-4.5" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Very fast, good for bulk scoring", url: "https://openrouter.ai/google/gemini-2.5-flash" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", description: "Balanced speed and quality", url: "https://openrouter.ai/openai/gpt-4.1-mini" },
];

const TAILOR_PRESETS: Preset[] = [
  { value: TAILOR_MODEL, label: "Qwen 3.5 397B MoE", description: "Excellent writing quality (default)", url: "https://openrouter.ai/qwen/qwen3.5-397b-a17b" },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", description: "Strong writing, reliable formatting", url: "https://openrouter.ai/anthropic/claude-sonnet-4" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "High quality, good at following instructions", url: "https://openrouter.ai/google/gemini-2.5-pro" },
];

const EXTRACT_PRESETS: Preset[] = [
  { value: EXTRACT_MODEL, label: "Claude Haiku 4.5", description: "Fast structured extraction (default)", url: "https://openrouter.ai/anthropic/claude-haiku-4.5" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Very fast, good accuracy", url: "https://openrouter.ai/google/gemini-2.5-flash" },
];

// ── Component ────────────────────────────────────────────────────────────

interface Props {
  profile: Profile;
}

type TaskKey = "analyze" | "tailor" | "extract";

const TASKS: {
  key: TaskKey;
  label: string;
  description: string;
  defaultModel: string;
  presets: Preset[];
}[] = [
  { key: "analyze", label: "Scoring", description: "Evaluates how well a job matches your profile", defaultModel: ANALYZE_MODEL, presets: ANALYZE_PRESETS },
  { key: "tailor", label: "Tailoring", description: "Rewrites your resume for a specific job", defaultModel: TAILOR_MODEL, presets: TAILOR_PRESETS },
  { key: "extract", label: "Extraction", description: "Extracts structured data from pasted job text", defaultModel: EXTRACT_MODEL, presets: EXTRACT_PRESETS },
];

export function AdvancedModelSettings({ profile }: Props) {
  const [models, setModels] = useState<Record<TaskKey, string | null>>({
    analyze: profile.customAnalyzeModel,
    tailor: profile.customTailorModel,
    extract: profile.customExtractModel,
  });
  const [customInputs, setCustomInputs] = useState<Record<TaskKey, string>>({
    analyze: profile.customAnalyzeModel ?? "",
    tailor: profile.customTailorModel ?? "",
    extract: profile.customExtractModel ?? "",
  });
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  const hasOverrides = Object.values(models).some((v) => v !== null);

  // Track which tasks have the custom radio selected (separate from model value)
  const [customActive, setCustomActive] = useState<Record<TaskKey, boolean>>({
    analyze: profile.customAnalyzeModel !== null && !ANALYZE_PRESETS.some((p) => p.value === profile.customAnalyzeModel),
    tailor: profile.customTailorModel !== null && !TAILOR_PRESETS.some((p) => p.value === profile.customTailorModel),
    extract: profile.customExtractModel !== null && !EXTRACT_PRESETS.some((p) => p.value === profile.customExtractModel),
  });

  function isCustom(key: TaskKey): boolean {
    return customActive[key];
  }

  function handlePresetChange(key: TaskKey, value: string | null) {
    setModels((prev) => ({ ...prev, [key]: value }));
    setCustomActive((prev) => ({ ...prev, [key]: false }));
    if (status !== "idle") setStatus("idle");
  }

  function handleCustomInput(key: TaskKey, value: string) {
    setCustomInputs((prev) => ({ ...prev, [key]: value }));
    setModels((prev) => ({ ...prev, [key]: value.trim() || null }));
    if (status !== "idle") setStatus("idle");
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateModelSettings({
          profileId: profile.id,
          customTailorModel: models.tailor,
          customAnalyzeModel: models.analyze,
          customExtractModel: models.extract,
        });
        setStatus("saved");
      } catch (err) {
        setStatus("error");
        setErrorText(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleReset() {
    setModels({ analyze: null, tailor: null, extract: null });
    setCustomInputs({ analyze: "", tailor: "", extract: "" });
    setCustomActive({ analyze: false, tailor: false, extract: false });
    // Persist the reset immediately
    startTransition(async () => {
      try {
        await updateModelSettings({
          profileId: profile.id,
          customTailorModel: null,
          customAnalyzeModel: null,
          customExtractModel: null,
        });
        setStatus("saved");
      } catch (err) {
        setStatus("error");
        setErrorText(err instanceof Error ? err.message : "Failed to reset");
      }
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Advanced: AI models
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Override the AI models used for scoring, tailoring, and extraction.
        </p>
      </div>

      {/* Warning banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Proceed with caution
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
          Selecting an incompatible model may cause scoring, tailoring, or
          extraction to fail. Only change these if you know what you&apos;re
          doing.
        </p>
      </div>

      {/* Task sections */}
      {TASKS.map((task) => {
        const currentValue = models[task.key];
        const custom = isCustom(task.key);

        return (
          <div key={task.key} className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {task.label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {task.description}
              </p>
            </div>

            <div className="space-y-1.5">
              {task.presets.map((preset) => (
                <label
                  key={preset.value}
                  className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 transition-colors hover:border-[var(--border-strong)] cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`model-${task.key}`}
                    checked={!custom && (currentValue === preset.value || (currentValue === null && preset.value === task.defaultModel))}
                    onChange={() => handlePresetChange(task.key, preset.value === task.defaultModel ? null : preset.value)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text)]">
                      {preset.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {preset.description}
                      {" — "}
                      <a
                        href={preset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-[var(--text)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View on OpenRouter
                      </a>
                    </p>
                  </div>
                </label>
              ))}

              {/* Custom option */}
              <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 transition-colors hover:border-[var(--border-strong)] cursor-pointer">
                <input
                  type="radio"
                  name={`model-${task.key}`}
                  checked={custom}
                  onChange={() => {
                    setCustomInputs((prev) => ({ ...prev, [task.key]: "" }));
                    setModels((prev) => ({ ...prev, [task.key]: null }));
                    setCustomActive((prev) => ({ ...prev, [task.key]: true }));
                  }}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">
                    Custom
                  </p>
                  {custom && (
                    <div className="mt-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={customInputs[task.key]}
                        onChange={(e) => handleCustomInput(task.key, e.target.value)}
                        placeholder="e.g. anthropic/claude-sonnet-4"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Enter any{" "}
                        <a
                          href="https://openrouter.ai/models"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-[var(--text)]"
                        >
                          OpenRouter model ID
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        );
      })}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex min-h-[36px] items-center rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-fg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {isPending ? "Saving..." : "Save models"}
        </button>

        {hasOverrides && (
          <button
            onClick={handleReset}
            disabled={isPending}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Reset to defaults
          </button>
        )}

        {status === "saved" && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Saved
          </span>
        )}
        {status === "error" && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errorText}
          </span>
        )}
      </div>
    </section>
  );
}
