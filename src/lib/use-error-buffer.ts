"use client";
// Module-level error buffer (shared across all components in the bundle)
const errorBuffer: string[] = [];
const MAX_ERRORS = 5;
const MAX_LENGTH = 500;

let installed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args.map(String).join(" ").slice(0, MAX_LENGTH);
    errorBuffer.push(msg);
    if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
    origConsoleError.apply(console, args);
  };

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e.reason).slice(0, MAX_LENGTH);
    errorBuffer.push(msg);
    if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
  });
}

export function useErrorBuffer() {
  install(); // Idempotent — only patches once
  return { getRecentErrors: () => [...errorBuffer] };
}
