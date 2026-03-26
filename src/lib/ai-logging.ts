import { appendFileSync } from "fs";

/**
 * Log AI prompt context to a local file during development.
 * Only writes when running on localhost:3000 or 127.0.0.1:3000.
 */
export function logAiContext(
  host: string,
  label: string,
  jobTitle: string,
  systemPrompt: string,
  userMsg: string,
) {
  if (host !== "localhost:3000" && host !== "127.0.0.1:3000") return;
  const sep = "=".repeat(80);
  appendFileSync(
    "ai-context.log",
    `\n${sep}\n[${new Date().toISOString()}] ${label} — ${jobTitle}\n\n## SYSTEM\n${systemPrompt}\n\n## USER\n${userMsg}\n`,
  );
}
