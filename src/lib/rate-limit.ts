import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

export async function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!upstashRatelimit) {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  const result = await upstashRatelimit.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: now + windowMs,
  };
}

export function buildRateLimitKey(ip: string, route: string): string {
  return `${ip}:${route}`;
}
