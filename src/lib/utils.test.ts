import { describe, it, expect } from "vitest";
import { cn, fmt, fmtPct, roiColor, profitColor, stockColor } from "@/lib/utils";

describe("cn()", () => {
  it("mergea clases simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("elimina duplicados de Tailwind", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("maneja condicionales", () => {
    expect(cn("base", true && "active", false && "hidden")).toBe("base active");
  });

  it("ignora valores falsy", () => {
    expect(cn("base", null, undefined, false, "")).toBe("base");
  });
});

describe("fmt()", () => {
  it("formatea numeros positivos", () => {
    expect(fmt(100)).toBe("$100.00");
    expect(fmt(99.99)).toBe("$99.99");
  });

  it("formatea numeros negativos", () => {
    expect(fmt(-50)).toBe("$-50.00");
  });

  it("formatea cero", () => {
    expect(fmt(0)).toBe("$0.00");
  });

  it("maneja null y undefined", () => {
    expect(fmt(null)).toBe("$0.00");
    expect(fmt(undefined)).toBe("$0.00");
  });

  it("respeta decimales personalizados", () => {
    expect(fmt(10.5, 0)).toBe("$11");
    expect(fmt(10.555, 3)).toBe("$10.555");
  });

  it("formatea numeros grandes", () => {
    expect(fmt(1000000)).toBe("$1000000.00");
  });
});

describe("fmtPct()", () => {
  it("formatea porcentajes positivos", () => {
    expect(fmtPct(45)).toBe("45.0%");
    expect(fmtPct(12.34)).toBe("12.3%");
  });

  it("formatea porcentajes negativos", () => {
    expect(fmtPct(-15)).toBe("-15.0%");
  });

  it("formatea cero", () => {
    expect(fmtPct(0)).toBe("0.0%");
  });

  it("maneja null y undefined", () => {
    expect(fmtPct(null)).toBe("0%");
    expect(fmtPct(undefined)).toBe("0%");
  });

  it("respeta decimales personalizados", () => {
    expect(fmtPct(33.333, 2)).toBe("33.33%");
  });
});

describe("roiColor()", () => {
  it("retorna verde para ROI >= 30", () => {
    expect(roiColor(30)).toBe("text-green-500");
    expect(roiColor(50)).toBe("text-green-500");
  });

  it("retorna amber para ROI 15-29", () => {
    expect(roiColor(15)).toBe("text-amber-500");
    expect(roiColor(20)).toBe("text-amber-500");
    expect(roiColor(29)).toBe("text-amber-500");
  });

  it("retorna rojo para ROI < 15", () => {
    expect(roiColor(14)).toBe("text-red-500");
    expect(roiColor(0)).toBe("text-red-500");
    expect(roiColor(-10)).toBe("text-red-500");
  });

  it("maneja null y undefined", () => {
    expect(roiColor(null)).toBe("text-muted-foreground");
    expect(roiColor(undefined)).toBe("text-muted-foreground");
  });
});

describe("profitColor()", () => {
  it("retorna verde para profit > 0", () => {
    expect(profitColor(0.01)).toBe("text-green-500");
    expect(profitColor(100)).toBe("text-green-500");
  });

  it("retorna amber para profit === 0", () => {
    expect(profitColor(0)).toBe("text-amber-500");
  });

  it("retorna rojo para profit < 0", () => {
    expect(profitColor(-0.01)).toBe("text-red-500");
    expect(profitColor(-100)).toBe("text-red-500");
  });

  it("maneja null y undefined", () => {
    expect(profitColor(null)).toBe("text-muted-foreground");
    expect(profitColor(undefined)).toBe("text-muted-foreground");
  });
});

describe("stockColor()", () => {
  it("retorna colores por estado", () => {
    expect(stockColor("normal")).toBe("text-green-500");
    expect(stockColor("low_stock")).toBe("text-amber-500");
    expect(stockColor("out_of_stock")).toBe("text-red-500");
    expect(stockColor("overstock")).toBe("text-blue-500");
  });

  it("retorna muted para estado desconocido", () => {
    expect(stockColor("unknown")).toBe("text-muted-foreground");
    expect(stockColor(null)).toBe("text-muted-foreground");
    expect(stockColor(undefined)).toBe("text-muted-foreground");
  });
});
