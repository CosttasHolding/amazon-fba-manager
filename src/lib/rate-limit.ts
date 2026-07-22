const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Cleanup expired entries to prevent memory leaks in long-lived processes
  if (store.size > 1000) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }

  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function buildRateLimitKey(ip: string, route: string): string {
  return `${ip}:${route}`;
}
