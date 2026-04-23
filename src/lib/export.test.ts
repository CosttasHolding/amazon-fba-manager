import { describe, it, expect, vi } from "vitest";
import * as XLSX from "xlsx";
import { exportToExcelPro, exportInventoryExcel, exportProductsExcel, exportSalesExcel } from "@/lib/export";

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    aoa_to_sheet: vi.fn(() => ({})),
    sheet_add_aoa: vi.fn(),
    book_append_sheet: vi.fn(),
    decode_range: vi.fn(() => ({ s: { r: 0, c: 0 }, e: { r: 1, c: 1 } })),
    encode_cell: vi.fn(({ r, c }) => `${String.fromCharCode(65 + c)}${r + 1}`),
  },
  write: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

describe("exportToExcelPro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock DOM APIs
    global.URL.createObjectURL = vi.fn(() => "blob:url");
    global.URL.revokeObjectURL = vi.fn();
    const mockAnchor = { click: vi.fn(), href: "", download: "" };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    global.alert = vi.fn();
  });

  it("muestra alerta cuando no hay datos", () => {
    exportToExcelPro([], "test");
    expect(global.alert).toHaveBeenCalledWith("No hay datos para exportar");
  });

  it("exporta datos correctamente", () => {
    const data = [{ name: "Product A", sku: "SKU-001", sale_price: 100 }];
    exportToExcelPro(data, "productos");

    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.sheet_add_aoa).toHaveBeenCalledTimes(2);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it("filtra columnas vacias", () => {
    const data = [{ name: "Product A" }];
    exportToExcelPro(data, "test");
    expect(XLSX.utils.sheet_add_aoa).toHaveBeenCalled();
  });
});

describe("export helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:url");
    global.URL.revokeObjectURL = vi.fn();
    const mockAnchor = { click: vi.fn(), href: "", download: "" };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    global.alert = vi.fn();
  });

  it("exportInventoryExcel llama a exportToExcelPro", () => {
    exportInventoryExcel([{ name: "Test" }]);
    expect(XLSX.utils.book_new).toHaveBeenCalled();
  });

  it("exportProductsExcel llama a exportToExcelPro", () => {
    exportProductsExcel([{ name: "Test" }]);
    expect(XLSX.utils.book_new).toHaveBeenCalled();
  });

  it("exportSalesExcel llama a exportToExcelPro", () => {
    exportSalesExcel([{ name: "Test" }]);
    expect(XLSX.utils.book_new).toHaveBeenCalled();
  });
});
