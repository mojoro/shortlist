"use client";

import { useRef, useState, useEffect } from "react";
import type { ReactNode } from "react";

/* ─── IntersectionObserver hook ─────────────────────────────── */

function useInView(ref: React.RefObject<HTMLElement | null>, margin = "-80px 0px") {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin]);

  return isInView;
}

/* ─── FeatureRow ────────────────────────────────────────────── */

interface FeatureRowProps {
  bold: string;
  italic: string;
  description: string;
  panel: ReactNode;
}

export function FeatureRow({ bold, italic, description, panel }: FeatureRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);

  return (
    <div
      ref={ref}
      className="flex flex-col gap-8 border-t border-t-[#0f0f0f] py-10 md:flex-row md:items-start"
    >
      <div
        className={`w-full shrink-0 transition-all duration-[400ms] ease-out md:w-[220px] ${
          isInView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
      >
        <p className="mb-3 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
          <strong className="font-extrabold text-white">{bold}</strong>{" "}
          <em className="font-normal not-italic text-[#777]">{italic}</em>
        </p>
        <p className="text-[13px] leading-[1.75] text-[#999]">{description}</p>
      </div>
      <div
        className={`min-w-0 flex-1 transition-all delay-100 duration-[400ms] ease-out ${
          isInView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
      >
        {panel}
      </div>
    </div>
  );
}
