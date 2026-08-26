export function getDriveRouteError(
  error: unknown,
  fallbackMessage: string,
): { message: string; status: 403 | 500 } {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Drive no conectado:")) {
    return { message: "Drive no conectado", status: 403 };
  }

  return { message: fallbackMessage, status: 500 };
}
