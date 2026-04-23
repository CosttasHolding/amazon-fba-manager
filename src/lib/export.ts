import * as XLSX from "xlsx";

interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  format?: "currency" | "date" | "number" | "text";
}

interface ExcelRow {
  [key: string]: unknown;
}

const DEFAULT_COLUMNS: ExcelColumn[] = [
  { key: "name", header: "Nombre", width: 30 },
  { key: "sku", header: "SKU", width: 15 },
  { key: "category", header: "Categoría", width: 15 },
  { key: "status", header: "Estado", width: 12 },
  { key: "stock_available", header: "Stock", width: 10, format: "number" },
  { key: "current_stock", header: "Stock Actual", width: 12, format: "number" },
  { key: "stock_status", header: "Estado Stock", width: 15 },
  { key: "sale_price", header: "Precio", width: 12, format: "currency" },
  { key: "buy_cost", header: "Costo", width: 12, format: "currency" },
  { key: "net_profit", header: "Ganancia", width: 12, format: "currency" },
  { key: "roi", header: "ROI", width: 10, format: "number" },
  { key: "margin", header: "Margen", width: 10, format: "number" },
  { key: "created_at", header: "Fecha Creación", width: 14, format: "date" },
  { key: "updated_at", header: "Última Actualización", width: 18, format: "date" },
];

const COLORS = {
  headerBg: "00ACD2",
  headerFont: "FFFFFF",
  rowEven: "F8F9FA",
  rowOdd: "FFFFFF",
  border: "E9ECEF",
};

function formatCellValue(value: unknown, format?: string): string {
  if (value === null || value === undefined) return "";

  switch (format) {
    case "currency": {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      return typeof num === "number" ? "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "";
    }
    case "date": {
      if (value instanceof Date) {
        return value.toLocaleDateString("es-ES");
      }
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("es-ES");
    }
    case "number":
      return typeof value === "number" ? value.toLocaleString("es-ES") : String(value);
    default:
      return String(value);
  }
}

function applyStyles(ws: XLSX.WorkSheet, rowCount: number, colCount: number): void {
  const range = XLSX.utils.decode_range(`A1:${String.fromCharCode(64 + colCount)}${rowCount}`);

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;

      const isHeader = R === 0;
      const isEvenRow = R % 2 === 0;

      cell.s = {
        border: {
          top: { style: "thin", color: { rgb: COLORS.border } },
          bottom: { style: "thin", color: { rgb: COLORS.border } },
          left: { style: "thin", color: { rgb: COLORS.border } },
          right: { style: "thin", color: { rgb: COLORS.border } },
        },
        fill: isHeader
          ? { fgColor: { rgb: COLORS.headerBg }, bgColor: { rgb: COLORS.headerBg } }
          : isEvenRow
            ? { fgColor: { rgb: COLORS.rowEven }, bgColor: { rgb: COLORS.rowEven } }
            : { fgColor: { rgb: COLORS.rowOdd }, bgColor: { rgb: COLORS.rowOdd } },
        font: isHeader
          ? { bold: true, color: { rgb: COLORS.headerFont } }
          : { color: { rgb: "212529" } },
        alignment: { horizontal: "left", vertical: "center" },
      };

      if (!isHeader && C > 0) {
        cell.s.alignment = { horizontal: "right", vertical: "center" };
      }
    }
  }
}

export function exportToExcelPro(
  data: ExcelRow[],
  filename: string,
  columns: ExcelColumn[] = DEFAULT_COLUMNS
): void {
  if (!data || data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);

  const filteredColumns = columns.filter((col) =>
    data.some((row) => row[col.key] !== undefined && row[col.key] !== null)
  );

  const headers = filteredColumns.map((col) => col.header);
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

  const rows = data.map((row) =>
    filteredColumns.map((col) => formatCellValue(row[col.key], col.format))
  );
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: "A2" });

  filteredColumns.forEach((col, idx) => {
    const width = col.width || 15;
    ws["!cols"] = ws["!cols"] || [];
    ws["!cols"][idx] = { wch: width };
  });

  applyStyles(ws, data.length + 1, filteredColumns.length);

  XLSX.utils.book_append_sheet(wb, ws, "Datos");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportInventoryExcel(data: unknown[]): void {
  exportToExcelPro(data as ExcelRow[], "inventario");
}

export function exportProductsExcel(data: unknown[]): void {
  exportToExcelPro(data as ExcelRow[], "productos");
}

export function exportSalesExcel(data: unknown[]): void {
  exportToExcelPro(data as ExcelRow[], "ventas");
}