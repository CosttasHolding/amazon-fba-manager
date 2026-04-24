// src/lib/help-content.ts
// Sistema de Ayuda / Auditoria de Uso - Amazon FBA Manager v2
// Glosario técnico completo en español

export interface HelpSection {
  id: string;
  title: string;
  route: string;
  description: string;
  kpis?: { label: string; description: string; formula?: string }[];
  filters?: { label: string; description: string }[];
  actions?: { label: string; description: string }[];
  tables?: { label: string; columns: { name: string; description: string }[] }[];
  forms?: { label: string; fields: { name: string; description: string; required?: boolean }[] }[];
  glossary?: { term: string; definition: string }[];
  tips?: string[];
}

export const HELP_GLOSSARY: { term: string; definition: string }[] = [
  {
    term: "ROI (Return on Investment)",
    definition:
      "Retorno de Inversión. Métrica que mide la rentabilidad de un producto como porcentaje. Fórmula: ((Ganancia Neta / Costo Total) × 100). Un ROI > 100% significa que duplicaste tu inversión.",
  },
  {
    term: "Margen Neto",
    definition:
      "Porcentaje de ganancia sobre el precio de venta. Fórmula: ((Precio Venta - Costo Total) / Precio Venta) × 100. Diferente del ROI porque usa precio de venta como denominador, no costo.",
  },
  {
    term: "Landed Cost",
    definition:
      "Costo total de producto puesto en almacén FBA. Incluye: costo de compra + envío internacional + aduana + prep center + flete local. Es el denominador para calcular ROI realista.",
  },
  {
    term: "FBA Fee",
    definition:
      "Tarifa de Fulfillment by Amazon. Amazon cobra por almacenamiento, picking, packing, shipping al cliente final, y atención al cliente. Se calcula por peso y dimensiones del producto.",
  },
  {
    term: "Referral Fee",
    definition:
      "Comisión de Amazon por cada venta. Generalmente 15% del precio de venta para la mayoría de categorías. Se calcula automáticamente sobre el precio de venta final.",
  },
  {
    term: "TACOS (Total Advertising Cost of Sales)",
    definition:
      "Costo total de publicidad como porcentaje de ventas. Fórmula: (Gasto en PPC / Revenue Total) × 100. Ideal mantener < 10% para productos maduros, < 20% para lanzamientos.",
  },
  {
    term: "MOQ (Minimum Order Quantity)",
    definition:
      "Cantidad mínima de pedido exigida por el proveedor. Es el volumen mínimo que debes comprar en una orden. Crítico para calcular capital inicial necesario.",
  },
  {
    term: "Lead Time",
    definition:
      "Tiempo de entrega del proveedor desde confirmación de orden hasta recepción en almacén. Incluye producción + envío + aduana. Se mide en días.",
  },
  {
    term: "Stockout",
    definition:
      "Fecha estimada en que se agota el stock basado en la velocidad de ventas actual. Fórmula: Stock Actual / Unidades Vendidas por Día. Crítico para planificar reordenes.",
  },
  {
    term: "Días de Stock",
    definition:
      "Cuántos días durará el inventario actual a la velocidad de ventas actual. Fórmula: Stock Total / (Ventas últimos 30 días / 30). Recomendado mantener > 30 días como buffer.",
  },
  {
    term: "Break-even",
    definition:
      "Punto de equilibrio: cantidad de unidades que debes vender para recuperar la inversión inicial. Fórmula: Costo Fijo Total / Ganancia por Unidad. Incluye costo del producto + envío + setup inicial.",
  },
  {
    term: "ASIN (Amazon Standard Identification Number)",
    definition:
      "Identificador único de 10 caracteres que Amazon asigna a cada producto. Se usa para rastrear inventario, ventas y reviews. Formato: B00XXXXXXX.",
  },
  {
    term: "SKU (Stock Keeping Unit)",
    definition:
      "Código interno de seguimiento de inventario que tú defines. Puede incluir variantes (color, tamaño). Ejemplo: PROD-BLU-L. Diferente del ASIN que es de Amazon.",
  },
  {
    term: "Velocity (Velocidad de Ventas)",
    definition:
      "Unidades vendidas por día promedio. Se calcula sobre ventas de los últimos 30 días. Fórmula: Unidades Vendidas / 30. Usado para forecasting y reorden automático.",
  },
  {
    term: "PPC (Pay Per Click)",
    definition:
      "Publicidad pagada en Amazon donde pagas cada vez que un cliente hace clic en tu anuncio. Incluye Sponsored Products, Sponsored Brands, y Sponsored Display.",
  },
  {
    term: "Prep Center",
    definition:
      "Centro de preparación que recibe tu producto del proveedor, lo inspecciona, etiqueta con códigos FBA, y lo envía a los almacenes de Amazon. Costo adicional al landed cost.",
  },
  {
    term: "Forwarder",
    definition:
      "Agente de carga/freight forwarder: intermediario que coordina el envío internacional. Maneja documentación aduanera, consolidación de carga, y trámites de importación.",
  },
  {
    term: "Fulfillment Center (FC)",
    definition:
      "Centro de distribución de Amazon donde se almacena tu inventario FBA. Amazon asigna FCs automáticamente al crear shipments. Ejemplos: PHX6, LAX9, TPA1.",
  },
  {
    term: "BSR (Best Sellers Rank)",
    definition:
      "Ranking de ventas de Amazon. Número que indica qué tan bien vende un producto en su categoría. Mientras más bajo, mejor (1 = más vendido). Se actualiza cada hora.",
  },
  {
    term: "Reimbursement",
    definition:
      "Reembolso de Amazon por inventario perdido, dañado o destruido en sus almacenes. Amazon debe pagar el valor del inventario. Se solicita a través de casos en Seller Central.",
  },
];

