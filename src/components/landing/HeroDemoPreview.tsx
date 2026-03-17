"use client";

import { useState, useEffect } from "react";

/* ─── Types & constants ─────────────────────────────── */

type Scene = "feed" | "tailor" | "pipeline";

const SCENE_ORDER: Scene[] = ["feed", "tailor", "pipeline"];

const SCENE_DURATIONS: Record<Scene, number> = {
  feed: 5000,
  tailor: 5000,
  pipeline: 4000,
};

const SCENE_LABELS: Record<Scene, string> = {
  feed: "JOB FEED",
  tailor: "TAILOR",
  pipeline: "PIPELINE",
};

/* ─── Mock data ─────────────────────────────────────── */

const JOBS = [
  { score: 94, title: "Senior Frontend Engineer", company: "Linear", tag: "GO" as const },
  { score: 81, title: "Product Engineer", company: "Vercel", tag: "EXAMINE" as const },
  { score: 67, title: "Full-Stack Developer", company: "Stripe", tag: null },
];

const PIPELINE_COLS = [
  {
    label: "Saved",
    cards: [
      { title: "Senior Frontend Engineer", company: "Linear" },
      { title: "Staff Engineer", company: "Loom" },
    ],
  },
  {
    label: "Applied",
    cards: [
      { title: "Product Engineer", company: "Vercel" },
      { title: "Full-Stack Developer", company: "Stripe" },
    ],
  },
  { label: "Interview", cards: [{ title: "Frontend Engineer", company: "Notion" }] },
  { label: "Offer", cards: [] },
];

const RESUME_TEXT =
  "Rebuilt the core data pipeline in TypeScript, reducing P99 latency by 40% and eliminating three legacy service dependencies.";

/* ─── Feed scene ─────────────────────────────────────── */

