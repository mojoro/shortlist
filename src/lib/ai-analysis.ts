export interface AiAnalysisResult {
  score: number;
  status: "GO" | "NO_GO" | "EXAMINE";
  summary: string;
  matchPoints: string[];
  gapPoints: string[];
}

function isValidResult(parsed: unknown): boolean {
  if (typeof parsed !== "object" || parsed === null) return false;
  const p = parsed as Record<string, unknown>;
  return (
    typeof p.score === "number" &&
    ["GO", "NO_GO", "EXAMINE"].includes(p.status as string) &&
    typeof p.summary === "string" &&
    Array.isArray(p.matchPoints) &&
    Array.isArray(p.gapPoints)
  );
}

export function parseAiAnalysisResponse(text: string): AiAnalysisResult | null {
  try {
    const direct = JSON.parse(text.trim());
    if (isValidResult(direct)) return direct as AiAnalysisResult;
  } catch {}

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (isValidResult(parsed)) return parsed as AiAnalysisResult;
  } catch {}

  return null;
}

export function buildAnalysisSystemPrompt(profile: {
  targetRoles: string[];
  targetLocations: string[];
  remotePreference: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  excludedKeywords: string[];
  targetSalaryMin: number | null;
  targetSalaryMax: number | null;
  currency: string;
  masterResume: string | null;
}): string {
  const lines: string[] = [
    "You are a job match analyzer. Score how well the job matches this candidate.",
    "",
  ];

  if (profile.targetRoles.length > 0)
    lines.push(`Target roles: ${profile.targetRoles.join(", ")}`);
  if (profile.targetLocations.length > 0)
    lines.push(`Target locations: ${profile.targetLocations.join(", ")}`);
  if (profile.remotePreference !== "ANY")
    lines.push(`Remote preference: ${profile.remotePreference}`);
  if (profile.requiredSkills.length > 0)
    lines.push(`Required skills: ${profile.requiredSkills.join(", ")}`);
  if (profile.niceToHaveSkills.length > 0)
    lines.push(`Nice-to-have skills: ${profile.niceToHaveSkills.join(", ")}`);
  if (profile.targetSalaryMin || profile.targetSalaryMax) {
    const range = [profile.targetSalaryMin, profile.targetSalaryMax]
      .filter(Boolean)
      .join("–");
    lines.push(`Salary target: ${range} ${profile.currency}/year`);
  }
  if (profile.excludedKeywords.length > 0)
    lines.push(
      `Auto-reject if any of these keywords appear in the job: ${profile.excludedKeywords.join(", ")}`,
    );
  if (profile.masterResume) {
    lines.push("", `Candidate summary:\n${profile.masterResume.slice(0, 1500)}`);
  }

  lines.push(
    "",
    "Respond ONLY with valid JSON — no markdown fences, no explanation:",
    '{"score":0-100,"status":"GO"|"NO_GO"|"EXAMINE","summary":"1-2 sentences","matchPoints":["..."],"gapPoints":["..."]}',
  );

  return lines.join("\n");
}
