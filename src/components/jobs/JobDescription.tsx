"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const Markdown = dynamic(
  () => import("@uiw/react-md-editor").then((m) => m.default.Markdown),
  { ssr: false },
);

export function JobDescription({ source }: { source: string }) {
  const { resolvedTheme } = useTheme();
  return (
    <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
      <Markdown
        source={source}
        style={{
          background:  "transparent",
          fontSize:    "0.875rem",
          lineHeight:  "1.625",
          color:       "var(--text)",
        }}
      />
    </div>
  );
}
