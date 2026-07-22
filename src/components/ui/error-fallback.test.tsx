import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorFallback } from "./error-fallback";

describe("ErrorFallback", () => {
  const mockError = new Error("Test error message");
  const mockReset = vi.fn();

  it("renderiza el titulo y mensaje por defecto", () => {
    render(<ErrorFallback error={mockError} reset={mockReset} />);
    expect(screen.getByText("Algo salió mal")).toBeDefined();
    expect(screen.getByText("Reintentar")).toBeDefined();
    expect(screen.getByText("Ir al inicio")).toBeDefined();
  });

  it("muestra el mensaje de error", () => {
    render(<ErrorFallback error={mockError} reset={mockReset} />);
    expect(screen.getByText("Test error message")).toBeDefined();
  });

  it("permite titulo y mensaje personalizado", () => {
    render(
      <ErrorFallback
        error={mockError}
        reset={mockReset}
        title="Error personalizado"
        message="Mensaje personalizado"
      />
    );
    expect(screen.getByText("Error personalizado")).toBeDefined();
    expect(screen.getByText("Mensaje personalizado")).toBeDefined();
  });
});
