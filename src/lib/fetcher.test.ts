import { describe, it, expect } from "vitest";
import { fetcher } from "@/lib/fetcher";

describe("fetcher", () => {
  it("devuelve json.data cuando existe", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 1 }] }),
    } as Response);

    const result = await fetcher("/api/test");
    expect(result).toEqual([{ id: 1 }]);
  });

  it("devuelve json completo cuando no hay .data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 2 }]),
    } as Response);

    const result = await fetcher("/api/test");
    expect(result).toEqual([{ id: 2 }]);
  });

  it("lanza error cuando response no es ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetcher("/api/test")).rejects.toThrow("Error al obtener datos");
  });

  it("llama a fetch con la URL correcta", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);
    global.fetch = mockFetch;

    await fetcher("/api/products");
    expect(mockFetch).toHaveBeenCalledWith("/api/products");
  });
});
