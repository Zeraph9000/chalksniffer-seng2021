type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limiter. Good enough for the sprint — in production
 * this would be Redis-backed or platform-level (e.g. Cloudflare).
 *
 * Note: state is per-Node-process. On Vercel serverless, each instance has its
 * own Map — not a shared/global counter. Fine for a demo; replace with a shared
 * store for real rate-limiting under multi-instance deployments.
 */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}
