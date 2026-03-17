"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { ReactNode } from "react";

interface FeatureRowProps {
  bold: string;
  italic: string;
  description: string;
  panel: ReactNode;
}

export function FeatureRow({ bold, italic, description, panel }: FeatureRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <div
      ref={ref}
      className="flex flex-col gap-8 py-10 md:flex-row md:items-start"
      style={{ borderTop: "1px solid #0f0f0f" }}
    >
      <motion.div
        className="w-full shrink-0 md:w-[220px]"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p
          className="mb-3"
          style={{
            fontSize: "17px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          <strong style={{ color: "#fff", fontWeight: 800 }}>{bold}</strong>{" "}
          <em style={{ fontStyle: "italic", color: "#3a3a3a", fontWeight: 400 }}>{italic}</em>
        </p>
        <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.75 }}>{description}</p>
      </motion.div>
      <motion.div
        className="min-w-0 flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
      >
        {panel}
      </motion.div>
    </div>
  );
}