export const HELP_SECTIONS: HelpSection[] = [
  // ===== DASHBOARD =====
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/dashboard",
    description:
      "Panel de control central que proporciona una visión global del negocio FBA. Muestra métricas clave de rendimiento, tendencias de ventas, alertas de inventario y productos top. Es el punto de entrada principal para monitorear la salud del negocio.",
    kpis: [
      {
        label: "Revenue Mensual",
        description: "Ingresos totales del mes en curso generados por ventas de todos los productos activos.",
        formula: "Σ (Unidades Vendidas × Precio Venta) por producto",
      },
      {
        label: "ROI Ponderado",
        description: "Retorno de inversión promedio ponderado por volumen de ventas de todos los productos activos.",
        formula: "Σ (ROI producto × Unidades vendidas) / Σ Unidades vendidas",
      },
      {
        label: "Unidades (mes)",
        description: "Total de unidades vendidas en el mes actual.",
        formula: "Σ Unidades vendidas últimos 30 días",
      },
      {
        label: "Margen Neto",
        description: "Margen promedio ponderado de todos los productos. Indica qué porcentaje del precio de venta es ganancia.",
        formula: "Σ (Margen producto × Revenue) / Revenue Total",
      },
      {
        label: "Alertas Stock",
        description: "Conteo de productos con problemas de inventario: sin stock, stock bajo, o sobrestock.",
      },
      {
        label: "Valor Inventario",
        description: "Valor total del inventario actual basado en costo de compra.",
        formula: "Σ (Stock Actual × Costo Unitario)",
      },
    ],
    tables: [
      {
        label: "Top 5 por Rentabilidad",
        columns: [
          { name: "#", description: "Ranking posición" },
          { name: "Producto", description: "Nombre del producto con SKU" },
          { name: "Unidades", description: "Unidades vendidas en el período" },
          { name: "Revenue", description: "Ingresos generados" },
          { name: "ROI", description: "Retorno de inversión del producto" },
          { name: "Estado", description: "Estado del producto (activo/pausado/sin stock)" },
        ],
      },
      {
        label: "Alertas de Inventario",
        columns: [
          { name: "Producto", description: "Nombre y SKU del producto" },
          { name: "Tipo", description: "Sin Stock / Stock Bajo / Sobrestock" },
          { name: "Stock", description: "Unidades disponibles" },
          { name: "Reorden", description: "Nivel mínimo definido para reorden" },
          { name: "Acción", description: "Link para gestionar el producto" },
        ],
      },
    ],
    actions: [
      {
        label: "Exportar a Excel",
        description: "Genera archivo .xlsx con el resumen completo del dashboard: KPIs, alertas y top productos.",
      },
    ],
    tips: [
      "Revisa el Dashboard diariamente por la mañana para identificar alertas de stock críticas.",
      "Un ROI Ponderado > 100% indica negocio saludable. Si cae < 50%, revisa costos o precios.",
      "Las alertas de stock se calculan automáticamente comparando stock actual vs nivel mínimo definido.",
      "El Margen Neto ideal para productos FBA es 25-40% después de todas las tarifas.",
    ],
  },

  // ===== PRODUCTOS =====
  {
    id: "products",
    title: "Productos",
    route: "/products",
    description:
      "Catálogo completo de productos gestionados en el negocio FBA. Cada producto contiene información de costos, precios, tarifas Amazon, inventario, y proveedores vinculados. Es el módulo central para el análisis de rentabilidad.",
    kpis: [
      {
        label: "Total Productos",
        description: "Cantidad total de productos registrados en el sistema.",
      },
      {
        label: "ROI Promedio",
        description: "ROI medio de todos los productos activos.",
      },
      {
        label: "Ganancia Total",
        description: "Suma de ganancias netas de todos los productos.",
        formula: "Σ (Unidades × (Precio Venta - Costo Total))",
      },
      {
        label: "Precio Promedio",
        description: "Precio de venta promedio ponderado.",
      },
    ],
    filters: [
      {
        label: "Búsqueda",
        description: "Filtra por nombre, SKU o ASIN. Búsqueda insensible a mayúsculas.",
      },
      {
        label: "Estado",
        description: "Activo, Pausado, Sin Stock, Descontinuado.",
      },
      {
        label: "Categoría",
        description: "Filtra por categoría Amazon registrada.",
      },
      {
        label: "Marketplace",
        description: "Amazon.com, Amazon.ca, Amazon.mx, etc.",
      },
      {
        label: "Precio de Venta",
        description: "Rango mínimo/máximo de precio.",
      },
      {
        label: "ROI",
        description: "Rango mínimo/máximo de retorno de inversión.",
      },
    ],
    tables: [
      {
        label: "Lista de Productos",
        columns: [
          { name: "Producto", description: "Nombre + SKU + ASIN" },
          { name: "Categoría", description: "Categoría Amazon" },
          { name: "Precio/Costo", description: "Precio venta vs costo unitario" },
          { name: "Ganancia", description: "Ganancia neta por unidad" },
          { name: "ROI", description: "Retorno de inversión" },
          { name: "Stock", description: "Unidades disponibles" },
          { name: "Estado", description: "Badge de estado" },
        ],
      },
    ],
    actions: [
      { label: "Nuevo Producto", description: "Abre modal para crear producto con calculadora en vivo.", },
      { label: "Exportar Excel", description: "Exporta productos filtrados a Excel.", },
      { label: "Filtros Avanzados", description: "Panel expandible con múltiples filtros y ordenamiento.", },
    ],
    glossary: [
      { term: "Status", definition: "Activo = visible en listings, Pausado = temporalmente detenido, Sin Stock = sin inventario, Descontinuado = eliminado permanentemente." },
    ],
    tips: [
      "Haz clic en cualquier fila para ver el detalle completo del producto.",
      "Usa los filtros de ROI para identificar productos que necesitan ajuste de precio.",
      "El color del ROI indica: verde (>100%), amarillo (50-100%), rojo (<50%).",
      "Productos con ROI < 30% deben revisarse inmediatamente: subir precio o negociar costo.",
    ],
  },

  // ===== CREAR/EDITAR PRODUCTO =====
  {
    id: "product-form",
    title: "Crear / Editar Producto",
    route: "/products/new",
    description:
      "Formulario completo para registrar un nuevo producto o editar uno existente. Incluye calculadora de rentabilidad en tiempo real que actualiza ROI, margen y ganancia a medida que ingresas datos.",
    forms: [
      {
        label: "Información Básica",
        fields: [
          { name: "Nombre", description: "Nombre comercial del producto", required: true },
          { name: "ASIN", description: "Identificador Amazon de 10 caracteres", required: false },
          { name: "SKU", description: "Código interno de seguimiento", required: false },
          { name: "Categoría", description: "Categoría Amazon para cálculo de referral fee", required: true },
          { name: "Marketplace", description: "Amazon.com / .ca / .mx / .uk / .de", required: true },
          { name: "Estado", description: "Activo / Pausado / Sin Stock / Descontinuado", required: true },
          { name: "Peso (kg)", description: "Peso en kilogramos para cálculo FBA fee", required: true },
        ],
      },
      {
        label: "Costos y Precios",
        fields: [
          { name: "Costo Unitario", description: "Costo de compra al proveedor por unidad", required: true },
          { name: "Precio Venta", description: "Precio de venta en Amazon", required: true },
          { name: "Tarifa FBA", description: "Tarifa Amazon FBA (auto-calculada por peso)", required: false },
          { name: "Tarifa Referral", description: "Comisión Amazon (auto-calculada por categoría)", required: false },
          { name: "Costo Envío", description: "Costo de envío por unidad al almacén FBA", required: false },
          { name: "Costo Almacenamiento", description: "Costo mensual de almacenamiento por unidad", required: false },
          { name: "Costo Prep", description: "Costo de preparación (etiquetado, embalaje)", required: false },
          { name: "Impuestos", description: "Porcentaje de impuestos aplicables", required: false },
          { name: "Otros Costos", description: "Fotografía, diseño, inspección, etc.", required: false },
        ],
      },
      {
        label: "Proveedor Vinculado",
        fields: [
          { name: "Proveedor", description: "Proveedor seleccionado de la base", required: false },
          { name: "Costo Unitario (prov.)", description: "Costo específico con este proveedor", required: false },
          { name: "MOQ", description: "Cantidad mínima de orden con este proveedor", required: false },
          { name: "Lead Time", description: "Días de entrega del proveedor", required: false },
        ],
      },
    ],
    glossary: [
      { term: "FeeCalculatorInline", definition: "Componente que calcula en tiempo real: Ganancia Neta = Precio Venta - (Costo Compra + FBA Fee + Referral Fee + Envío + Almacenamiento + Prep + Impuestos + Otros). ROI = (Ganancia Neta / Costo Total) × 100." },
    ],
    tips: [
      "La Tarifa FBA se calcula automáticamente según el peso ingresado usando las tarifas vigentes de Amazon.",
      "La Tarifa Referral se calcula según la categoría seleccionada (generalmente 15%).",
      "Si ya tienes settings configurados en /settings, los valores por defecto se cargan automáticamente.",
      "El Break-even se calcula automáticamente: Costo Total / Ganancia por Unidad.",
      "Guarda un producto con ROI > 100% para asegurar rentabilidad saludable.",
    ],
  },

  // ===== DETALLE PRODUCTO =====
  {
    id: "product-detail",
    title: "Detalle de Producto",
    route: "/products/[id]",
    description:
      "Vista detallada de un producto específico. Muestra desglose completo de costos, estado de inventario, proveedores vinculados, y timeline de movimientos.",
    kpis: [
      { label: "Precio Venta", description: "Precio actual de venta en Amazon" },
      { label: "Costo Compra", description: "Costo unitario de compra al proveedor" },
      { label: "ROI", description: "Retorno de inversión actual" },
      { label: "Margen", description: "Margen neto actual" },
    ],
    tables: [
      {
        label: "Desglose de Costos",
        columns: [
          { name: "Concepto", description: "Tipo de costo" },
          { name: "Monto", description: "Valor en moneda base" },
          { name: "% del Total", description: "Porcentaje sobre costo total" },
        ],
      },
      {
        label: "Proveedores Vinculados",
        columns: [
          { name: "Proveedor", description: "Nombre del proveedor" },
          { name: "País", description: "País de origen" },
          { name: "Rating", description: "Calificación 1-5 estrellas" },
          { name: "Costo Unit.", description: "Costo con este proveedor" },
          { name: "MOQ", description: "Cantidad mínima" },
          { name: "Lead Time", description: "Días de entrega" },
          { name: "Principal", description: "Proveedor principal (estrella)" },
        ],
      },
    ],
    actions: [
      { label: "Editar", description: "Abre formulario de edición en modal" },
      { label: "Eliminar", description: "Elimina permanentemente el producto con confirmación" },
    ],
    tips: [
      "Compara costos entre proveedores para negociar mejores precios.",
      "Si un proveedor tiene mejor costo pero mayor MOQ, calcula si el ahorro unitario compensa el capital extra.",
      "Revisa el desglose de costos mensualmente para identificar aumentos en tarifas FBA.",
    ],
  },

  // ===== PROVEEDORES =====
  {
    id: "suppliers",
    title: "Proveedores",
    route: "/suppliers",
    description:
      "Directorio completo de proveedores con información de contacto, condiciones comerciales, cotizaciones y productos vinculados. Permite comparar proveedores y gestionar relaciones comerciales.",
    kpis: [
      { label: "Total", description: "Cantidad total de proveedores registrados" },
      { label: "Activos", description: "Proveedores con estado activo" },
      { label: "Países", description: "Número de países diferentes" },
      { label: "Rating Prom.", description: "Calificación promedio ponderada" },
    ],
    filters: [
      { label: "Búsqueda", description: "Por nombre, contacto o país" },
      { label: "Estado", description: "Activo / Inactivo" },
      { label: "País", description: "Filtra por país de origen" },
      { label: "Rating", description: "Rango de calificación 1-5" },
      { label: "MOQ", description: "Rango de cantidad mínima" },
      { label: "Lead Time", description: "Rango de días de entrega" },
    ],
    tables: [
      {
        label: "Lista de Proveedores",
        columns: [
          { name: "Proveedor", description: "Nombre comercial" },
          { name: "País", description: "País de origen" },
          { name: "Rating", description: "Estrellas 1-5" },
          { name: "MOQ", description: "Cantidad mínima de orden" },
          { name: "Lead Time", description: "Días promedio de entrega" },
          { name: "Estado", description: "Activo / Inactivo" },
          { name: "Link", description: "URL a Alibaba o web" },
        ],
      },
    ],
    actions: [
      { label: "Nuevo Proveedor", description: "Modal para registrar proveedor" },
      { label: "Exportar Excel", description: "Exporta proveedores filtrados" },
      { label: "Comparar", description: "Navega a /suppliers/compare para comparación" },
    ],
    tips: [
      "Mantén al menos 2 proveedores por producto para mitigar riesgos de producción.",
      "Un rating < 3 estrellas requiere revisión: inspecciones más frecuentes o búsqueda de alternativas.",
      "El lead time incluye producción + envío. Pregunta desglose al proveedor.",
      "MOQ negociable: muchos proveedores bajan MOQ en reordenes si hay buena relación.",
    ],
  },

  // ===== DETALLE PROVEEDOR =====
  {
    id: "supplier-detail",
    title: "Detalle de Proveedor",
    route: "/suppliers/[id]",
    description:
      "Vista detallada de un proveedor con pestañas para información general, cotizaciones, productos vinculados y pedidos.",
    tables: [
      {
        label: "Tab: Información",
        columns: [
          { name: "Rating", description: "Calificación 1-5" },
          { name: "País", description: "País de origen" },
          { name: "MOQ", description: "Cantidad mínima" },
          { name: "Lead Time", description: "Días de entrega" },
          { name: "Términos de Pago", description: "30/70, 50/50, etc." },
        ],
      },
      {
        label: "Tab: Cotizaciones",
        columns: [
          { name: "Producto", description: "Producto cotizado" },
          { name: "Cantidad", description: "Volumen de la cotización" },
          { name: "Precio Unit.", description: "Precio por unidad" },
          { name: "Total", description: "Cantidad × Precio Unitario" },
          { name: "Envío", description: "Costo de envío incluido" },
          { name: "Estado", description: "Vigente / Expirada / Aceptada" },
        ],
      },
      {
        label: "Tab: Productos",
        columns: [
          { name: "Producto", description: "Nombre del producto" },
          { name: "SKU", description: "Código interno" },
          { name: "Costo Unit.", description: "Costo con este proveedor" },
          { name: "MOQ", description: "MOQ específico" },
          { name: "Estado", description: "Activo / Inactivo" },
          { name: "Principal", description: "Proveedor principal (estrella)" },
        ],
      },
    ],
    actions: [
      { label: "Nueva Cotización", description: "Crea cotización para este proveedor" },
      { label: "Editar", description: "Edita datos del proveedor" },
      { label: "Eliminar", description: "Elimina proveedor con confirmación" },
    ],
    tips: [
      "Cotizaciones vigentes por 30 días. Renueva antes de hacer pedido.",
      "Compara cotizaciones de múltiples proveedores en /suppliers/compare.",
      "Marca un proveedor como 'Principal' para que aparezca por defecto en órdenes de compra.",
    ],
  },

  // ===== COMPARAR PROVEEDORES =====
  {
    id: "supplier-compare",
    title: "Comparar Proveedores",
    route: "/suppliers/compare",
    description:
      "Herramienta de comparación lado-a-lado de hasta 4 proveedores. Calcula costo total estimado incluyendo producto, envío y MOQ para una cantidad deseada.",
    kpis: [
      { label: "Costo Total Estimado", description: "Por proveedor seleccionado" },
      { label: "Precio Unitario", description: "Incluyendo envío y proporcionalidades" },
    ],
    tables: [
      {
        label: "Comparativa Detallada",
        columns: [
          { name: "Métrica", description: "Precio Unitario / Costo Producto / Envío / Total / MOQ / Lead Time / Rating" },
          { name: "Proveedor 1-4", description: "Valor por cada proveedor seleccionado" },
        ],
      },
    ],
    actions: [
      { label: "Seleccionar Proveedores", description: "Dropdown multi-select (máx 4)" },
      { label: "Cantidad a Importar", description: "Input numérico para calcular totales" },
    ],
    tips: [
      "El proveedor 'recomendado' (verde) es el de menor costo total para la cantidad indicada.",
      "Considera no solo precio sino también lead time y rating en la decisión final.",
      "MOQ bajo con precio alto puede ser mejor para testeo inicial.",
      "MOQ alto con precio bajo es ideal para reordenes establecidos.",
    ],
  },

  // ===== PEDIDOS =====
  {
    id: "orders",
    title: "Pedidos",
    route: "/orders",
    description:
      "Sistema de gestión de órdenes de compra (Purchase Orders) con tracking visual del estado. Permite seguir el flujo completo desde borrador hasta entrega, incluyendo pagos y logística.",
    kpis: [
      { label: "Órdenes Activas", description: "Pedidos no entregados ni cancelados" },
      { label: "Valor Total", description: "Suma de todos los pedidos registrados" },
      { label: "En Tránsito", description: "Pedidos en estado 'in_transit'" },
      { label: "Próxima Llegada", description: "Fecha de llegada estimada más cercana" },
    ],
    filters: [
      { label: "Búsqueda", description: "Por PO, proveedor o producto" },
      { label: "Estado", description: "Todos los estados del flujo" },
    ],
    tables: [
      {
        label: "Lista de Órdenes",
        columns: [
          { name: "PO / Proveedor", description: "Número PO y nombre proveedor" },
          { name: "Producto", description: "Producto ordenado" },
          { name: "Cantidad", description: "Unidades pedidas" },
          { name: "Total", description: "Costo total de la orden" },
          { name: "Estado", description: "Badge de estado actual" },
          { name: "Progreso", description: "Timeline visual del flujo" },
          { name: "Llegada Est.", description: "Fecha estimada de llegada" },
        ],
      },
    ],
    glossary: [
      { term: "Flujo de Estados", definition: "Borrador → Enviado → Confirmado → Producción → Embarcado → En Tránsito → Aduana → Entregado. Cancelado es terminal." },
      { term: "PO (Purchase Order)", definition: "Número de orden de compra. Puede ser autogenerado o manual." },
    ],
    actions: [
      { label: "Nueva Orden", description: "Modal para crear orden de compra" },
    ],
    tips: [
      "Actualiza el estado cada vez que el proveedor confirme un cambio.",
      "Registra tracking number tan pronto como el forwarder lo proporcione.",
      "El timeline visual muestra progreso automáticamente basado en estado.",
      "Registra pagos (depósito + balance) para controlar flujo de caja.",
    ],
  },

  // ===== DETALLE PEDIDO =====
  {
    id: "order-detail",
    title: "Detalle de Pedido",
    route: "/orders/[id]",
    description:
      "Vista completa de una orden de compra individual. Incluye timeline visual, información general, logística, fechas, costos landed y pagos.",
    tables: [
      {
        label: "Información General",
        columns: [
          { name: "Producto", description: "Producto ordenado" },
          { name: "SKU", description: "Código interno" },
          { name: "Cantidad", description: "Unidades pedidas" },
          { name: "Costo Unitario", description: "Precio por unidad acordado" },
          { name: "Total Producto", description: "Cantidad × Costo Unitario" },
          { name: "Moneda", description: "USD / EUR / CNY" },
          { name: "Tipo de Cambio", description: "Tipo de cambio aplicado" },
        ],
      },
      {
        label: "Envío y Logística",
        columns: [
          { name: "Método", description: "Aire / Marítimo / Express" },
          { name: "Costo Envío", description: "Flete internacional" },
          { name: "Forwarder", description: "Agente de carga" },
          { name: "Tracking", description: "Número de seguimiento" },
          { name: "Aduana", description: "Costos aduaneros" },
          { name: "Prep Center", description: "Costo de preparación" },
          { name: "Amazon Shipment", description: "ID de envío a Amazon" },
        ],
      },
      {
        label: "Pagos",
        columns: [
          { name: "Depósito", description: "Pago inicial (generalmente 30%)" },
          { name: "Balance", description: "Pago final (generalmente 70%)" },
          { name: "Total Pagado", description: "Depósito + Balance" },
          { name: "Pendiente", description: "Costo Landed - Total Pagado" },
        ],
      },
    ],
    glossary: [
      { term: "Landed Cost", definition: "Costo total del pedido incluyendo: producto + envío + aduana + prep center. Es lo que realmente te cuesta tener el producto listo para vender." },
    ],
    tips: [
      "El costo landed debe actualizarse con datos reales a medida que avanza el pedido.",
      "Registra fechas reales (no estimadas) cuando ocurran para mejorar forecasting futuro.",
      "Si hay demoras en aduana, documenta para negociar mejores tiempos con forwarder.",
    ],
  },

  // ===== INVENTARIO =====
  {
    id: "inventory",
    title: "Inventario",
    route: "/inventory",
    description:
      "Control de niveles de stock con proyecciones de agotamiento y alertas automáticas. Integra stock en almacén FBA, en tránsito y en warehouse propio.",
    kpis: [
      { label: "Total Unidades", description: "Suma de todas las unidades en todos los estados" },
      { label: "Stock Bajo", description: "Productos por debajo del nivel mínimo" },
      { label: "Sin Stock", description: "Productos con 0 unidades disponibles" },
      { label: "Exceso Stock", description: "Productos con stock excesivamente alto" },
    ],
    filters: [
      { label: "Búsqueda", description: "Por SKU o nombre" },
      { label: "Estado de Stock", description: "Normal / Bajo / Sin Stock / Exceso" },
      { label: "Unidades Disponibles", description: "Rango numérico" },
    ],
    tables: [
      {
        label: "Lista de Inventario",
        columns: [
          { name: "SKU", description: "Código de producto" },
          { name: "Producto", description: "Nombre comercial" },
          { name: "Disponible", description: "Stock en FBA disponible para venta" },
          { name: "En Tránsito", description: "Unidades enviadas a Amazon no recibidas aún" },
          { name: "Warehouse", description: "Stock en almacén propio o prep center" },
          { name: "Total", description: "Disponible + En Tránsito + Warehouse" },
          { name: "Días Stock", description: "Cuántos días durará el inventario actual" },
          { name: "Stockout", description: "Fecha estimada de agotamiento" },
          { name: "Estado", description: "Badge de estado" },
        ],
      },
    ],
    glossary: [
      { term: "Stockout", definition: "Fecha calculada en que se agotará el stock. Fórmula: Fecha Actual + (Stock Disponible / Velocidad de Ventas Diaria)." },
      { term: "Días de Stock", definition: "Stock Total / (Ventas últimos 30 días / 30). Recomendado mantener 45-60 días de stock como buffer." },
      { term: "Exceso Stock", definition: "Stock > 120 días de ventas. Genera costos de almacenamiento elevados y riesgo de obsolescencia." },
    ],
    tips: [
      "Días de stock < 15 = CRÍTICO. Ordena inmediatamente.",
      "Días de stock 15-30 = ADVERTENCIA. Planifica reorden.",
      "Días de stock 30-60 = ÓPTIMO. Nivel saludable.",
      "Días de stock > 120 = EXCESO. Considera promociones o pausar reordenes.",
      "El stockout se calcula sobre stock DISPONIBLE, no total. Considera el en tránsito.",
    ],
  },

  // ===== VENTAS =====
  {
    id: "sales",
    title: "Ventas",
    route: "/sales",
    description:
      "Registro histórico de ventas con análisis de tendencias, importación CSV, exportación PDF y gráficos de revenue/profit.",
    kpis: [
      { label: "Revenue Total", description: "Suma de todos los ingresos por ventas" },
      { label: "Profit Total", description: "Suma de todas las ganancias netas" },
      { label: "Unidades", description: "Total de unidades vendidas" },
      { label: "Fees Amazon", description: "Total de tarifas Amazon pagadas" },
    ],
    filters: [
      { label: "Rango de Fechas", description: "Fecha inicio y fin" },
      { label: "Revenue", description: "Rango mínimo/máximo" },
      { label: "Profit", description: "Rango mínimo/máximo" },
    ],
    tables: [
      {
        label: "Lista de Ventas",
        columns: [
          { name: "Fecha", description: "Fecha de la venta" },
          { name: "Producto", description: "Nombre del producto vendido" },
          { name: "Unidades", description: "Cantidad vendida" },
          { name: "Revenue", description: "Ingresos brutos" },
          { name: "Fees", description: "Tarifas Amazon (FBA + referral)" },
          { name: "Profit", description: "Ganancia neta" },
        ],
      },
    ],
    actions: [
      { label: "Registrar Venta", description: "Modal para registrar venta manual" },
      { label: "Importar CSV", description: "Importa archivo CSV con ventas" },
      { label: "Reporte PDF", description: "Genera reporte PDF con resumen mensual" },
      { label: "Exportar Excel", description: "Exporta ventas a Excel" },
    ],
    glossary: [
      { term: "CSV Import", definition: "Formato requerido: date, sku, units. Opcional: revenue, fees. Máximo 500 filas, 5MB." },
      { term: "Fees Amazon", definition: "Suma de FBA fee + referral fee por cada venta. Se calcula automáticamente si no se proporciona." },
    ],
    tips: [
      "Importa ventas semanalmente para mantener forecasting actualizado.",
      "El gráfico de tendencia muestra revenue y profit acumulado por día.",
      "Profit negativo indica producto con problemas: revisa precio o costos.",
      "Fees Amazon deberían ser ~20-25% del revenue para productos estándar.",
    ],
  },

  // ===== CALCULADORA =====
  {
    id: "calculator",
    title: "Calculadora",
    route: "/calculator",
    description:
      "Calculadora de rentabilidad FBA con análisis de escenarios. Permite simular diferentes condiciones (pesimista, realista, optimista) y calcula métricas clave en tiempo real.",
    kpis: [
      { label: "Ganancia Neta", description: "Ganancia por unidad después de todos los costos" },
      { label: "ROI", description: "Retorno de inversión" },
      { label: "Margen", description: "Margen neto sobre precio de venta" },
      { label: "Landed", description: "Costo landed por unidad" },
      { label: "Break-even", description: "Unidades para recuperar inversión" },
      { label: "TACOS", description: "Advertising cost of sales" },
      { label: "Units/mes PPC", description: "Unidades necesarias para cubrir gasto PPC" },
    ],
    forms: [
      {
        label: "Inputs",
        fields: [
          { name: "Precio Venta", description: "Precio de venta en Amazon", required: true },
          { name: "Costo", description: "Costo de compra por unidad", required: true },
          { name: "Cantidad", description: "Volumen de importación", required: true },
          { name: "Peso", description: "Peso en kg para FBA fee", required: true },
          { name: "Flete/kg", description: "Costo de flete por kilogramo", required: true },
          { name: "Prep", description: "Costo de preparación por unidad", required: false },
          { name: "Fotos", description: "Costo de fotografía amortizado", required: false },
          { name: "PPC", description: "Gasto mensual en publicidad", required: false },
          { name: "Otros", description: "Otros costos variables", required: false },
        ],
      },
    ],
    glossary: [
      { term: "Escenario Pesimista", definition: "-15% precio, -40% volumen. Simula condiciones adversas." },
      { term: "Escenario Realista", definition: "Valores actuales ingresados." },
      { term: "Escenario Optimista", definition: "+15% precio, +40% volumen. Simula mejor caso." },
      { term: "Viable", definition: "ROI > 50% en escenario pesimista." },
      { term: "Revisar", definition: "ROI < 50% o margen negativo. Producto no rentable." },
    ],
    actions: [
      { label: "Guardar Análisis", description: "Guarda escenario para referencia futura" },
      { label: "Configuración", description: "Ajusta defaults: ROI objetivo, categoría, método envío" },
    ],
    tips: [
      "Si escenario pesimista es 'Viable', el producto es seguro para invertir.",
      "Si escenario realista es 'Revisar', no inviertas hasta optimizar costos.",
      "TACOS ideal < 10% para productos maduros, < 20% para lanzamientos.",
      "Break-even > cantidad importada = no recuperarás inversión en primer lote.",
      "Usa flete marítimo ($1.2/kg) para volúmenes > 500kg, aéreo ($6.5/kg) para < 100kg.",
    ],
  },

  // ===== SETTINGS =====
  {
    id: "settings",
    title: "Configuración",
    route: "/settings",
    description:
      "Centro de configuración del usuario. Gestiona perfil, valores por defecto FBA, parámetros de cálculo, exportación/importación de datos y preferencias.",
    forms: [
      {
        label: "Perfil",
        fields: [
          { name: "Nombre Completo", description: "Nombre del usuario", required: false },
          { name: "Empresa", description: "Nombre de la empresa FBA", required: false },
          { name: "País", description: "País de operación fiscal", required: false },
        ],
      },
      {
        label: "FBA Defaults",
        fields: [
          { name: "Marketplace", description: "Marketplace principal", required: false },
          { name: "FBA Fee Default", description: "Tarifa FBA por defecto", required: false },
          { name: "Referral Fee Default", description: "Comisión por defecto (%)", required: false },
          { name: "Shipping Cost Default", description: "Envío por defecto", required: false },
          { name: "Storage Cost Default", description: "Almacenamiento por defecto", required: false },
        ],
      },
      {
        label: "Cálculos",
        fields: [
          { name: "ROI Objetivo", description: "ROI mínimo deseado (%)", required: false },
          { name: "Moneda", description: "USD / EUR / GBP", required: false },
          { name: "Tax Rate", description: "Tasa impositiva (%)", required: false },
        ],
      },
    ],
    actions: [
      { label: "Guardar Perfil", description: "Guarda cambios de perfil" },
      { label: "Guardar FBA Defaults", description: "Guarda defaults" },
      { label: "Guardar Cálculos", description: "Guarda parámetros" },
      { label: "Exportar", description: "Exporta datos a CSV" },
      { label: "Importar", description: "Navega a /import" },
    ],
    tips: [
      "Configura FBA Defaults para que nuevos productos carguen valores automáticamente.",
      "ROI objetivo de 100% es conservador. 150% es agresivo.",
      "Exporta backups mensuales de todos los módulos.",
      "Tax rate varía por país: USA ~0-10% (estatal), UK 20% VAT, Europa 19-27% VAT.",
    ],
  },

  // ===== SHIPMENTS =====
  {
    id: "shipments",
    title: "Shipments",
    route: "/shipments",
    description:
      "Tracking de envíos FBA inbound. Gestiona creación de shipments, asignación de fulfillment centers, y seguimiento de estados.",
    kpis: [
      { label: "En Preparación", description: "Shipments en estado working" },
      { label: "Enviado", description: "Shipments enviados a Amazon" },
      { label: "En Tránsito", description: "Shipments en tránsito" },
      { label: "Entregado", description: "Shipments recibidos por Amazon" },
    ],
    tables: [
      {
        label: "Lista de Shipments",
        columns: [
          { name: "Nombre", description: "Nombre descriptivo del shipment" },
          { name: "Estado", description: "Estado actual del envío" },
          { name: "Destino (FC)", description: "Fulfillment Center destino" },
          { name: "Unidades", description: "Total de unidades" },
          { name: "ETA", description: "Fecha estimada de llegada" },
        ],
      },
    ],
    actions: [
      { label: "Nuevo Shipment", description: "Modal para crear shipment" },
    ],
    glossary: [
      { term: "Fulfillment Center (FC)", definition: "Centro de distribución de Amazon. Ejemplos: PHX6, LAX9. Amazon asigna automáticamente." },
      { term: "Inbound Shipment", definition: "Envío de tu inventario hacia los almacenes de Amazon." },
    ],
    tips: [
      "Amazon asigna FC automáticamente al crear el shipment plan.",
      "Usa LTL (Less Than Truckload) para envíos > 150kg.",
      "Small Parcel es para cajas individuales < 23kg.",
      "El estado 'Receiving' significa que Amazon está recibiendo pero no ha contabilizado todo.",
    ],
  },

  // ===== RETURNS =====
  {
    id: "returns",
    title: "Returns",
    route: "/returns",
    description:
      "Gestión de devoluciones de clientes y reembolsos de Amazon. Tracking de motivos, montos y estados.",
    kpis: [
      { label: "Total Returns", description: "Cantidad de devoluciones" },
      { label: "Reembolsos Pagados", description: "Reembolsos ya procesados" },
      { label: "Pendientes", description: "Reembolsos en trámite" },
    ],
    tables: [
      {
        label: "Tab: Devoluciones",
        columns: [
          { name: "Producto", description: "Producto devuelto" },
          { name: "Motivo", description: "Razón de devolución" },
          { name: "Cantidad", description: "Unidades devueltas" },
          { name: "Reembolso", description: "Monto reembolsado" },
          { name: "Estado", description: "Estado del proceso" },
        ],
      },
      {
        label: "Tab: Reembolsos Amazon",
        columns: [
          { name: "Producto", description: "Producto afectado" },
          { name: "Tipo", description: "Tipo de reembolso" },
          { name: "Cantidad", description: "Unidades" },
          { name: "Monto", description: "Valor reclamado" },
          { name: "Estado", description: "Pendiente / Aprobado / Rechazado / Pagado" },
        ],
      },
    ],
    actions: [
      { label: "Registrar Devolución", description: "Formulario inline para nueva devolución" },
    ],
    glossary: [
      { term: "Motivos", definition: "Defectuoso, Dañado por transporte, No coincide descripción, Cliente cambió opinión, Producto incorrecto, Otro." },
      { term: "Reembolso Amazon", definition: "Reclamo a Amazon por inventario perdido/dañado en sus almacenes." },
    ],
    tips: [
      "Tasa de retorno > 5% indica problema de calidad o descripción engañosa.",
      "Motivo 'Defectuoso' requiere inspección de calidad con proveedor.",
      "Reembolsos Amazon: solicita dentro de 18 meses de la fecha del evento.",
      "Documenta fotos de productos dañados para reclamos.",
    ],
  },

  // ===== FINANZAS =====
  {
    id: "finances",
    title: "Finanzas",
    route: "/finances",
    description:
      "Control de flujo de caja: ingresos Amazon vs gastos del negocio. Resumen mensual y registro de gastos por categoría.",
    kpis: [
      { label: "Ingresos Amazon", description: "Total de payouts recibidos" },
      { label: "Gastos Totales", description: "Suma de todos los gastos registrados" },
      { label: "Net Profit", description: "Ingresos - Gastos" },
      { label: "Margen Neto", description: "(Net Profit / Ingresos) × 100" },
    ],
    tables: [
      {
        label: "Resumen Mensual",
        columns: [
          { name: "Mes", description: "Período mensual" },
          { name: "Ingresos", description: "Payouts de Amazon" },
          { name: "Gastos", description: "Gastos del mes" },
          { name: "Neto", description: "Ingresos - Gastos" },
        ],
      },
      {
        label: "Gastos Recientes",
        columns: [
          { name: "Fecha", description: "Fecha del gasto" },
          { name: "Categoría", description: "Tipo de gasto" },
          { name: "Descripción", description: "Detalle" },
          { name: "Proveedor", description: "A quién se pagó" },
          { name: "Monto", description: "Valor" },
        ],
      },
    ],
    actions: [
      { label: "Registrar Gasto", description: "Formulario inline para nuevo gasto" },
    ],
    glossary: [
      { term: "Categorías de Gasto", definition: "PPC, Software, VA Services, Muestras, Fotografía, Flete/Forwarder, Aduana, Prep Center, Almacén 3PL, Viajes, Otros." },
    ],
    tips: [
      "Registra gastos semanalmente para no perder track.",
      "Margen neto negativo = quemando capital. Reduce gastos o aumenta precios.",
      "Gastos de PPC deberían ser 8-15% de revenue para productos maduros.",
      "Revisa categoría 'Otros' mensualmente para identificar gastos no categorizados.",
    ],
  },

  // ===== ADS (PPC) =====
  {
    id: "ads",
    title: "PPC / Ads",
    route: "/ads",
    description:
      "Gestión básica de campañas publicitarias Amazon PPC. Registro de campañas, budgets y estados.",
    kpis: [
      { label: "Campañas", description: "Total de campañas registradas" },
      { label: "Budget Diario", description: "Suma de budgets diarios" },
      { label: "Activas", description: "Campañas en estado enabled" },
    ],
    tables: [
      {
        label: "Lista de Campañas",
        columns: [
          { name: "Nombre", description: "Nombre de la campaña" },
          { name: "Tipo", description: "SP Auto / SP Manual Keyword / SP Manual Product / SB / SD" },
          { name: "Status", description: "Enabled / Paused / Archived" },
          { name: "Budget/día", description: "Presupuesto diario" },
          { name: "Marketplace", description: "Amazon donde corre" },
        ],
      },
    ],
    actions: [
      { label: "Nueva Campaña", description: "Formulario inline para crear campaña" },
    ],
    glossary: [
      { term: "SP Auto", definition: "Sponsored Products automático. Amazon elige keywords." },
      { term: "SP Manual Keyword", definition: "Sponsored Products manual por keywords." },
      { term: "SP Manual Product", definition: "Sponsored Products manual por targeting de productos." },
      { term: "SB", definition: "Sponsored Brands. Aparece en header de búsqueda." },
      { term: "SD", definition: "Sponsored Display. Retargeting on/off Amazon." },
    ],
    tips: [
      "SP Auto es bueno para descubrir keywords. SP Manual para optimizar.",
      "Budget diario mínimo recomendado: $10-20 por campaña.",
      "ACOS objetivo: < 30% para productos nuevos, < 15% para maduros.",
      "Archive campañas con ACOS > 50% después de 2 semanas.",
    ],
  },

  // ===== RESEARCH =====
  {
    id: "research",
    title: "Research",
    route: "/research",
    description:
      "Pipeline de investigación de productos. Kanban y lista para gestionar ideas desde concepción hasta lanzamiento o rechazo.",
    tables: [
      {
        label: "Vista Kanban",
        columns: [
          { name: "Idea", description: "Nuevas ideas de productos" },
          { name: "Validando", description: "En proceso de validación" },
          { name: "Aprobado", description: "Aprobado para sourcing" },
          { name: "En Progreso", description: "En desarrollo/muestras" },
          { name: "Lanzado", description: "Ya en venta" },
          { name: "Rechazado", description: "Descartado" },
        ],
      },
      {
        label: "Vista Lista",
        columns: [
          { name: "Producto", description: "Nombre de la idea" },
          { name: "Categoría", description: "Categoría Amazon objetivo" },
          { name: "Precio Est.", description: "Precio de venta estimado" },
          { name: "ROI Est.", description: "ROI estimado" },
          { name: "Estado", description: "Estado en pipeline" },
          { name: "Prioridad", description: "P1 (alta) a P5 (baja)" },
        ],
      },
    ],
    actions: [
      { label: "Nueva Idea", description: "Modal para registrar nueva idea" },
      { label: "Cambiar Estado", description: "Mueve tarjeta entre columnas" },
      { label: "Eliminar", description: "Elimina idea del pipeline" },
    ],
    glossary: [
      { term: "Prioridad", definition: "P1 = Lanzar ASAP, P2 = Este mes, P3 = Este trimestre, P4 = Este año, P5 = Backlog." },
    ],
    tips: [
      "Mantén máximo 5 productos en 'Validando' para enfocar recursos.",
      "ROI estimado > 150% antes de mover a 'Aprobado'.",
      "Valida con muestras físicas antes de 'En Progreso'.",
      "Documenta por qué rechazaste una idea para no reconsiderarla.",
    ],
  },

  // ===== FORECASTING =====
  {
    id: "forecasting",
    title: "Forecasting",
    route: "/forecasting",
    description:
      "Sugerencias automáticas de reorden basadas en velocidad de ventas, lead time del proveedor y stock actual.",
    kpis: [
      { label: "Crítico", description: "Stock < lead time (se agotará antes de reorden)" },
      { label: "Advertencia", description: "Stock < 2× lead time" },
      { label: "Total Sugerencias", description: "Productos que necesitan reorden" },
    ],
    tables: [
      {
        label: "Sugerencias de Reorden",
        columns: [
          { name: "Producto", description: "Nombre del producto" },
          { name: "Stock", description: "Unidades disponibles" },
          { name: "Ventas/día", description: "Velocidad promedio" },
          { name: "Días stock", description: "Cuánto durará el stock" },
          { name: "Lead time", description: "Días de entrega proveedor" },
          { name: "Sugerido", description: "Cantidad recomendada para reorden" },
          { name: "Proveedor", description: "Proveedor principal" },
        ],
      },
    ],
    glossary: [
      { term: "Sugerido", definition: "Cantidad = MAX(MOQ, (Lead Time + 30 días buffer) × Ventas/día - Stock Actual). Asegura stock durante reorden + mes de seguridad." },
    ],
    tips: [
      "Prioriza productos 'Crítico' primero. Se agotarán antes de recibir reorden.",
      "Considera duplicar lead time en épocas altas (Q4, Chinese New Year).",
      "Sugerido incluye MOQ del proveedor. Si MOQ > sugerido, usa MOQ.",
      "Revisa forecasting semanalmente, no mensualmente.",
    ],
  },

  // ===== IMPORT =====
  {
    id: "import",
    title: "Importar",
    route: "/import",
    description:
      "Importación masiva de productos vía CSV/Excel. Valida headers, previsualiza datos y reporta errores antes de importar.",
    kpis: [
      { label: "Filas Totales", description: "Total de filas en archivo" },
      { label: "Válidas", description: "Filas sin errores" },
      { label: "Con Errores", description: "Filas con problemas de validación" },
    ],
    actions: [
      { label: "Descargar Plantilla", description: "Plantilla CSV con headers correctos" },
      { label: "Subir Archivo", description: "Drag & drop o click para seleccionar" },
      { label: "Analizar", description: "Valida estructura antes de importar" },
      { label: "Importar", description: "Importa productos válidos" },
    ],
    glossary: [
      { term: "Formatos Soportados", definition: ".xlsx, .csv, .tsv. Máximo 5MB, 500 filas." },
      { term: "Headers Requeridos", definition: "name, sku. Opcionales: asin, category, sale_price, unit_cost, weight_kg, fba_fee, etc." },
      { term: "Auto-mapping", definition: "Sistema intenta mapear headers en español/inglés automáticamente." },
    ],
    tips: [
      "Usa la plantilla descargable para evitar errores de formato.",
      "Prefiere CSV sobre Excel para evitar problemas de formato de celdas.",
      "Verifica que SKUs sean únicos antes de importar.",
      "Importa en lotes de 100-200 productos para mejor performance.",
    ],
  },

  // ===== AMAZON API =====
  {
    id: "sp-api",
    title: "Amazon API",
    route: "/sp-api",
    description:
      "Placeholder para futura integración con Amazon Selling Partner API (SP-API). Permitirá sincronización automática de ventas, inventario y fees.",
    tips: [
      "SP-API requiere cuenta Professional de Amazon Seller Central.",
      "Necesitas registrar una aplicación en Seller Central > Developer Central.",
      "Scopes requeridos: sellingPartnerAPI, reports, feeds, notifications.",
    ],
  },
];

