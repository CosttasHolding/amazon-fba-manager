import { afterEach, describe, expect, it } from "vitest";
import { getDriveRedirectUri } from "@/lib/drive/oauth";

describe("Drive OAuth", () => {
  const originalRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  afterEach(() => {
    if (originalRedirectUri === undefined) delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    else process.env.GOOGLE_OAUTH_REDIRECT_URI = originalRedirectUri;
  });

  it("uses the configured redirect URI when available", () => {
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
    expect(getDriveRedirectUri("http://localhost:3000")).toBe("https://app.example.com/api/drive/auth/callback");
  });

  it("falls back to the current app origin", () => {
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    expect(getDriveRedirectUri("http://localhost:3000")).toBe("http://localhost:3000/api/drive/auth/callback");
  });
});
