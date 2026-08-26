import { describe, expect, it } from "vitest";
import { getDriveRouteError } from "./route-errors";

describe("getDriveRouteError", () => {
  it("hides provider details from unexpected errors", () => {
    expect(getDriveRouteError(new Error("Google token payload leaked"), "Error al operar Drive")).toEqual({
      message: "Error al operar Drive",
      status: 500,
    });
  });

  it("maps missing Drive authorization to a controlled forbidden response", () => {
    expect(getDriveRouteError(new Error("Drive no conectado: conexión no encontrada"), "Error al operar Drive")).toEqual({
      message: "Drive no conectado",
      status: 403,
    });
  });
});
