export const DRIVE_OAUTH_STATE_COOKIE = "drive_oauth_state";

export function getDriveRedirectUri(origin: string): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${origin}/api/drive/auth/callback`;
}
