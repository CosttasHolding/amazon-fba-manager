"use client";

import { useState, useMemo } from "react";
import { FileText, Download, FileSpreadsheet, Calendar, Filter, Loader2, Truck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToExcelPro } from "@/lib/export";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  status: string;
  sale_price: number | null;
  buy_cost: number | null;
  net_profit: number | null;
  roi: number | null;
  stock_available: number | null;
  sales_velocity_30d: number | null;
}

interface Sale {
  id: string;
  sale_date: string;
  revenue: number | null;
  units_sold: number | null;
  product_id?: string;
}

interface ReportGeneratorProps {
  products: Product[];
  sales: Sale[];
}

type ReportTemplate = "profitability" | "inventory" | "sales-summary" | "roi-ranking" | "supplier-performance" | "ppc-summary";

interface Template {
  id: ReportTemplate;
  labelKey: string;
  descriptionKey: string;
  icon: typeof FileText;
}

const TEMPLATES: Template[] = [
  { id: "profitability", labelKey: "analytics.template_profitability", descriptionKey: "analytics.template_profitability_desc", icon: FileText },
  { id: "inventory", labelKey: "analytics.template_inventory", descriptionKey: "analytics.template_inventory_desc", icon: FileText },
  { id: "sales-summary", labelKey: "analytics.template_sales_summary", descriptionKey: "analytics.template_sales_summary_desc", icon: TrendingUp },
  { id: "roi-ranking", labelKey: "analytics.template_roi_ranking", descriptionKey: "analytics.template_roi_ranking_desc", icon: FileText },
  { id: "supplier-performance", labelKey: "analytics.template_supplier_performance", descriptionKey: "analytics.template_supplier_performance_desc", icon: Truck },
  { id: "ppc-summary", labelKey: "analytics.template_ppc_summary", descriptionKey: "analytics.template_ppc_summary_desc", icon: TrendingUp },
];

