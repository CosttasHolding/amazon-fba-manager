import { describe, it, expect } from "vitest";
import { SpApiClient, SpApiError, SpApiAuthError } from "./client";

describe("SpApiClient", () => {
  const validOptions = {
    accessToken: "test-token",
    refreshToken: "test-refresh",
    marketplace: "US",
    sellerId: "test-seller",
  };

  it("crea instancia con opciones validas", () => {
    const client = new SpApiClient(validOptions);
    expect(client).toBeInstanceOf(SpApiClient);
  });

  it("usa endpoint NA para marketplace US", () => {
    const client = new SpApiClient(validOptions);
    expect(client["endpoint"]).toBe("https://sellingpartnerapi-na.amazon.com");
  });

  it("usa endpoint EU para marketplace ES", () => {
    const client = new SpApiClient({
      ...validOptions,
      marketplace: "ES",
    });
    expect(client["endpoint"]).toBe("https://sellingpartnerapi-eu.amazon.com");
  });

  it("SpApiError tiene status correcto", () => {
    const err = new SpApiError("test error", 429);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(429);
    expect(err.message).toBe("test error");
  });

  it("SpApiAuthError no expone refreshToken por seguridad", () => {
    const err = new SpApiAuthError("auth error");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SpApiAuthError");
    expect(err.message).toBe("auth error");
    expect((err as Record<string, unknown>).refreshToken).toBeUndefined();
  });

  it("accepta opciones minimales (sin refreshToken ni sellerId)", () => {
    const client = new SpApiClient({ accessToken: "tok" });
    expect(client).toBeInstanceOf(SpApiClient);
    expect(client["refreshToken"]).toBe("");
    expect(client["sellerId"]).toBe("");
  });

  it("acepta endpoint personalizado", () => {
    const client = new SpApiClient({
      accessToken: "tok",
      endpoint: "https://custom.example.com",
    });
    expect(client["endpoint"]).toBe("https://custom.example.com");
  });
});
