import { NextResponse } from "next/server";

export function apiErrorResponse(err: unknown, status = 500, logPrefix = "") {
  const message = err instanceof Error ? err.message : "Error desconocido";
  if (logPrefix) console.error(`[${logPrefix}]`, message);
  return NextResponse.json({ error: "Error interno del servidor" }, { status });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
