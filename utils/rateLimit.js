import "server-only";

// Small in-process limiter. It is per server instance rather than global, which
// is enough to stop one browser tab from hammering the paid AI endpoints; a
// multi-region deployment would want Redis here instead.
const buckets = globalThis.__careerpilotRateBuckets ?? new Map();
globalThis.__careerpilotRateBuckets = buckets;

export function checkRateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });

    // Opportunistic cleanup so the map cannot grow without bound.
    if (buckets.size > 5000) {
      for (const [existingKey, value] of buckets) {
        if (now > value.resetAt) buckets.delete(existingKey);
      }
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function enforceRateLimit(key, options) {
  const { allowed, retryAfterSeconds } = checkRateLimit(key, options);

  if (!allowed) {
    throw new Error(
      `You're going a bit fast. Please wait ${retryAfterSeconds}s and try again.`
    );
  }
}
