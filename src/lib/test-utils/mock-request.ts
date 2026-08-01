import { URL } from "url";
import type { NextRequest } from "next/server";

export function createMockRequest(
  urlString: string,
  options?: { method?: string; body?: string | null; headers?: Record<string, string> }
): NextRequest {
  const method = options?.method || "GET";
  const body = options?.body || null;
  const urlObj = new URL(urlString);
  const headersMap = new Map(Object.entries(options?.headers || {}));

  return {
    url: urlString,
    method,
    nextUrl: {
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
      search: urlObj.search,
      toString: () => urlObj.toString(),
    },
    headers: headersMap as unknown as Headers,
    json: () => (body ? Promise.resolve(JSON.parse(body)) : Promise.resolve({})),
    text: () => Promise.resolve(body || ""),
  } as unknown as NextRequest;
}
