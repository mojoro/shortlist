/**
 * Shared score threshold logic for match labels and colors.
 * Used by ScoreBadge, ScorePill, JobDetailClient, JobDescriptionPane,
 * and ApplicationDrawer.
 */

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Strong match";
  if (score >= 75) return "Good match";
  return "Weak match";
}

export function getScoreShortLabel(score: number): string {
  if (score >= 90) return "Strong";
  if (score >= 75) return "Good";
  return "Weak";
}