function FeedScene() {
  return (
    <div className="flex flex-col gap-2">
      {JOBS.map(({ score, title, company, tag }, index) => (
        <div
          key={title}
          className="flex items-center gap-2.5 opacity-0 animate-[fade-in-up_0.3s_ease-out_forwards]"
          style={{ animationDelay: `${index * 0.35}s` }}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-black ${
              score === 94 ? "bg-[#22d3ee] text-[#080808]" : "bg-[#1a1a1a] text-white"
            }`}
          >
            {score}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 truncate text-[11px] font-semibold text-[#e0e0e0]">{title}</p>
            <p className="text-[9px] text-[#444]">{company}</p>
          </div>
          {tag && (
            <span
              className={`shrink-0 whitespace-nowrap rounded-[3px] border px-[7px] py-0.5 text-[8px] font-bold tracking-[0.06em] ${
                tag === "GO"
                  ? "border-[rgba(34,211,238,0.2)] bg-[rgba(34,211,238,0.08)] text-[#22d3ee]"
                  : "border-[#1e1e1e] bg-[#141414] text-[#555]"
              }`}
            >
              {tag}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Tailor scene ───────────────────────────────────── */

function TailorScene() {
  const [phase, setPhase] = useState<"moving" | "clicking" | "streaming">("moving");

  // Cursor finishes moving at 700ms, then clicks
  useEffect(() => {
    const t = setTimeout(() => setPhase("clicking"), 700);
    return () => clearTimeout(t);
  }, []);

  // Click pulse lasts 200ms, then streaming starts
  useEffect(() => {
    if (phase !== "clicking") return;
    const t = setTimeout(() => setPhase("streaming"), 200);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="relative">
      {/* Two-column layout */}
      <div className="mb-3 flex gap-3">
        {/* Job Description */}
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[#444]">
            Job Description
          </p>
          <div className="text-[9px] leading-[1.65] text-[#555]">
            <p>Senior Frontend Engineer</p>
            <p className="mt-1 opacity-70">5+ yrs React, TypeScript</p>
            <p className="mt-1 opacity-50">Remote · Series B startup</p>
            <p className="mt-1 opacity-[0.35]">Own the design system</p>
          </div>
        </div>
        <div className="w-px shrink-0 bg-[#1e1e1e]" />
        {/* Your Resume */}
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[#444]">
            Your Resume
          </p>
          <div className="min-h-[60px] text-[9px] leading-[1.65]">
            {phase === "streaming" ? (
              <p className="overflow-hidden whitespace-nowrap text-[#aaa] animate-[text-reveal_3s_linear_forwards]">
                {RESUME_TEXT}
                <span className="opacity-50">|</span>
              </p>
            ) : (
              <div className="text-[#555]">
                <p>Led frontend at early-stage startup</p>
                <p className="mt-1 opacity-70">React, Node, PostgreSQL</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tailor button — lights up cyan after click */}
      <div
        className={`inline-flex h-[22px] items-center rounded border border-[rgba(34,211,238,0.25)] px-[10px] text-[9px] font-bold transition-all duration-150 ${
          phase === "moving"
            ? "bg-[rgba(34,211,238,0.08)] text-[#22d3ee]"
            : "bg-[#22d3ee] text-[#080808]"
        }`}
      >
        Tailor →
      </div>

      {/* Simulated cursor */}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 z-10 h-[18px] w-[14px] transition-all ease-in-out ${
          phase === "moving"
            ? "translate-x-[76px] translate-y-[6px] opacity-100 duration-[600ms]"
            : phase === "clicking"
              ? "translate-x-[76px] translate-y-[6px] scale-[0.8] opacity-100 duration-100"
              : "translate-x-[76px] translate-y-[6px] opacity-0 duration-100"
        }`}
      >
        <svg viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2 2L2 14L5.5 11L8 15.5L9.5 14.8L7 10.3L11 10.3L2 2Z"
            fill="white"
            stroke="#080808"
            strokeWidth="0.6"
          />
        </svg>
      </div>
    </div>
  );
}

/* ─── Pipeline scene ─────────────────────────────────── */

function PipelineScene() {
  return (
    <div className="flex gap-2">
      {PIPELINE_COLS.map(({ label, cards }, colIndex) => (
        <div key={label} className="min-w-0 flex-1">
          <p className="mb-1.5 truncate text-[8px] font-bold uppercase tracking-[0.06em] text-[#444]">
            {label}
          </p>
          <div className="flex flex-col gap-1">
            {cards.map(({ title, company }, cardIndex) => (
              <div
                key={title}
                className="rounded-[3px] border border-[#1e1e1e] bg-[#161616] px-2 py-1.5 opacity-0 animate-[fade-in-up_0.25s_ease-out_forwards]"
                style={{ animationDelay: `${colIndex * 0.15 + cardIndex * 0.1}s` }}
              >
                <p className="mb-px truncate text-[8px] font-semibold text-[#ccc]">{title}</p>
                <p className="text-[7px] text-[#444]">{company}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main export ────────────────────────────────────── */

export function HeroDemoPreview() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = SCENE_ORDER[sceneIndex];

  // Advance to the next scene after each duration.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSceneIndex((i) => (i + 1) % SCENE_ORDER.length);
    }, SCENE_DURATIONS[scene]);
    return () => clearTimeout(timer);
  }, [sceneIndex, scene]);

  return (
    <div className="overflow-hidden rounded-md border border-[#1a1a1a] bg-[#0d0d0d] shadow-[0_0_60px_rgba(34,211,238,0.04)]">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 border-b border-b-[#1a1a1a] bg-[#111] px-3 py-[7px]">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#2a2a2a]"
            />
          ))}
        </div>
        <span
          key={scene}
          className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#333] animate-[fade-in-up_0.2s_ease-out_forwards]"
        >
          {SCENE_LABELS[scene]}
        </span>
      </div>

      {/* Scene content — key forces remount which triggers animations */}
      <div className="min-h-[148px] px-3.5 pb-3 pt-3.5">
        <div key={scene} className="animate-[fade-in-up_0.25s_ease-out_forwards]">
          {scene === "feed" && <FeedScene />}
          {scene === "tailor" && <TailorScene />}
          {scene === "pipeline" && <PipelineScene />}
        </div>
      </div>
    </div>
  );
}
