import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./error-boundary";

const ProblemChild = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) throw new Error("Test error");
  return <div>Funciona</div>;
};

describe("ErrorBoundary", () => {
  it("renderiza hijos sin errores", () => {
    render(
      <ErrorBoundary>
        <div>Contenido normal</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Contenido normal")).toBeDefined();
  });

  it("muestra fallback al capturar error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Algo salió mal")).toBeDefined();
    expect(screen.getByText("Reintentar")).toBeDefined();
    expect(screen.getByText("Ir al Dashboard")).toBeDefined();
  });

  it("usar fallback personalizado si se provee", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom fallback")).toBeDefined();
  });

  it("renderiza con fallback personalizado", () => {
    render(
      <ErrorBoundary fallback={<div>Fallback custom</div>}>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Fallback custom")).toBeDefined();
  });
});
