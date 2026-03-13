"use client";

import dynamic from "next/dynamic";

const Markdown = dynamic(
  () => import("@uiw/react-md-editor").then((m) => m.default.Markdown),
  { ssr: false },
);

export function JobDescription({ source }: { source: string }) {
  return (
    <div data-color-mode="auto">
      <Markdown
        source={source}
        style={{ background: "transparent", fontSize: "0.875rem", lineHeight: "1.625" }}
      />
    </div>
  );
}
