import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./theme-toggle";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({
    theme: "dark",
    setTheme: vi.fn(),
    themes: ["light", "dark"],
  })),
}));

describe("ThemeToggle", () => {
  it("renderiza boton con icono de luna en modo oscuro", () => {
    render(<ThemeToggle compact />);
    const btn = screen.getByRole("button", { name: /cambiar a modo/i });
    expect(btn).toBeDefined();
    expect(btn.getAttribute("aria-label")).toBe("Cambiar a modo claro");
  });

  it("renderiza boton con icono de sol en modo claro", async () => {
    const { useTheme } = await import("next-themes");
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: vi.fn(),
      themes: ["light", "dark"],
    });

    render(<ThemeToggle compact />);
    const btn = screen.getByRole("button", { name: /cambiar a modo/i });
    expect(btn.getAttribute("aria-label")).toBe("Cambiar a modo oscuro");
  });

  it("llama a setTheme al hacer click", async () => {
    const { useTheme } = await import("next-themes");
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme,
      themes: ["light", "dark"],
    });

    render(<ThemeToggle compact />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /cambiar a modo/i }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
