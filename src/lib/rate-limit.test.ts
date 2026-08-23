import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("rateLimit fallback en memoria (H2)", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta el límite y bloquea el excedente por clave", async () => {
    const { rateLimit } = await import("./rate-limit");

    for (let i = 0; i < 5; i++) {
      expect((await rateLimit("clave-a", 5, 60000)).allowed).toBe(true);
    }
    const blocked = await rateLimit("clave-a", 5, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    const otraClave = await rateLimit("clave-b", 5, 60000);
    expect(otraClave.allowed).toBe(true);
  });

  it("reinicia la ventana al expirar windowMs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const { rateLimit } = await import("./rate-limit");
    const start = Date.now();

    for (let i = 0; i < 3; i++) {
      await rateLimit("ventana", 3, 1000);
    }
    expect((await rateLimit("ventana", 3, 1000)).allowed).toBe(false);

    vi.setSystemTime(start + 1500);
    expect((await rateLimit("ventana", 3, 1000)).allowed).toBe(true);
  });
});
