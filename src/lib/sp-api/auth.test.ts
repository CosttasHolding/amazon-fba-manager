import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOAuthUrl, SP_API_SCOPES } from "./auth";

describe("SP-API Auth", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("SP_API_CLIENT_ID", "");
  });

  it("genera OAuth URL con los parametros correctos", () => {
    const url = getOAuthUrl();
    expect(url).toContain("sellercentral.amazon.com/apps/authorize/consent");
    expect(url).toContain(encodeURIComponent("http://localhost:3000/api/sp-api/auth/callback"));
    SP_API_SCOPES.forEach((scope) => {
      expect(url).toContain(encodeURIComponent(scope));
    });
  });

  it("incluye application_id en la URL", () => {
    vi.stubEnv("SP_API_CLIENT_ID", "test-client-id");
    const url = getOAuthUrl();
    expect(url).toContain("application_id=test-client-id");
  });

  it("genera URL con state", () => {
    const url = getOAuthUrl();
    expect(url).toContain("state=");
    expect(url).toContain("version=beta");
  });
});