// Mapeo de rutas a IDs de sección
export const ROUTE_TO_SECTION: Record<string, string> = {
  "/dashboard": "dashboard",
  "/products": "products",
  "/products/new": "product-form",
  "/products/[id]": "product-detail",
  "/products/[id]/edit": "product-form",
  "/suppliers": "suppliers",
  "/suppliers/new": "suppliers",
  "/suppliers/[id]": "supplier-detail",
  "/suppliers/[id]/edit": "supplier-detail",
  "/suppliers/compare": "supplier-compare",
  "/orders": "orders",
  "/orders/[id]": "order-detail",
  "/inventory": "inventory",
  "/sales": "sales",
  "/calculator": "calculator",
  "/settings": "settings",
  "/shipments": "shipments",
  "/returns": "returns",
  "/finances": "finances",
  "/ads": "ads",
  "/sp-api": "sp-api",
  "/research": "research",
  "/forecasting": "forecasting",
  "/import": "import",
};

export function getSectionIdFromPath(path: string): string {
  // Manejar rutas dinámicas
  const cleaned = path
    .replace(/\/[a-f0-9-]+$/i, "/[id]") // UUIDs
    .replace(/\/new$/, "/new")
    .replace(/\/edit$/, "/[id]/edit");

  return ROUTE_TO_SECTION[cleaned] || "dashboard";
}
