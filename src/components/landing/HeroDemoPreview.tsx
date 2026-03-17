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
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {JOBS.map(({ score, title, company, tag }, index) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.35, duration: 0.3, ease: "easeOut" }}
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#e0e0e0",
                marginBottom: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </p>
            <p style={{ fontSize: "9px", color: "#444" }}>{company}</p>
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
                flexShrink: 0,
              }}
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
    <div style={{ position: "relative" }}>
      {/* Two-column layout */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        {/* Job Description */}
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
          <div style={{ fontSize: "9px", color: "#555", lineHeight: 1.65 }}>
            <p>Senior Frontend Engineer</p>
            <p style={{ marginTop: "4px", opacity: 0.7 }}>5+ yrs React, TypeScript</p>
            <p style={{ marginTop: "4px", opacity: 0.5 }}>Remote · Series B startup</p>
            <p style={{ marginTop: "4px", opacity: 0.35 }}>Own the design system</p>
          </div>
        </div>
        <div style={{ width: "1px", background: "#1e1e1e", flexShrink: 0 }} />
        {/* Your Resume */}
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
          <div style={{ fontSize: "9px", lineHeight: 1.65, minHeight: "60px" }}>
            {phase === "streaming" ? (
              <p style={{ color: "#aaa" }}>
                {streamedText}
                <span style={{ opacity: 0.5 }}>|</span>
              </p>
            ) : (
              <div style={{ color: "#555" }}>
                <p>Led frontend at early-stage startup</p>
                <p style={{ marginTop: "4px", opacity: 0.7 }}>React, Node, PostgreSQL</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tailor button — lights up cyan after click */}
      <div
        style={{
          display: "inline-flex",
          height: "22px",
          alignItems: "center",
          padding: "0 10px",
          background:
            phase === "moving" ? "rgba(34,211,238,0.08)" : "#22d3ee",
          color: phase === "moving" ? "#22d3ee" : "#080808",
          border: "1px solid rgba(34,211,238,0.25)",
          borderRadius: "4px",
          fontSize: "9px",
          fontWeight: 700,
          transition: "all 0.15s",
        }}
      >
        Tailor →
      </div>

      {/* Simulated cursor */}
      <motion.div
        style={{
          position: "absolute",
          pointerEvents: "none",
          zIndex: 10,
          width: "14px",
          height: "18px",
          bottom: 0,
          left: 0,
        }}
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
    <div style={{ display: "flex", gap: "8px" }}>
      {PIPELINE_COLS.map(({ label, cards }, colIndex) => (
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
                style={{
                  padding: "6px 8px",
                  background: "#161616",
                  border: "1px solid #1e1e1e",
                  borderRadius: "3px",
                }}
              >
                <p
                  style={{
                    fontSize: "8px",
                    fontWeight: 600,
                    color: "#ccc",
                    marginBottom: "1px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </p>
                <p style={{ fontSize: "7px", color: "#444" }}>{company}</p>
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
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid #1a1a1a",
        borderRadius: "6px",
        overflow: "hidden",
        boxShadow: "0 0 60px rgba(34,211,238,0.04)",
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
        <AnimatePresence mode="wait">
          <motion.span
            key={scene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#333",
              textTransform: "uppercase",
            }}
          >
            {SCENE_LABELS[scene]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Scene content */}
      <div style={{ padding: "14px 14px 12px", minHeight: "148px" }}>
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
