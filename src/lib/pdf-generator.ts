import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================
// CosttasHolding Manager - PDF Report Generator
// ============================================================

interface PDFOptions {
  title: string;
  subtitle?: string;
  filename: string;
}

interface ProductRow {
  name: string;
  category: string;
  price: number;
  cost: number;
  profit: number;
  margin: number;
  status: string;
}

interface InventoryRow {
  product_name: string;
  quantity: number;
  min_stock: number;
  status: string;
  valuation: number;
}

interface SaleRow {
  date: string;
  product_name: string;
  quantity: number;
  revenue: number;
  profit: number;
  channel: string;
}

interface KPISummary {
  totalProducts: number;
  totalRevenue: number;
  totalProfit: number;
  totalUnits: number;
  avgMargin: number;
  lowStockCount: number;
}

// -- Helpers --------------------------------------------------

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addHeader(doc: jsPDF, options: PDFOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Brand bar
  doc.setFillColor(0, 172, 210); // primary cyan
  doc.rect(0, 0, pageWidth, 32, "F");

  // Brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CosttasHolding Manager", 14, 20);

  // Report title
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, 14, 46);

  // Subtitle / date
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dateStr = `Generado: ${formatDate()}`;
  doc.text(dateStr, 14, 54);

  if (options.subtitle) {
    doc.text(options.subtitle, 14, 60);
    return 68;
  }

  return 62;
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 16, pageWidth, 16, "F");

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("CosttasHolding Manager", 14, pageHeight - 6);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 6,
      { align: "right" }
    );
  }
}

// -- Report Generators ----------------------------------------

export function generateProductsPDF(products: ProductRow[]): void {
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    title: "Reporte de Productos",
    subtitle: `Total: ${products.length} productos`,
    filename: "productos",
  });

  autoTable(doc, {
    startY,
    head: [
      ["Producto", "Categoría", "Precio", "Costo", "Profit", "Margen", "Estado"],
    ],
    body: products.map((p) => [
      p.name,
      p.category,
      formatCurrency(p.price),
      formatCurrency(p.cost),
      formatCurrency(p.profit),
      `${p.margin.toFixed(1)}%`,
      p.status,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [0, 172, 210],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 45 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  addFooter(doc);
  doc.save("costtasholding-productos.pdf");
}

export function generateInventoryPDF(items: InventoryRow[]): void {
  const doc = new jsPDF();

  const totalValuation = items.reduce((sum, i) => sum + i.valuation, 0);
  const lowStock = items.filter((i) => i.status === "Stock Bajo").length;

  const startY = addHeader(doc, {
    title: "Reporte de Inventario",
    subtitle: `${items.length} items | Valoración: ${formatCurrency(totalValuation)} | Stock bajo: ${lowStock}`,
    filename: "inventario",
  });

  autoTable(doc, {
    startY,
    head: [
      ["Producto", "Cantidad", "Mín. Stock", "Estado", "ValoraciónUATION"],
    ],
    body: items.map((i) => [
      i.product_name,
      i.quantity.toString(),
      i.min_stock.toString(),
      i.status,
      formatCurrency(i.valuation),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [0, 172, 210],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      4: { halign: "right" },
    },
    didParseCell: (data: { section: string; column: { index: number }; cell: { text: string[]; styles: { textColor: number[] } } }) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = data.cell.text[0];
        if (val === "Stock Bajo" || val === "Sin Stock") {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (val === "Sobrestock") {
          data.cell.styles.textColor = [59, 130, 246];
        } else {
          data.cell.styles.textColor = [22, 163, 74];
        }
      }
    },
  });

  addFooter(doc);
  doc.save("costtasholding-inventario.pdf");
}

export function generateSalesPDF(sales: SaleRow[]): void {
  const doc = new jsPDF();

  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);

  const startY = addHeader(doc, {
    title: "Reporte de Ventas",
    subtitle: `${sales.length} ventas | Revenue: ${formatCurrency(totalRevenue)} | Profit: ${formatCurrency(totalProfit)} | Unidades: ${totalUnits}`,
    filename: "ventas",
  });

  autoTable(doc, {
    startY,
    head: [["Fecha", "Producto", "Cantidad", "Revenue", "Profit", "Canal"]],
    body: sales.map((s) => [
      s.date,
      s.product_name,
      s.quantity.toString(),
      formatCurrency(s.revenue),
      formatCurrency(s.profit),
      s.channel,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [0, 172, 210],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 45 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    didParseCell: (data: { section: string; column: { index: number }; cell: { text: string[]; styles: { textColor: number[] } } }) => {
      if (data.section === "body" && data.column.index === 4) {
        const val = parseFloat(data.cell.text[0].replace("$", ""));
        if (val < 0) {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [22, 163, 74];
        }
      }
    },
  });

  addFooter(doc);
  doc.save("costtasholding-ventas.pdf");
}

export function generateDashboardPDF(kpis: KPISummary): void {
  const doc = new jsPDF();

  const startY = addHeader(doc, {
    title: "Resumen Ejecutivo",
    subtitle: "Dashboard - KPIs principales",
    filename: "dashboard",
  });

  const kpiData = [
    ["Total Productos", kpis.totalProducts.toString()],
    ["Revenue Total", formatCurrency(kpis.totalRevenue)],
    ["Profit Total", formatCurrency(kpis.totalProfit)],
    ["Unidades Vendidas", kpis.totalUnits.toString()],
    ["Margen Promedio", `${kpis.avgMargin.toFixed(1)}%`],
    ["Alertas Stock Bajo", kpis.lowStockCount.toString()],
  ];

  autoTable(doc, {
    startY,
    head: [["Métrica", "Valor"]],
    body: kpiData,
    styles: {
      fontSize: 11,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [0, 172, 210],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { halign: "right", cellWidth: 60 },
    },
    tableWidth: 140,
    margin: { left: 14 },
  });

  addFooter(doc);
  doc.save("costtasholding-resumen.pdf");
}