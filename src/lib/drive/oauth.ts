export const DRIVE_OAUTH_STATE_COOKIE = "drive_oauth_state";

export function getDriveRedirectUri(origin: string): string {
  void origin;

  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (!redirectUri) throw new Error("Google Drive OAuth redirect URI no configurado");

  if (process.env.NODE_ENV === "production") {
    try {
      if (new URL(redirectUri).protocol !== "https:") {
        throw new Error("Google Drive OAuth redirect URI inválido");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Google Drive OAuth redirect URI inválido") {
        throw error;
      }
      throw new Error("Google Drive OAuth redirect URI inválido");
    }
  }

  return redirectUri;
}
