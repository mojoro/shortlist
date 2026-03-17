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
      className="flex flex-col gap-8 border-t border-t-[#0f0f0f] py-10 md:flex-row md:items-start"
    >
      <motion.div
        className="w-full shrink-0 md:w-[220px]"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p className="mb-3 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
          <strong className="font-extrabold text-white">{bold}</strong>{" "}
          <em className="font-normal not-italic text-[#777]">{italic}</em>
        </p>
        <p className="text-[13px] leading-[1.75] text-[#999]">{description}</p>
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
