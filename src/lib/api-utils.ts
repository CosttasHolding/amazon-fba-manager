import { NextResponse } from "next/server";

export function apiErrorResponse(err: unknown, status = 500, logPrefix = "") {
  const message = err instanceof Error ? err.message : "Error desconocido";
  if (logPrefix) console.error(`[${logPrefix}]`, message);
  return NextResponse.json({ error: "Error interno del servidor" }, { status });
}
