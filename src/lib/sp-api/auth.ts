export const SP_API_SCOPES = [
  "sellingpartnerapi::migration",
  "sellingpartnerapi::listings",
  "sellingpartnerapi::orders",
  "sellingpartnerapi::inventory",
  "sellingpartnerapi::reports",
  "sellingpartnerapi::fees",
  "sellingpartnerapi::notifications",
];

export function getOAuthUrl(baseUrl?: string): string {
  const clientId = process.env.SP_API_CLIENT_ID || "";
  const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  const redirectUri = `${origin}/api/sp-api/auth/callback`;
  const scope = SP_API_SCOPES.join(" ");
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    application_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope,
    version: "beta",
  });

  return `https://sellercentral.amazon.com/apps/authorize/consent?${params.toString()}`;
}

export async function exchangeAuthCode(code: string, baseUrl?: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.SP_API_CLIENT_ID || "";
  const clientSecret = process.env.SP_API_CLIENT_SECRET || "";
  const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  const redirectUri = `${origin}/api/sp-api/auth/callback`;

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to exchange auth code: ${err}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.SP_API_CLIENT_ID || "";
  const clientSecret = process.env.SP_API_CLIENT_SECRET || "";

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to refresh token: ${err}`);
  }

  return res.json();
}
