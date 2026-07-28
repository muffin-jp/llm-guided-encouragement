/**
 * Basic in-memory sliding-window rate limiter, keyed by IP.
 *
 * Good enough for a public demo deployment. In production this would live in
 * Redis/Upstash (or an edge rate-limit service) so limits hold across
 * serverless instances and restarts.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  now: number = Date.now(),
  limit: number = MAX_REQUESTS_PER_WINDOW,
): boolean {
  const windowStart = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing unbounded on a long-lived process.
  if (hits.size > 10_000) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => t <= windowStart)) hits.delete(k);
    }
  }
  return false;
}

/** Best-effort client IP for the demo; fine behind Vercel/most proxies. */
export function clientIpFrom(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
