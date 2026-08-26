import { afterEach, describe, expect, it } from "vitest";
import { getDriveRedirectUri } from "@/lib/drive/oauth";

describe("Drive OAuth", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    if (originalRedirectUri === undefined) delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    else process.env.GOOGLE_OAUTH_REDIRECT_URI = originalRedirectUri;
    if (originalNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalNodeEnv;
  });

  it("uses the configured redirect URI when available", () => {
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
    expect(getDriveRedirectUri("http://localhost:3000")).toBe("https://app.example.com/api/drive/auth/callback");
  });

  it("rejects a missing explicit redirect URI", () => {
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    expect(() => getDriveRedirectUri("http://localhost:3000")).toThrow(
      "Google Drive OAuth redirect URI no configurado",
    );
  });

  it("rejects a non-HTTPS redirect URI in production", () => {
    env.NODE_ENV = "production";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://app.example.com/api/drive/auth/callback";

    expect(() => getDriveRedirectUri("http://localhost:3000")).toThrow(
      "Google Drive OAuth redirect URI inválido",
    );
  });
});
