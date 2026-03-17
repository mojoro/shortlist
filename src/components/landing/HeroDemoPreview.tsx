"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

/* ─── Scene transition variants ─────────────────────── */

const sceneVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2 } },
};

/* ─── Feed scene ─────────────────────────────────────── */

function FeedScene() {
  return (
    <div className="flex flex-col gap-2">
      {JOBS.map(({ score, title, company, tag }, index) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.35, duration: 0.3, ease: "easeOut" }}
          className="flex items-center gap-2.5"
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
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Tailor scene ───────────────────────────────────── */

function TailorScene() {
  const [phase, setPhase] = useState<"moving" | "clicking" | "streaming">("moving");
  const [streamedText, setStreamedText] = useState("");

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

  // Stream text at 25ms/char — cleanup clears interval on scene exit
  useEffect(() => {
    if (phase !== "streaming") return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i <= RESUME_TEXT.length) {
        setStreamedText(RESUME_TEXT.slice(0, i));
      } else {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
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
              <p className="text-[#aaa]">
                {streamedText}
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
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-[18px] w-[14px]"
        // x: 76 targets the "Tailor →" button approximately.
        // These are pixel offsets from the relative parent; they look correct at
        // typical desktop widths. At very narrow widths the cursor may land slightly
        // off — this is a known cosmetic limitation at mobile sizes.
        initial={{ x: 200, y: 0, opacity: 0 }}
        animate={
          phase === "moving"
            ? { x: 76, y: 6, opacity: 1 }
            : phase === "clicking"
              ? { x: 76, y: 6, scale: 0.8, opacity: 1 }
              : { x: 76, y: 6, opacity: 0 }
        }
        transition={{
          duration: phase === "moving" ? 0.6 : 0.1,
          ease: "easeInOut",
        }}
      >
        <svg viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2 2L2 14L5.5 11L8 15.5L9.5 14.8L7 10.3L11 10.3L2 2Z"
            fill="white"
            stroke="#080808"
            strokeWidth="0.6"
          />
        </svg>
      </motion.div>
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
              <motion.div
                key={title}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: colIndex * 0.15 + cardIndex * 0.1,
                  duration: 0.25,
                  ease: "easeOut",
                }}
                className="rounded-[3px] border border-[#1e1e1e] bg-[#161616] px-2 py-1.5"
              >
                <p className="mb-px truncate text-[8px] font-semibold text-[#ccc]">{title}</p>
                <p className="text-[7px] text-[#444]">{company}</p>
              </motion.div>
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
  // AnimatePresence mode="wait" guarantees the exit animation (200ms) always
  // completes before the entering scene mounts, so the bare setTimeout is safe —
  // the state change queues the transition; it does not immediately show the new scene.
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
        <AnimatePresence mode="wait">
          <motion.span
            key={scene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#333]"
          >
            {SCENE_LABELS[scene]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Scene content */}
      <div className="min-h-[148px] px-3.5 pb-3 pt-3.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            variants={sceneVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {scene === "feed" && <FeedScene />}
            {scene === "tailor" && <TailorScene />}
            {scene === "pipeline" && <PipelineScene />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