export function ReportGenerator({ products, sales }: ReportGeneratorProps) {
  const { locale } = useLocale();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>("profitability");
  const [dateRange, setDateRange] = useState<"30d" | "90d" | "all">("30d");
  const [exporting, setExporting] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.status === "active");
  }, [products]);

  const filteredSales = useMemo(() => {
    if (dateRange === "all") return sales;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (dateRange === "90d" ? 90 : 30));
    return sales.filter((s) => new Date(s.sale_date) >= cutoff);
  }, [sales, dateRange]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      let data: Record<string, unknown>[] = [];
      let filename = "reporte";

      switch (selectedTemplate) {
        case "profitability":
          data = filteredProducts.map((p) => ({
            name: p.name,
            sku: p.sku,
            category: p.category || t("analytics.no_category", locale),
            sale_price: p.sale_price,
            buy_cost: p.buy_cost,
            net_profit: p.net_profit,
            roi: p.roi,
            sales_velocity_30d: p.sales_velocity_30d,
            stock_available: p.stock_available,
          }));
          filename = `rentabilidad-sku-${new Date().toISOString().split("T")[0]}`;
          break;
        case "inventory":
          data = filteredProducts.map((p) => ({
            name: p.name,
            sku: p.sku,
            stock_available: p.stock_available,
            status: p.status,
            sales_velocity_30d: p.sales_velocity_30d,
            reorder_point: null,
          }));
          filename = `inventario-${new Date().toISOString().split("T")[0]}`;
          break;
        case "sales-summary": {
          const salesByDate: Record<string, { revenue: number; units: number }> = {};
          for (const s of filteredSales) {
            const key = s.sale_date;
            if (!salesByDate[key]) salesByDate[key] = { revenue: 0, units: 0 };
            salesByDate[key].revenue += s.revenue || 0;
            salesByDate[key].units += s.units_sold || 0;
          }
          data = Object.entries(salesByDate).map(([date, vals]) => ({
            date,
            revenue: vals.revenue,
            units: vals.units,
          }));
          filename = `ventas-${new Date().toISOString().split("T")[0]}`;
          break;
        }
        case "roi-ranking":
          data = filteredProducts
            .sort((a, b) => (b.roi || 0) - (a.roi || 0))
            .map((p, i) => ({
              rank: i + 1,
              name: p.name,
              sku: p.sku,
              roi: p.roi,
              net_profit: p.net_profit,
              sale_price: p.sale_price,
              sales_velocity_30d: p.sales_velocity_30d,
            }));
          filename = `ranking-roi-${new Date().toISOString().split("T")[0]}`;
          break;
        case "supplier-performance": {
          const supplierData = filteredProducts
            .filter((p) => p.buy_cost)
            .map((p) => ({
              name: p.name,
              sku: p.sku,
              category: p.category || t("analytics.no_category", locale),
              unit_cost: p.buy_cost,
              sale_price: p.sale_price,
              margin: p.sale_price && p.buy_cost ? ((p.sale_price - p.buy_cost) / p.sale_price * 100).toFixed(1) + "%" : "—",
              roi: p.roi,
              sales_velocity_30d: p.sales_velocity_30d,
            }));
          data = supplierData;
          filename = `proveedores-${new Date().toISOString().split("T")[0]}`;
          break;
        }
        case "ppc-summary": {
          const totalRevenue = filteredSales.reduce((s, x) => s + (x.revenue || 0), 0);
          data = [{
            periodo: dateRange,
            total_ventas: totalRevenue,
            total_productos_activos: filteredProducts.length,
            productos_con_ventas: filteredSales.length > 0 ? new Set(filteredSales.map((s) => s.product_id)).size : 0,
            fecha_generacion: new Date().toISOString(),
          }];
          filename = `ppc-resumen-${new Date().toISOString().split("T")[0]}`;
          break;
        }
      }

      exportToExcelPro(data, filename, undefined, undefined, locale);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Amazon FBA Manager", pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const tmplLabel = TEMPLATES.find((tmpl) => tmpl.id === selectedTemplate)?.labelKey || "";
      doc.text(`${t("analytics.pdf_report_label", locale)} ${t(tmplLabel, locale)}`, pageWidth / 2, y, { align: "center" });
      y += 6;
      doc.setFontSize(9);
      doc.text(`${t("analytics.pdf_generated_label", locale)} ${new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { year: "numeric", month: "long", day: "numeric" })}`, pageWidth / 2, y, { align: "center" });
      y += 12;

      const hdrProduct = t("analytics.pdf_header_product", locale);
      const hdrPrice = t("analytics.pdf_header_price", locale);
      const hdrProfit = t("analytics.pdf_header_profit", locale);
      const hdrRoi = t("analytics.pdf_header_roi", locale);
      const hdrSalesMonth = t("analytics.pdf_header_sales_month", locale);
      const hdrStock = t("analytics.pdf_header_stock", locale);
      const hdrVelocity = t("analytics.pdf_header_velocity", locale);
      const hdrProjection = t("analytics.pdf_header_projection", locale);
      const hdrDate = t("analytics.pdf_header_date", locale);
      const hdrUnits = t("analytics.pdf_header_units", locale);
      const hdrCost = t("analytics.pdf_header_cost", locale);
      const daysLabel = t("common.days", locale);

      switch (selectedTemplate) {
        case "profitability": {
          const rows = filteredProducts
            .sort((a, b) => (b.roi || 0) - (a.roi || 0))
            .map((p) => [
              p.name,
              p.sku,
              `$${(p.sale_price || 0).toFixed(2)}`,
              `$${(p.net_profit || 0).toFixed(2)}`,
              `${(p.roi || 0).toFixed(1)}%`,
              `${p.sales_velocity_30d || 0}`,
            ]);
          doc.autoTable({
            head: [[hdrProduct, "SKU", hdrPrice, hdrProfit, hdrRoi, hdrSalesMonth]],
            body: rows,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 172, 210] },
          });
          break;
        }
        case "inventory": {
          const rows = filteredProducts
            .sort((a, b) => (a.stock_available || 0) - (b.stock_available || 0))
            .map((p) => [
              p.name,
              p.sku,
              String(p.stock_available || 0),
              `${p.sales_velocity_30d || 0}/${daysLabel === "days" ? "mo" : "mes"}`,
              p.sales_velocity_30d && p.sales_velocity_30d > 0
                ? `${Math.floor((p.stock_available || 0) / (p.sales_velocity_30d / 30))} ${daysLabel}`
                : t("common.na", locale),
            ]);
          doc.autoTable({
            head: [[hdrProduct, "SKU", hdrStock, hdrVelocity, hdrProjection]],
            body: rows,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 172, 210] },
          });
          break;
        }
        case "sales-summary": {
          const salesByDate: Record<string, { revenue: number; units: number }> = {};
          for (const s of filteredSales) {
            const key = s.sale_date;
            if (!salesByDate[key]) salesByDate[key] = { revenue: 0, units: 0 };
            salesByDate[key].revenue += s.revenue || 0;
            salesByDate[key].units += s.units_sold || 0;
          }
          const rows = Object.entries(salesByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vals]) => [
              new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "es-ES"),
              `$${vals.revenue.toFixed(2)}`,
              String(vals.units),
            ]);
          doc.autoTable({
            head: [[hdrDate, t("common.revenue", locale), hdrUnits]],
            body: rows,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 172, 210] },
          });
          break;
        }
        case "roi-ranking": {
          const rows = filteredProducts
            .sort((a, b) => (b.roi || 0) - (a.roi || 0))
            .map((p, i) => [
              String(i + 1),
              p.name,
              p.sku,
              `${(p.roi || 0).toFixed(1)}%`,
              `$${(p.net_profit || 0).toFixed(2)}`,
              `${p.sales_velocity_30d || 0}`,
            ]);
          doc.autoTable({
            head: [[t("common.rank", locale), hdrProduct, "SKU", hdrRoi, hdrProfit, hdrSalesMonth]],
            body: rows,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 172, 210] },
          });
          break;
        }
        case "supplier-performance": {
          const rows = filteredProducts
            .filter((p) => p.buy_cost)
            .sort((a, b) => (b.roi || 0) - (a.roi || 0))
            .map((p) => [
              p.name,
              p.sku,
              `$${(p.buy_cost || 0).toFixed(2)}`,
              `$${(p.sale_price || 0).toFixed(2)}`,
              `${(p.roi || 0).toFixed(1)}%`,
              `${p.sales_velocity_30d || 0}`,
            ]);
          doc.autoTable({
            head: [[hdrProduct, "SKU", hdrCost, hdrPrice, hdrRoi, hdrSalesMonth]],
            body: rows,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 172, 210] },
          });
          break;
        }
        case "ppc-summary": {
          const rows = filteredProducts
            .filter((p) => p.sales_velocity_30d && p.sales_velocity_30d > 0)
            .sort((a, b) => (b.sales_velocity_30d || 0) - (a.sales_velocity_30d || 0))
            .map((p) => [
              p.name,
              p.sku,
              `${p.sales_velocity_30d || 0}`,
              `$${(p.sale_price || 0).toFixed(2)}`,
              `$${(p.net_profit || 0).toFixed(2)}`,
              `${(p.roi || 0).toFixed(1)}%`,
            ]);
          doc.autoTable({
            head: [[hdrProduct, "SKU", hdrSalesMonth, hdrPrice, hdrProfit, hdrRoi]],
            body: rows,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 172, 210] },
          });
          break;
        }
      }

      doc.save(`reporte-${selectedTemplate}-${new Date().toISOString().split("T")[0]}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setSelectedTemplate(tmpl.id)}
            className={cn(
              "text-start p-4 rounded-xl border transition-all",
              selectedTemplate === tmpl.id
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-muted-foreground/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                selectedTemplate === tmpl.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <tmpl.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t(tmpl.labelKey, locale)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(tmpl.descriptionKey, locale)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="h-8 px-2 rounded-lg border border-border bg-popover text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="30d">{t("analytics.last_30_days", locale)}</option>
            <option value="90d">{t("analytics.last_90_days", locale)}</option>
            <option value="all">{t("analytics.all_history", locale)}</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {t("analytics.export_excel", locale)}
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {t("analytics.export_pdf", locale)}
        </button>
      </div>
    </div>
  );
}
