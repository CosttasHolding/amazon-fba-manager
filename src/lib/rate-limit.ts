import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let upstashRatelimit: Ratelimit | null = null;

if (hasUpstash) {
  const redis = Redis.fromEnv();
  upstashRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: true,
    prefix: "fba-manager",
  });
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_MEMORY_BUCKETS = 10000;

function memoryRateLimit(identifier: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  while (memoryBuckets.size >= MAX_MEMORY_BUCKETS) {
    const oldest = memoryBuckets.keys().next().value;
    if (oldest === undefined) break;
    memoryBuckets.delete(oldest);
  }

  let bucket = memoryBuckets.get(identifier);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(identifier, bucket);
  }
  bucket.count += 1;

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export async function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  if (!upstashRatelimit) {
    return memoryRateLimit(identifier, limit, windowMs);
  }

  try {
    const result = await upstashRatelimit.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: Date.now() + windowMs,
    };
  } catch (err) {
    console.error("[rate-limit] Upstash no disponible, usando límite en memoria:", err);
    return memoryRateLimit(identifier, limit, windowMs);
  }
}

export function buildRateLimitKey(ip: string, route: string): string {
  return `${ip}:${route}`;
}
