"use client";

import { useState } from "react";
import { HelpCircle, X, BookOpen, Package, Warehouse, TrendingUp, Truck, Calculator, Ship, RotateCcw, DollarSign, BarChart3, Megaphone, Plug, Settings, Search, ChevronRight } from "lucide-react";

const sections = [
  {
    icon: BarChart3,
    title: "Dashboard",
    description: "Vista general de tu negocio en un solo lugar.",
    example: "Muestra KPIs como beneficio total, ROI promedio, unidades vendidas este mes y alertas de stock bajo.",
  },
  {
    icon: Package,
    title: "Productos",
    description: "Catálogo completo de todos tus productos con costos, fees y rentabilidad.",
    example: "Ejemplo: Creas un producto \"Botella t\u00E9rmica 500ml\" con costo unitario $8, precio de venta $24.99, FBA fee $5.20. El sistema calcula autom\u00E1ticamente tu beneficio neto y ROI.",
  },
  {
    icon: Warehouse,
    title: "Inventario",
    description: "Control de stock disponible, en tr\u00E1nsito y movimientos.",
    example: "Ejemplo: Registras una entrada de 200 unidades. El stock disponible pasa de 50 a 250. Si baja de 20, aparece en alertas.",
  },
  {
    icon: TrendingUp,
    title: "Ventas",
    description: "Registro de todas las ventas con revenue, fees y beneficio real.",
    example: "Ejemplo: Vendes 15 unidades el 15/04/2025 por $374.85. Amazon cobr\u00F3 $56.23 en fees. Tu beneficio real fue $168.40 despu\u00E9s de restar costos.",
  },
  {
    icon: Truck,
    title: "Proveedores",
    description: "Gestiona tus proveedores, contactos y cotizaciones.",
    example: "Ejemplo: Guardas el proveedor \"Shenzhen Cups Co\" con contacto en WhatsApp, lead time de 25 d\u00EDas y comparas cotizaciones de distintos proveedores.",
  },
  {
    icon: BookOpen,
    title: "\u00D3rdenes de Compra",
    description: "Crea y haz seguimiento de \u00F3rdenes a proveedores.",
    example: "Ejemplo: Orden #PO-001 por 500 unidades a $4.50 cada una. Pasas de \"draft\" a \"sent\", luego \"in_production\", \"shipped\" y finalmente \"delivered\".",
  },
  {
    icon: Calculator,
    title: "Calculadora",
    description: "Simula rentabilidad antes de comprar un producto.",
    example: "Ejemplo: Introduces costo $10, precio venta $29.99, FBA fee $6.50, referral 15%. La calculadora te dice: beneficio $8.99, ROI 89.9%, margen 30%.",
  },
  {
    icon: Ship,
    title: "Env\u00EDos FBA",
    description: "Seguimiento de env\u00EDos desde tu proveedor hasta Amazon.",
    example: "Ejemplo: Creas un env\u00EDo \"FBA-2025-04\" con 3 cajas, 500 unidades, carrier DHL, tracking #123456789. Cambias estado de \"working\" a \"shipped\" a \"delivered\".",
  },
  {
    icon: RotateCcw,
    title: "Devoluciones",
    description: "Registra y analiza devoluciones y reembolsos.",
    example: "Ejemplo: Un cliente devuelve 2 unidades por \"defective\". Registras la devoluci\u00F3n, el estado pasa a \"inspected\" y decides si es \"sellable\" o \"unsellable\".",
  },
  {
    icon: DollarSign,
    title: "Finanzas",
    description: "Control de gastos, flujo de caja y pagos de Amazon.",
    example: "Ejemplo: Registras un gasto de software de $49/mes. Tambi\u00E9n ves los pagos de Amazon por per\u00EDodo y tu flujo de caja mensual.",
  },
  {
    icon: Search,
    title: "Forecasting",
    description: "Sugerencias inteligentes de reorden basadas en velocidad de venta.",
    example: "Ejemplo: Si vendes 10 unidades d\u00EDa de un producto, con lead time de 30 d\u00EDas y stock de 50, el sistema sugiere reordenar 350 unidades para no quedarte sin stock.",
  },
  {
    icon: Megaphone,
    title: "Publicidad (PPC)",
    description: "Seguimiento de campa\u00F1as publicitarias en Amazon.",
    example: "Ejemplo: Campa\u00F1a \"Auto-Botellas\" con presupuesto diario $25. Registras gasto acumulado $450, ventas atribuidas $1,200. ACOS = 37.5%.",
  },
  {
    icon: Plug,
    title: "SP-API",
    description: "Conexi\u00F3n con Selling Partner API de Amazon para sincronizaci\u00F3n autom\u00E1tica.",
    example: "Aqu\u00ED configurar\u00E1s credenciales LWA y SP-API para sincronizar autom\u00E1ticamente ventas, inventario y pagos desde Amazon sin importar manualmente.",
  },
  {
    icon: Settings,
    title: "Configuraci\u00F3n",
    description: "Ajustes de tu perfil, moneda, marketplace y fees por defecto.",
    example: "Ejemplo: Configuras que tu marketplace por defecto es MX, moneda MXN, FBA fee estimado $45.00 y ROI objetivo 50%. Estos valores se usan en formularios autom\u00E1ticamente.",
  },
];

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        title="Ayuda"
        aria-label="Ayuda"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 pb-10 px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground font-display">
                    Gu\u00EDa de Secciones
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Qu\u00E9 hace cada parte de la app y c\u00F3mo usarla
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {sections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-xl border border-border bg-background/50 p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <section.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {section.title}
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {section.description}
                      </p>
                      <div className="mt-2 rounded-lg bg-muted/50 border border-border/50 px-3 py-2">
                        <p className="text-[11px] text-foreground/80 leading-relaxed">
                          {section.example}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/30 rounded-b-2xl">
              <p className="text-[10px] text-muted-foreground text-center">
                Tip: Pasa el mouse sobre iconos y botones para ver tooltips con m\u00E1s informaci\u00F3n.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
