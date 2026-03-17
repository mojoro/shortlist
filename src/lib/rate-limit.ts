/**
 * In-memory sliding window rate limiter keyed by userId.
 * Best-effort on Vercel serverless (resets per cold start).
 * The Usage table's monthly limit is the hard backstop.
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

const windows = new Map<string, WindowEntry>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStale(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of windows) {
    if (now - entry.windowStart > windowMs * 2) {
      windows.delete(key);
    }
  }
}

export function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number = 60_000,
): { allowed: boolean; retryAfterMs: number } {
  cleanupStale(windowMs);

  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    windows.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, retryAfterMs };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}
