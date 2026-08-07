# GLOSARIO

Referencia completa de la app **Amazon FBA Manager**. Este documento se genera automáticamente desde `src/lib/help-content.ts`.

Para regenerarlo, ejecutá:

```bash
npm run build:glossary
```

## Contenido

- [Términos Globales](#términos-globales)
- [dashboard — Dashboard](#dashboard-dashboard)
- [products — Productos](#products-productos)
- [product-form — Crear / Editar Producto](#product-form-crear-editar-producto)
- [product-detail — Detalle de Producto](#product-detail-detalle-de-producto)
- [suppliers — Proveedores](#suppliers-proveedores)
- [supplier-detail — Detalle de Proveedor](#supplier-detail-detalle-de-proveedor)
- [supplier-compare — Comparar Proveedores](#supplier-compare-comparar-proveedores)
- [orders — Pedidos](#orders-pedidos)
- [order-detail — Detalle de Pedido](#order-detail-detalle-de-pedido)
- [inventory — Inventario](#inventory-inventario)
- [sales — Ventas](#sales-ventas)
- [calculator — Calculadora](#calculator-calculadora)
- [settings — Configuración](#settings-configuración)
- [shipments — Shipments](#shipments-shipments)
- [returns — Returns](#returns-returns)
- [finances — Finanzas](#finances-finanzas)
- [ads — PPC / Ads](#ads-ppc-ads)
- [research — Research](#research-research)
- [forecasting — Forecasting](#forecasting-forecasting)
- [import — Importar](#import-importar)
- [sp-api — Amazon API](#sp-api-amazon-api)
- [members — Miembros](#members-miembros)
- [member-form — Crear / Editar Miembro](#member-form-crear-editar-miembro)
- [member-detail — Detalle de Miembro](#member-detail-detalle-de-miembro)
- [tasks — Tareas](#tasks-tareas)
- [board-decisions — Decisiones Directivas](#board-decisions-decisiones-directivas)
- [drive — Google Drive](#drive-google-drive)
- [notifications — Notificaciones](#notifications-notificaciones)
- [global-search — Búsqueda Global](#global-search-búsqueda-global)
- [onboarding — Onboarding](#onboarding-onboarding)

## Términos Globales

| Término | Definición |
| --- | --- |
| ROI (Return on Investment) | Retorno de Inversión. Métrica que mide la rentabilidad de un producto como porcentaje. Fórmula: ((Ganancia Neta / Costo Total) × 100). Un ROI > 100% significa que duplicaste tu inversión. |
| Margen Neto | Porcentaje de ganancia sobre el precio de venta. Fórmula: ((Precio Venta - Costo Total) / Precio Venta) × 100. Diferente del ROI porque usa precio de venta como denominador, no costo. |
| Landed Cost | Costo total de producto puesto en almacén FBA. Incluye: costo de compra + envío internacional + aduana + prep center + flete local. Es el denominador para calcular ROI realista. |
| FBA Fee | Tarifa de Fulfillment by Amazon. Amazon cobra por almacenamiento, picking, packing, shipping al cliente final, y atención al cliente. Se calcula por peso y dimensiones del producto. |
| Referral Fee | Comisión de Amazon por cada venta. Generalmente 15% del precio de venta para la mayoría de categorías. Se calcula automáticamente sobre el precio de venta final. |
| TACOS (Total Advertising Cost of Sales) | Costo total de publicidad como porcentaje de ventas. Fórmula: (Gasto en PPC / Revenue Total) × 100. Ideal mantener < 10% para productos maduros, < 20% para lanzamientos. |
| MOQ (Minimum Order Quantity) | Cantidad mínima de pedido exigida por el proveedor. Es el volumen mínimo que debes comprar en una orden. Crítico para calcular capital inicial necesario. |
| Lead Time | Tiempo de entrega del proveedor desde confirmación de orden hasta recepción en almacén. Incluye producción + envío + aduana. Se mide en días. |
| Stockout | Fecha estimada en que se agota el stock basado en la velocidad de ventas actual. Fórmula: Stock Actual / Unidades Vendidas por Día. Crítico para planificar reordenes. |
| Días de Stock | Cuántos días durará el inventario actual a la velocidad de ventas actual. Fórmula: Stock Total / (Ventas últimos 30 días / 30). Recomendado mantener > 30 días como buffer. |
| Break-even | Punto de equilibrio: cantidad de unidades que debes vender para recuperar la inversión inicial. Fórmula: Costo Fijo Total / Ganancia por Unidad. Incluye costo del producto + envío + setup inicial. |
| ASIN (Amazon Standard Identification Number) | Identificador único de 10 caracteres que Amazon asigna a cada producto. Se usa para rastrear inventario, ventas y reviews. Formato: B00XXXXXXX. |
| SKU (Stock Keeping Unit) | Código interno de seguimiento de inventario que tú defines. Puede incluir variantes (color, tamaño). Ejemplo: PROD-BLU-L. Diferente del ASIN que es de Amazon. |
| Velocity (Velocidad de Ventas) | Unidades vendidas por día promedio. Se calcula sobre ventas de los últimos 30 días. Fórmula: Unidades Vendidas / 30. Usado para forecasting y reorden automático. |
| PPC (Pay Per Click) | Publicidad pagada en Amazon donde pagas cada vez que un cliente hace clic en tu anuncio. Incluye Sponsored Products, Sponsored Brands, y Sponsored Display. |
| Prep Center | Centro de preparación que recibe tu producto del proveedor, lo inspecciona, etiqueta con códigos FBA, y lo envía a los almacenes de Amazon. Costo adicional al landed cost. |
| Forwarder | Agente de carga/freight forwarder: intermediario que coordina el envío internacional. Maneja documentación aduanera, consolidación de carga, y trámites de importación. |
| Fulfillment Center (FC) | Centro de distribución de Amazon donde se almacena tu inventario FBA. Amazon asigna FCs automáticamente al crear shipments. Ejemplos: PHX6, LAX9, TPA1. |
| BSR (Best Sellers Rank) | Ranking de ventas de Amazon. Número que indica qué tan bien vende un producto en su categoría. Mientras más bajo, mejor (1 = más vendido). Se actualiza cada hora. |
| Reimbursement | Reembolso de Amazon por inventario perdido, dañado o destruido en sus almacenes. Amazon debe pagar el valor del inventario. Se solicita a través de casos en Seller Central. |
| Gobierno Corporativo (Governance) | Sistema de gestión de socios de la LLC: miembros, participaciones, albaceas, tareas, eventos de sucesión y decisiones directivas. Diseñado para cumplir con el Operating Agreement de Costtas Holding. |
| Miembro (Member) | Socio de la LLC con participación accionaria. Cada miembro tiene nombre, email, porcentaje de ownership, estado (activo/fallecido/retirado) y albacea asignado para planificación sucesoria. |
| Participación (Ownership) | Porcentaje del capital social de la LLC que posee un miembro. La suma de todas las participaciones debe ser 100%. Se usa para calcular distribución de ganancias y precio de transferencia en sucesión. |
| Albacea (Executor) | Persona designada por un miembro para gestionar su patrimonio en caso de fallecimiento. Crítico para el plan de sucesión. Debe tener nombre y email registrados en el sistema. |
| Tablero Kanban (Tasks) | Sistema de gestión de tareas con columnas Pendiente → En Progreso → Completada. Soporta drag & drop, prioridades (Baja/Alta/Urgente), asignación a miembros, fechas de vencimiento y módulos (Documentos, FBA, General). |
| Valuación (Art. 11.2) | Cálculo del valor de empresa para determinar precio de transferencia de participación. Fórmula: (Ingreso Neto Promedio 36 meses × Múltiplo 3x-5x) + Activos Netos Ajustados. Precio de Transferencia = Valor Empresa × (% Participación / 100). |
| DEC (Board Decision) | Decisión del Directorio. Documento formal que registra resoluciones directivas con estado (borrador/aprobado/rechazado/ejecutado), referencia a documento, votos y fecha de decisión. |
| Google Drive Integration | Módulo de almacenamiento cloud con OAuth2 por usuario. Permite navegar carpetas, subir/descargar/renombrar/eliminar archivos, editar texto inline, ver imágenes, y hacer backup automático de datos de la app a Drive. |
| OAuth2 (Drive) | Autenticación de Google mediante OAuth 2.0. Cada usuario conecta su propia cuenta de Google Drive. El refresh token se almacena en user_settings para acceso sin reconexión. |
| Backup Automático | Exportación de datos de la app (productos, ventas, pedidos, inventario, proveedores) a Google Drive como archivos .xlsx. Se almacenan en carpeta 'Backups' para resguardo periódico. |
| Notificaciones (Notifications) | Sistema de alertas in-app con prioridades (baja/media/alta/crítica). Notifica sobre stock bajo, tareas vencidas, eventos de sucesión y cambios en decisiones directivas. Indicador de notificaciones no leídas en el header. |
| Búsqueda Global (Cmd+K) | Paleta de comandos 'Command K' para búsqueda en toda la app. Accesible con Cmd+K (Mac) o Ctrl+K (Windows). Busca productos, proveedores, pedidos y módulos, con acceso directo a resultados y teclas de atajo. |
| Onboarding | Guía de inicio para nuevos usuarios. Checklist interactivo con pasos: crear perfil, configurar defaults, agregar primer producto, registrar proveedor, importar ventas. Se muestra automáticamente hasta completar todos los pasos. |
| Competition Level (Nivel de Competencia) | Nivel de competencia de un nicho en Amazon con 5 valores: very_low (muy baja, pocos sellers y alta oportunidad de entrada), low (baja), medium (media), high (alta) y very_high (muy alta, mercado saturado con sellers dominantes). Determina la dificultad de diferenciarse y el presupuesto publicitario necesario. |
| Niche Score | Puntaje compuesto que prioriza ideas de producto en Research combinando señales de rentabilidad, competencia, demanda y facilidad de diferenciación. Se usa para ordenar el pipeline: a mayor Niche Score, mayor oportunidad relativa del nicho. |
| Score / Score Details (Research) | Desglose del puntaje de una idea en Research. Muestra cómo se combinan competition_level, estimated_roi, average_rating, review_count_competitor, BSR y demanda mensual estimada para generar el Niche Score. Permite detectar qué factor penaliza o impulsa la oportunidad. |
| Listing Health Score | Indicador de la salud de un listing en Amazon. Evalúa cantidad y promedio de reviews, BSR, presencia de contenido (fotos, bullets, A+) y tendencia de ventas. Un score bajo sugiere optimizar el listing antes de esperar crecimiento orgánico. |
| Net Margin % (Margen Neto) | Margen neto porcentual sobre el precio de venta. Fórmula: ((Precio Venta - Costo Total) / Precio Venta) × 100. En Research se estima pre-lanzamiento para validar que el margen cubra fees de Amazon y costos de adquisición. |
| Capture Rate | Porcentaje del tráfico o de las impresiones de un listing que se convierte en venta. Fórmula: (Pedidos / Impresiones) × 100. En Research se usa para estimar qué porción de la demanda del nicho podés capturar frente a la competencia. |
| Unit Cost vs Landed Cost | Unit Cost es el precio por unidad que se paga al proveedor (FOB). Landed Cost es ese costo puesto en almacén FBA: unit cost + flete internacional + aduana + prep center + flete local. El ROI realista siempre se calcula sobre Landed Cost. |
| FBA Fee vs Referral Fee | Referral Fee es la comisión de Amazon por venta (típicamente 15% según categoría). FBA Fee es la tarifa de fulfillment por almacenamiento, picking, packing y envío al cliente según peso y dimensiones. Ambos se descuentan del revenue para obtener la ganancia neta. |
| Marketplace | Tienda de Amazon donde se vende el producto: US, MX, CA, UK, DE, FR, IT, ES. Cambia precio, moneda, tarifas, impuestos y nivel de competencia. |
| ASIN de Referencia (Research) | ASIN usado como modelo en Research para estimar demanda, precio, reviews y competencia del nicho antes de lanzar un producto propio. Debe ser representativo del producto que se planea vender. |
| Seller Count FBA (seller_count_fba) | Cantidad de sellers FBA que venden el ASIN/producto de referencia. A menor cantidad, menor competencia directa. Más de 10-20 sellers FBA suele indicar nicho saturado. |
| Review Count Competidor (review_count_competitor) | Cantidad de reviews del competidor o ASIN de referencia. Es una barrera de entrada: superar a competidores con miles de reviews exige presupuesto y tiempo de acumulación. |
| Average Rating (average_rating) | Rating promedio del listing en escala 1 a 5. Un valor menor a 4.0 indica problemas de calidad percibida; 4.5 o más es señal de producto validado por el mercado. |
| Monthly Revenue Estimado (estimated_monthly_revenue) | Ingreso mensual estimado del nicho. Fórmula: Unidades Mensuales Estimadas × Precio Promedio. Dimensiona el tamaño del mercado y la oportunidad. |
| Monthly Sales Estimado (estimated_monthly_sales) | Unidades mensuales estimadas que vende el ASIN de referencia. Base para dimensionar la demanda del nicho y proyectar el volumen propio. |
| Estimated FBA Fee | Tarifa FBA estimada por unidad según peso y dimensiones proyectadas. Se usa en Research para calcular la ganancia neta antes de tener datos reales del producto. |
| Estimated COGS (estimated_cogs) | Costo de mercadería vendida estimado por unidad (compra al proveedor). Excluye flete y fees. Input clave para estimar ROI en Research. |
| Estimated Selling Price (estimated_selling_price) | Precio de venta estimado del producto, normalmente alineado al precio promedio del nicho. Input clave para calcular ROI y margen proyectados. |
| Estimated ROI (estimated_roi) | ROI proyectado del producto calculado con precios y costos estimados. Fórmula: ((Ganancia Neta Estimada / Costo Total Estimado) × 100). En Research se recomienda mayor a 150% para avanzar a Aprobado. |
| Source / Fuente (Research) | Origen de la idea de producto en Research (ej. Jungle Scout, Helium 10, TikTok, competencia, marketplace). Permite rastrear dónde se descubrió cada oportunidad. |
| Amazon URL / Alibaba URL | Enlaces de referencia de la idea. Amazon URL apunta al listing/ASIN de referencia para validar demanda; Alibaba URL apunta al proveedor o cotización candidato para estimar costos. |

## dashboard — Dashboard

Ruta: [/dashboard](/dashboard)

### Descripción

Panel de control central que proporciona una visión global del negocio FBA. Muestra métricas clave de rendimiento, tendencias de ventas, alertas de inventario y productos top. Es el punto de entrada principal para monitorear la salud del negocio.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Revenue Mensual | Ingresos totales del mes en curso generados por ventas de todos los productos activos. | Suma de (Unidades Vendidas × Precio Venta) por producto |
| ROI Ponderado | Retorno de inversión promedio ponderado por volumen de ventas de todos los productos activos. | Suma de (ROI producto × Unidades vendidas) / Suma de Unidades vendidas |
| Unidades (mes) | Total de unidades vendidas en el mes actual. | Suma de Unidades vendidas últimos 30 días |
| Margen Neto | Margen promedio ponderado de todos los productos. Indica qué porcentaje del precio de venta es ganancia. | Suma de (Margen producto × Revenue) / Revenue Total |
| Alertas Stock | Conteo de productos con problemas de inventario: sin stock, stock bajo, o sobrestock. |  |
| Valor Inventario | Valor total del inventario actual basado en costo de compra. | Suma de (Stock Actual × Costo Unitario) |

### Acciones

| Acción | Descripción |
| --- | --- |
| Exportar a Excel | Genera archivo .xlsx con el resumen completo del dashboard: KPIs, alertas y top productos. |

### Tablas

#### Top 5 por Rentabilidad

| Columna | Descripción |
| --- | --- |
| # | Ranking posición |
| Producto | Nombre del producto con SKU |
| Unidades | Unidades vendidas en el período |
| Revenue | Ingresos generados |
| ROI | Retorno de inversión del producto |
| Estado | Estado del producto (activo/pausado/sin stock) |

#### Alertas de Inventario

| Columna | Descripción |
| --- | --- |
| Producto | Nombre y SKU del producto |
| Tipo | Sin Stock / Stock Bajo / Sobrestock |
| Stock | Unidades disponibles |
| Reorden | Nivel mínimo definido para reorden |
| Acción | Link para gestionar el producto |

### Tips

- Revisa el Dashboard diariamente por la mañana para identificar alertas de stock críticas.
- Un ROI Ponderado > 100% indica negocio saludable. Si cae < 50%, revisa costos o precios.
- Las alertas de stock se calculan automáticamente comparando stock actual vs nivel mínimo definido.
- El Margen Neto ideal para productos FBA es 25-40% después de todas las tarifas.

## products — Productos

Ruta: [/products](/products)

### Descripción

Catálogo completo de productos gestionados en el negocio FBA. Cada producto contiene información de costos, precios, tarifas Amazon, inventario, y proveedores vinculados. Es el módulo central para el análisis de rentabilidad.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Total Productos | Cantidad total de productos registrados en el sistema. |  |
| ROI Promedio | ROI medio de todos los productos activos. |  |
| Ganancia Total | Suma de ganancias netas de todos los productos. | Suma de (Unidades × (Precio Venta - Costo Total)) |
| Precio Promedio | Precio de venta promedio ponderado. |  |

### Filtros

| Filtro | Descripción |
| --- | --- |
| Búsqueda | Filtra por nombre, SKU o ASIN. Búsqueda insensible a mayúsculas. |
| Estado | Activo, Pausado, Sin Stock. |
| Categoría | Filtra por categoría Amazon registrada. |
| Marketplace | Amazon.com, Amazon.ca, Amazon.mx, etc. |
| Precio de Venta | Rango mínimo/máximo de precio. |
| ROI | Rango mínimo/máximo de retorno de inversión. |

### Acciones

| Acción | Descripción |
| --- | --- |
| Nuevo Producto | Abre modal para crear producto con calculadora en vivo. |
| Exportar Excel | Exporta productos filtrados a Excel. |
| Filtros Avanzados | Panel expandible con múltiples filtros y ordenamiento. |

### Tablas

#### Lista de Productos

| Columna | Descripción |
| --- | --- |
| Producto | Nombre + SKU + ASIN |
| Categoría | Categoría Amazon |
| Precio/Costo | Precio venta vs costo unitario |
| Ganancia | Ganancia neta por unidad |
| ROI | Retorno de inversión |
| Stock | Unidades disponibles |
| Estado | Badge de estado |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Status | Activo = visible en listings, Pausado = temporalmente detenido, Sin Stock = sin inventario disponible. |

### Tips

- Haz clic en cualquier fila para ver el detalle completo del producto.
- Usa los filtros de ROI para identificar productos que necesitan ajuste de precio.
- El color del ROI indica: verde (>100%), amarillo (50-100%), rojo (<50%).
- Productos con ROI < 30% deben revisarse inmediatamente: subir precio o negociar costo.

## product-form — Crear / Editar Producto

Ruta: [/products/new](/products/new)

### Descripción

Formulario completo para registrar un nuevo producto o editar uno existente. Incluye calculadora de rentabilidad en tiempo real que actualiza ROI, margen y ganancia a medida que ingresas datos.

### Formularios

#### Información Básica

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre | Nombre comercial del producto | Sí |
| ASIN | Identificador Amazon de 10 caracteres | No |
| SKU | Código interno de seguimiento | No |
| Categoría | Categoría Amazon para cálculo de referral fee | Sí |
| Marketplace | Amazon.com / .ca / .mx / .uk / .de | Sí |
| Estado | Activo / Pausado / Sin Stock | Sí |
| Peso (kg) | Peso en kilogramos para cálculo FBA fee | Sí |

#### Costos y Precios

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Costo Unitario | Costo de compra al proveedor por unidad | Sí |
| Precio Venta | Precio de venta en Amazon | Sí |
| Tarifa FBA | Tarifa Amazon FBA (auto-calculada por peso) | No |
| Tarifa Referral | Comisión Amazon (auto-calculada por categoría) | No |
| Costo Envío | Costo de envío por unidad al almacén FBA | No |
| Costo Almacenamiento | Costo mensual de almacenamiento por unidad | No |
| Costo Prep | Costo de preparación (etiquetado, embalaje) | No |
| Impuestos | Porcentaje de impuestos aplicables | No |
| Otros Costos | Fotografía, diseño, inspección, etc. | No |

#### Proveedor Vinculado

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Proveedor | Proveedor seleccionado de la base | No |
| Costo Unitario (prov.) | Costo específico con este proveedor | No |
| MOQ | Cantidad mínima de orden con este proveedor | No |
| Lead Time | Días de entrega del proveedor | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| FeeCalculatorInline | Componente que calcula en tiempo real: Ganancia Neta = Precio Venta - (Costo Compra + FBA Fee + Referral Fee + Envío + Almacenamiento + Prep + Impuestos + Otros). ROI = (Ganancia Neta / Costo Total) × 100. |

### Tips

- La Tarifa FBA se calcula automáticamente según el peso ingresado usando las tarifas vigentes de Amazon.
- La Tarifa Referral se calcula según la categoría seleccionada (generalmente 15%).
- Si ya tienes settings configurados en /settings, los valores por defecto se cargan automáticamente.
- El Break-even se calcula automáticamente: Costo Total / Ganancia por Unidad.
- Guarda un producto con ROI > 100% para asegurar rentabilidad saludable.

## product-detail — Detalle de Producto

Ruta: [/products/[id]](/products/[id])

### Descripción

Vista detallada de un producto específico. Muestra desglose completo de costos, estado de inventario, proveedores vinculados, y timeline de movimientos.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Precio Venta | Precio actual de venta en Amazon |  |
| Costo Compra | Costo unitario de compra al proveedor |  |
| ROI | Retorno de inversión actual |  |
| Margen | Margen neto actual |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Editar | Abre formulario de edición en modal |
| Eliminar | Elimina permanentemente el producto con confirmación |

### Tablas

#### Desglose de Costos

| Columna | Descripción |
| --- | --- |
| Concepto | Tipo de costo |
| Monto | Valor en moneda base |
| % del Total | Porcentaje sobre costo total |

#### Proveedores Vinculados

| Columna | Descripción |
| --- | --- |
| Proveedor | Nombre del proveedor |
| País | País de origen |
| Rating | Calificación 1-5 estrellas |
| Costo Unit. | Costo con este proveedor |
| MOQ | Cantidad mínima |
| Lead Time | Días de entrega |
| Principal | Proveedor principal (estrella) |

### Tips

- Compara costos entre proveedores para negociar mejores precios.
- Si un proveedor tiene mejor costo pero mayor MOQ, calcula si el ahorro unitario compensa el capital extra.
- Revisa el desglose de costos mensualmente para identificar aumentos en tarifas FBA.

## suppliers — Proveedores

Ruta: [/suppliers](/suppliers)

### Descripción

Directorio completo de proveedores con información de contacto, condiciones comerciales, cotizaciones y productos vinculados. Permite comparar proveedores y gestionar relaciones comerciales.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Total | Cantidad total de proveedores registrados |  |
| Activos | Proveedores con estado activo |  |
| Países | Número de países diferentes |  |
| Rating Prom. | Calificación promedio ponderada |  |

### Filtros

| Filtro | Descripción |
| --- | --- |
| Búsqueda | Por nombre, contacto o país |
| Estado | Activo / Inactivo |
| País | Filtra por país de origen |
| Rating | Rango de calificación 1-5 |
| MOQ | Rango de cantidad mínima |
| Lead Time | Rango de días de entrega |

### Acciones

| Acción | Descripción |
| --- | --- |
| Nuevo Proveedor | Modal para registrar proveedor |
| Exportar Excel | Exporta proveedores filtrados |

### Tablas

#### Lista de Proveedores

| Columna | Descripción |
| --- | --- |
| Proveedor | Nombre comercial |
| País | País de origen |
| Rating | Estrellas 1-5 |
| MOQ | Cantidad mínima de orden |
| Lead Time | Días promedio de entrega |
| Estado | Activo / Inactivo |
| Link | URL a Alibaba o web |

### Formularios

#### Datos del Proveedor

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre | Nombre comercial del proveedor | Sí |
| Alibaba URL | Enlace al perfil en Alibaba o web del proveedor | No |
| País | País de origen | No |
| Estado | active / inactive | No |

#### Contacto

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre de Contacto | Persona de contacto | No |
| Email | Correo de contacto | No |
| WhatsApp | Número de WhatsApp | No |

#### Condiciones Comerciales

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Rating | Calificación 1-5 estrellas | No |
| Términos de Pago | Ej: 30/70, 50/50, T/T | No |
| MOQ | Cantidad mínima de orden | No |
| Lead Time (días) | Días de producción + envío | No |

#### Notas

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Notas | Observaciones sobre el proveedor | No |

### Tips

- Mantén al menos 2 proveedores por producto para mitigar riesgos de producción.
- Un rating < 3 estrellas requiere revisión: inspecciones más frecuentes o búsqueda de alternativas.
- El lead time incluye producción + envío. Pregunta desglose al proveedor.
- MOQ negociable: muchos proveedores bajan MOQ en reordenes si hay buena relación.

## supplier-detail — Detalle de Proveedor

Ruta: [/suppliers/[id]](/suppliers/[id])

### Descripción

Vista detallada de un proveedor con pestañas para información general, cotizaciones, productos vinculados y pedidos.

### Acciones

| Acción | Descripción |
| --- | --- |
| Nueva Cotización | Crea cotización para este proveedor |
| Editar | Edita datos del proveedor |
| Eliminar | Elimina proveedor con confirmación |

### Tablas

#### Tab: Información

| Columna | Descripción |
| --- | --- |
| Rating | Calificación 1-5 |
| País | País de origen |
| MOQ | Cantidad mínima |
| Lead Time | Días de entrega |
| Términos de Pago | 30/70, 50/50, etc. |

#### Tab: Cotizaciones

| Columna | Descripción |
| --- | --- |
| Producto | Producto cotizado |
| Cantidad | Volumen de la cotización |
| Precio Unit. | Precio por unidad |
| Total | Cantidad × Precio Unitario |
| Envío | Costo de envío incluido |
| Estado | Vigente / Expirada / Aceptada |

#### Tab: Productos

| Columna | Descripción |
| --- | --- |
| Producto | Nombre del producto |
| SKU | Código interno |
| Costo Unit. | Costo con este proveedor |
| MOQ | MOQ específico |
| Estado | Activo / Inactivo |
| Principal | Proveedor principal (estrella) |

### Tips

- Cotizaciones vigentes por 30 días. Renueva antes de hacer pedido.
- Compara cotizaciones de múltiples proveedores en /suppliers/compare.
- Marca un proveedor como 'Principal' para que aparezca por defecto en órdenes de compra.

## supplier-compare — Comparar Proveedores

Ruta: [/suppliers/compare](/suppliers/compare)

### Descripción

Herramienta de comparación lado-a-lado de hasta 4 proveedores. Calcula costo total estimado incluyendo producto, envío y MOQ para una cantidad deseada.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Costo Total Estimado | Por proveedor seleccionado |  |
| Precio Unitario | Incluyendo envío y proporcionalidades |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Seleccionar Proveedores | Dropdown multi-select (máx 4) |
| Cantidad a Importar | Input numérico para calcular totales |

### Tablas

#### Comparativa Detallada

| Columna | Descripción |
| --- | --- |
| Métrica | Precio Unitario / Costo Producto / Envío / Total / MOQ / Lead Time / Rating |
| Proveedor 1-4 | Valor por cada proveedor seleccionado |

### Tips

- El proveedor 'recomendado' (verde) es el de menor costo total para la cantidad indicada.
- Considera no solo precio sino también lead time y rating en la decisión final.
- MOQ bajo con precio alto puede ser mejor para testeo inicial.
- MOQ alto con precio bajo es ideal para reordenes establecidos.

## orders — Pedidos

Ruta: [/orders](/orders)

### Descripción

Sistema de gestión de órdenes de compra (Purchase Orders) con tracking visual del estado. Permite seguir el flujo completo desde borrador hasta entrega, incluyendo pagos y logística.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Órdenes Activas | Pedidos no entregados ni cancelados |  |
| Valor Total | Suma de todos los pedidos registrados |  |
| En Tránsito | Pedidos en estado 'in_transit' |  |
| Próxima Llegada | Fecha de llegada estimada más cercana |  |

### Filtros

| Filtro | Descripción |
| --- | --- |
| Búsqueda | Por PO, proveedor o producto |
| Estado | Todos los estados del flujo |

### Acciones

| Acción | Descripción |
| --- | --- |
| Nueva Orden | Modal para crear orden de compra |

### Tablas

#### Lista de Órdenes

| Columna | Descripción |
| --- | --- |
| PO / Proveedor | Número PO y nombre proveedor |
| Producto | Producto ordenado |
| Cantidad | Unidades pedidas |
| Total | Costo total de la orden |
| Estado | Badge de estado actual |
| Progreso | Timeline visual del flujo |
| Llegada Est. | Fecha estimada de llegada |

### Formularios

#### Información General

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Proveedor | Proveedor de la orden | No |
| Producto | Producto a ordenar | No |
| N° PO | Número de orden de compra (autogenerado o manual) | No |
| Cantidad | Unidades a pedir | Sí |
| Costo Unitario | Precio por unidad acordado | Sí |
| Total | Cantidad × Costo Unitario (se calcula automáticamente) | No |
| Moneda | USD / CNY / ARS | No |
| Tipo de Cambio | Tipo de cambio aplicado (default 1) | No |
| Estado | draft / sent / confirmed / in_production / shipped / in_transit / customs / delivered / cancelled | No |
| Fecha de Orden | Fecha de emisión de la orden | No |

#### Producción y Logística

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Deadline Producción | Fecha límite de producción | No |
| Método de Envío | air / sea / express | No |
| Costo de Envío | Flete internacional | No |
| Forwarder | Agente de carga responsable | No |
| Tracking | Número de seguimiento del envío | No |
| Costo Aduana | Costos aduaneros del envío | No |
| Prep Center Cost | Costo de preparación | No |
| Amazon Shipment ID | ID del shipment creado en Amazon | No |
| Fecha Envío | Fecha en que se embarcó | No |
| Llegada Estimada | Fecha estimada de llegada | No |

#### Pagos

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Depósito | Pago inicial (generalmente 30%) | No |
| Fecha Depósito | Fecha del pago inicial | No |
| Balance | Pago final (generalmente 70%) | No |
| Fecha Balance | Fecha del pago final | No |

#### Notas

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Notas | Notas internas de la orden | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Flujo de Estados | Borrador → Enviado → Confirmado → Producción → Embarcado → En Tránsito → Aduana → Entregado. Cancelado es terminal. |
| PO (Purchase Order) | Número de orden de compra. Puede ser autogenerado o manual. |
| Depósito / Balance | Depósito es el pago inicial (generalmente 30%) y Balance el pago final (generalmente 70%). Total Pagado = Depósito + Balance. |

### Tips

- Actualiza el estado cada vez que el proveedor confirme un cambio.
- Registra tracking number tan pronto como el forwarder lo proporcione.
- El timeline visual muestra progreso automáticamente basado en estado.
- Registra pagos (depósito + balance) para controlar flujo de caja.

## order-detail — Detalle de Pedido

Ruta: [/orders/[id]](/orders/[id])

### Descripción

Vista completa de una orden de compra individual. Incluye timeline visual, información general, logística, fechas, costos landed y pagos.

### Tablas

#### Información General

| Columna | Descripción |
| --- | --- |
| Producto | Producto ordenado |
| SKU | Código interno |
| Cantidad | Unidades pedidas |
| Costo Unitario | Precio por unidad acordado |
| Total Producto | Cantidad × Costo Unitario |
| Moneda | USD / CNY / ARS |
| Tipo de Cambio | Tipo de cambio aplicado |

#### Envío y Logística

| Columna | Descripción |
| --- | --- |
| Método | Aire / Marítimo / Express |
| Costo Envío | Flete internacional |
| Forwarder | Agente de carga |
| Tracking | Número de seguimiento |
| Aduana | Costos aduaneros |
| Prep Center | Costo de preparación |
| Amazon Shipment | ID de envío a Amazon |

#### Pagos

| Columna | Descripción |
| --- | --- |
| Depósito | Pago inicial (generalmente 30%) |
| Balance | Pago final (generalmente 70%) |
| Total Pagado | Depósito + Balance |
| Pendiente | Costo Landed - Total Pagado |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Landed Cost | Costo total del pedido incluyendo: producto + envío + aduana + prep center. Es lo que realmente te cuesta tener el producto listo para vender. |

### Tips

- El costo landed debe actualizarse con datos reales a medida que avanza el pedido.
- Registra fechas reales (no estimadas) cuando ocurran para mejorar forecasting futuro.
- Si hay demoras en aduana, documenta para negociar mejores tiempos con forwarder.

## inventory — Inventario

Ruta: [/inventory](/inventory)

### Descripción

Control de niveles de stock con proyecciones de agotamiento y alertas automáticas. Integra stock en almacén FBA, en tránsito y en warehouse propio.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Total Unidades | Suma de todas las unidades en todos los estados |  |
| Stock Bajo | Productos por debajo del nivel mínimo |  |
| Sin Stock | Productos con 0 unidades disponibles |  |
| Exceso Stock | Productos con stock excesivamente alto |  |

### Filtros

| Filtro | Descripción |
| --- | --- |
| Búsqueda | Por SKU o nombre |
| Estado de Stock | Normal / Bajo / Sin Stock / Exceso |
| Unidades Disponibles | Rango numérico |

### Acciones

| Acción | Descripción |
| --- | --- |
| Exportar Excel | Exporta el inventario actual a Excel |
| Actualizar | Refresca los datos de inventario desde el servidor |

### Tablas

#### Lista de Inventario

| Columna | Descripción |
| --- | --- |
| SKU | Código de producto |
| Producto | Nombre comercial |
| Disponible | Stock en FBA disponible para venta |
| En Tránsito | Unidades enviadas a Amazon no recibidas aún |
| Warehouse | Stock en almacén propio o prep center |
| Total | Disponible + En Tránsito + Warehouse |
| Días Stock | Cuántos días durará el inventario actual |
| Stockout | Fecha estimada de agotamiento |
| Estado | Badge de estado |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Stockout | Fecha calculada en que se agotará el stock. Fórmula: Fecha Actual + (Stock Disponible / Velocidad de Ventas Diaria). |
| Días de Stock | Stock Total / (Ventas últimos 30 días / 30). Recomendado mantener 45-60 días de stock como buffer. |
| Exceso Stock | Stock > 120 días de ventas. Genera costos de almacenamiento elevados y riesgo de obsolescencia. |
| Movimientos de Stock | Eventos que modifican inventario: inbound_shipment, received_at_amazon, sale, return, removal, adjustment, damaged, transfer_to_warehouse. Cada uno afecta el stock disponible o en tránsito. |

### Tips

- Días de stock < 15 = CRÍTICO. Ordena inmediatamente.
- Días de stock 15-30 = ADVERTENCIA. Planifica reorden.
- Días de stock 30-60 = ÓPTIMO. Nivel saludable.
- Días de stock > 120 = EXCESO. Considera promociones o pausar reordenes.
- El stockout se calcula sobre stock DISPONIBLE, no total. Considera el en tránsito.

## sales — Ventas

Ruta: [/sales](/sales)

### Descripción

Registro histórico de ventas con análisis de tendencias, importación CSV, exportación PDF y gráficos de revenue/profit.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Revenue Total | Suma de todos los ingresos por ventas |  |
| Profit Total | Suma de todas las ganancias netas |  |
| Unidades | Total de unidades vendidas |  |
| Fees Amazon | Total de tarifas Amazon pagadas |  |

### Filtros

| Filtro | Descripción |
| --- | --- |
| Rango de Fechas | Fecha inicio y fin |
| Revenue | Rango mínimo/máximo |
| Profit | Rango mínimo/máximo |

### Acciones

| Acción | Descripción |
| --- | --- |
| Registrar Venta | Modal para registrar venta manual |
| Importar CSV | Importa archivo CSV con ventas |
| Reporte PDF | Genera reporte PDF con resumen mensual |
| Exportar Excel | Exporta ventas a Excel |

### Tablas

#### Lista de Ventas

| Columna | Descripción |
| --- | --- |
| Fecha | Fecha de la venta |
| Producto | Nombre del producto vendido |
| Unidades | Cantidad vendida |
| Revenue | Ingresos brutos |
| Fees | Tarifas Amazon (FBA + referral) |
| Profit | Ganancia neta |

### Formularios

#### Registrar Venta

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Producto | Producto vendido | Sí |
| Fecha | Fecha de la venta | Sí |
| Unidades | Cantidad vendida | Sí |
| Revenue | Ingresos brutos de la venta | Sí |
| Fees Amazon | Tarifas Amazon (FBA + referral). Se calculan si no se ingresan | No |
| Order ID | ID de orden de Amazon de referencia | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| CSV Import | Formato requerido: date, sku, units. Opcional: revenue, fees. Máximo 500 filas, 5MB. |
| Fees Amazon | Suma de FBA fee + referral fee por cada venta. Se calcula automáticamente si no se proporciona. |

### Tips

- Importa ventas semanalmente para mantener forecasting actualizado.
- El gráfico de tendencia muestra revenue y profit acumulado por día.
- Profit negativo indica producto con problemas: revisa precio o costos.
- Fees Amazon deberían ser ~20-25% del revenue para productos estándar.

## calculator — Calculadora

Ruta: [/calculator](/calculator)

### Descripción

Calculadora de rentabilidad FBA con análisis de escenarios. Permite simular diferentes condiciones (pesimista, realista, optimista) y calcula métricas clave en tiempo real.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Ganancia Neta | Ganancia por unidad después de todos los costos |  |
| ROI | Retorno de inversión |  |
| Margen | Margen neto sobre precio de venta |  |
| Landed | Costo landed por unidad |  |
| Break-even | Unidades para recuperar inversión |  |
| TACOS | Advertising cost of sales |  |
| Units/mes PPC | Unidades necesarias para cubrir gasto PPC |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Guardar Análisis | Guarda escenario para referencia futura |
| Configuración | Ajusta defaults: ROI objetivo, categoría, método envío |

### Formularios

#### Inputs

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Precio Venta | Precio de venta en Amazon | Sí |
| Costo | Costo de compra por unidad | Sí |
| Cantidad | Volumen de importación | Sí |
| Peso | Peso en kg para FBA fee | Sí |
| Flete/kg | Costo de flete por kilogramo | Sí |
| Prep | Costo de preparación por unidad | No |
| Fotos | Costo de fotografía amortizado | No |
| PPC | Gasto mensual en publicidad | No |
| Otros | Otros costos variables | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Escenario Pesimista | -15% precio, -40% volumen. Simula condiciones adversas. |
| Escenario Realista | Valores actuales ingresados. |
| Escenario Optimista | +15% precio, +40% volumen. Simula mejor caso. |
| Viable | ROI > 50% en escenario pesimista. |
| Revisar | ROI < 50% o margen negativo. Producto no rentable. |

### Tips

- Si escenario pesimista es 'Viable', el producto es seguro para invertir.
- Si escenario realista es 'Revisar', no inviertas hasta optimizar costos.
- TACOS ideal < 10% para productos maduros, < 20% para lanzamientos.
- Break-even > cantidad importada = no recuperarás inversión en primer lote.
- Usa flete marítimo ($1.2/kg) para volúmenes > 500kg, aéreo ($6.5/kg) para < 100kg.

## settings — Configuración

Ruta: [/settings](/settings)

### Descripción

Centro de configuración del usuario. Gestiona perfil, valores por defecto FBA, parámetros de cálculo, exportación/importación de datos y preferencias.

### Acciones

| Acción | Descripción |
| --- | --- |
| Guardar Perfil | Guarda cambios de perfil |
| Guardar FBA Defaults | Guarda defaults |
| Guardar Cálculos | Guarda parámetros |
| Exportar | Exporta datos a CSV |
| Importar | Navega a /import |

### Formularios

#### Perfil

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre Completo | Nombre del usuario | No |
| Empresa | Nombre de la empresa FBA | No |
| País | País de operación fiscal | No |

#### FBA Defaults

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Marketplace | Marketplace principal | No |
| FBA Fee Default | Tarifa FBA por defecto | No |
| Referral Fee Default | Comisión por defecto (%) | No |
| Shipping Cost Default | Envío por defecto | No |
| Storage Cost Default | Almacenamiento por defecto | No |

#### Cálculos

| Campo | Descripción | Requerido |
| --- | --- | --- |
| ROI Objetivo | ROI mínimo deseado (%) | No |
| Moneda | USD / CNY / ARS | No |
| Tax Rate | Tasa impositiva (%) | No |

### Tips

- Configura FBA Defaults para que nuevos productos carguen valores automáticamente.
- ROI objetivo de 100% es conservador. 150% es agresivo.
- Exporta backups mensuales de todos los módulos.
- Tax rate varía por país: USA ~0-10% (estatal), UK 20% VAT, Europa 19-27% VAT.

## shipments — Shipments

Ruta: [/shipments](/shipments)

### Descripción

Tracking de envíos FBA inbound. Gestiona creación de shipments, asignación de fulfillment centers, y seguimiento de estados.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| En Preparación | Shipments en estado working |  |
| Enviado | Shipments enviados a Amazon |  |
| En Tránsito | Shipments en tránsito |  |
| Entregado | Shipments recibidos por Amazon |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Nuevo Shipment | Modal para crear shipment |

### Tablas

#### Lista de Shipments

| Columna | Descripción |
| --- | --- |
| Nombre | Nombre descriptivo del shipment |
| Estado | Estado actual del envío |
| Destino (FC) | Fulfillment Center destino |
| Unidades | Total de unidades |
| ETA | Fecha estimada de llegada |

### Formularios

#### Datos del Shipment

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre | Nombre descriptivo del shipment | Sí |
| N° PO Vinculado | Orden de compra asociada | No |
| Shipment ID | ID interno del shipment | No |
| Amazon Reference ID | ID de referencia de Amazon | No |
| FC Destino | Fulfillment Center de destino (ej. PHX6) | No |
| Dirección Destino | Dirección del centro de distribución | No |
| Estado | working / ready_to_ship / shipped / in_transit / delivered / checked_in / receiving / closed / cancelled | No |

#### Logística

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Método de Envío | small_parcel / ltl / ftl / air / sea | No |
| Carrier | Transportista | No |
| Tracking | Número de seguimiento | No |
| Cantidad de Cajas | Número de cajas del envío | No |
| Total Unidades | Unidades totales del shipment | No |
| Peso Total (kg) | Peso total del envío | No |
| Costo Envío | Costo del flete | No |

#### Fechas

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Fecha Envío | Fecha en que salió el envío | No |
| Llegada Estimada (ETA) | Fecha estimada de llegada a FC | No |
| Llegada Real | Fecha real de entrega | No |

#### Notas

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Notas | Notas internas del shipment | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Fulfillment Center (FC) | Centro de distribución de Amazon. Ejemplos: PHX6, LAX9. Amazon asigna automáticamente. |
| Inbound Shipment | Envío de tu inventario hacia los almacenes de Amazon. |

### Tips

- Amazon asigna FC automáticamente al crear el shipment plan.
- Usa LTL (Less Than Truckload) para envíos > 150kg.
- Small Parcel es para cajas individuales < 23kg.
- El estado 'Receiving' significa que Amazon está recibiendo pero no ha contabilizado todo.

## returns — Returns

Ruta: [/returns](/returns)

### Descripción

Gestión de devoluciones de clientes y reembolsos de Amazon. Tracking de motivos, montos y estados.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Total Returns | Cantidad de devoluciones |  |
| Reembolsos Pagados | Reembolsos ya procesados |  |
| Pendientes | Reembolsos en trámite |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Registrar Devolución | Formulario inline para nueva devolución |

### Tablas

#### Tab: Devoluciones

| Columna | Descripción |
| --- | --- |
| Producto | Producto devuelto |
| Motivo | Razón de devolución |
| Cantidad | Unidades devueltas |
| Reembolso | Monto reembolsado |
| Estado | Estado del proceso |

#### Tab: Reembolsos Amazon

| Columna | Descripción |
| --- | --- |
| Producto | Producto afectado |
| Tipo | Tipo de reembolso |
| Cantidad | Unidades |
| Monto | Valor reclamado |
| Estado | Pendiente / Aprobado / Rechazado / Pagado |

### Formularios

#### Registrar Devolución

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Producto | Producto devuelto | Sí |
| Order ID | Orden de Amazon asociada | No |
| Amazon Return ID | ID de devolución de Amazon | No |
| Cantidad | Unidades devueltas | Sí |
| Motivo | defective / damaged_by_carrier / no_longer_wanted / not_as_described / other, entre otros | Sí |
| Comentario del Cliente | Comentario del cliente | No |
| Monto Reembolso | Monto reembolsado al cliente | No |
| Estado | requested / in_transit / received_at_fc / inspected / refunded / reimbursed / disposed | No |
| Disposición | sellable / unsellable / pending | No |
| Fecha | Fecha de la devolución | Sí |
| Notas | Notas internas | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Motivos | Defectuoso, Dañado por transporte, No coincide descripción, Cliente cambió opinión, Producto incorrecto, Otro. |
| Reembolso Amazon | Reclamo a Amazon por inventario perdido/dañado en sus almacenes. |

### Tips

- Tasa de retorno > 5% indica problema de calidad o descripción engañosa.
- Motivo 'Defectuoso' requiere inspección de calidad con proveedor.
- Reembolsos Amazon: solicita dentro de 18 meses de la fecha del evento.
- Documenta fotos de productos dañados para reclamos.

## finances — Finanzas

Ruta: [/finances](/finances)

### Descripción

Control de flujo de caja: ingresos Amazon vs gastos del negocio. Resumen mensual y registro de gastos por categoría.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Ingresos Amazon | Total de payouts recibidos |  |
| Gastos Totales | Suma de todos los gastos registrados |  |
| Net Profit | Ingresos - Gastos |  |
| Margen Neto | (Net Profit / Ingresos) × 100 |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Registrar Gasto | Formulario inline para nuevo gasto |

### Tablas

#### Resumen Mensual

| Columna | Descripción |
| --- | --- |
| Mes | Período mensual |
| Ingresos | Payouts de Amazon |
| Gastos | Gastos del mes |
| Neto | Ingresos - Gastos |

#### Gastos Recientes

| Columna | Descripción |
| --- | --- |
| Fecha | Fecha del gasto |
| Categoría | Tipo de gasto |
| Descripción | Detalle |
| Proveedor | A quién se pagó |
| Monto | Valor |

### Formularios

#### Registrar Payout (Ingreso Amazon)

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Período Inicio | Inicio del período de pago | Sí |
| Período Fin | Fin del período de pago | Sí |
| Monto | Monto del payout recibido | Sí |
| Moneda | USD / ARS / EUR, etc. | No |
| Estado | pending / transferred / failed | No |
| Referencia Amazon | Referencia del pago en Amazon | No |
| Últimos 4 del Banco | Últimos 4 dígitos de la cuenta receptora | No |
| Fecha Transferencia | Fecha en que se acreditó | No |
| Marketplace | Marketplace origen del pago | No |

#### Registrar Gasto

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Categoría | ppc / software / va_services / samples / photography / shipping_forwarder / customs / prep_center / storage_3pl / travel / other | Sí |
| Subcategoría | Detalle adicional de la categoría | No |
| Descripción | Descripción del gasto | Sí |
| Monto | Valor del gasto | Sí |
| Moneda | USD / CNY / ARS, etc. | No |
| Tipo de Cambio | Tipo de cambio aplicado (default 1) | No |
| Fecha | Fecha del gasto | No |
| Recurrente | Indica si el gasto se repite | No |
| Frecuencia | weekly / monthly / quarterly / yearly | No |
| Proveedor / Vendor | A quién se pagó | No |
| Producto | Producto asociado (opcional) | No |
| Notas | Notas internas | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Categorías de Gasto | PPC, Software, VA Services, Muestras, Fotografía, Flete/Forwarder, Aduana, Prep Center, Almacén 3PL, Viajes, Otros. |

### Tips

- Registra gastos semanalmente para no perder track.
- Margen neto negativo = quemando capital. Reduce gastos o aumenta precios.
- Gastos de PPC deberían ser 8-15% de revenue para productos maduros.
- Revisa categoría 'Otros' mensualmente para identificar gastos no categorizados.

## ads — PPC / Ads

Ruta: [/ads](/ads)

### Descripción

Gestión básica de campañas publicitarias Amazon PPC. Registro de campañas, budgets y estados.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Campañas | Total de campañas registradas |  |
| Budget Diario | Suma de budgets diarios |  |
| Activas | Campañas en estado enabled |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Nueva Campaña | Formulario inline para crear campaña |

### Tablas

#### Lista de Campañas

| Columna | Descripción |
| --- | --- |
| Nombre | Nombre de la campaña |
| Tipo | SP Auto / SP Manual Keyword / SP Manual Product / SB / SD |
| Status | Enabled / Paused / Archived |
| Budget/día | Presupuesto diario |
| Marketplace | Amazon donde corre |

### Formularios

#### Nueva Campaña

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre | Nombre de la campaña | Sí |
| Tipo | sp_auto / sp_manual_keyword / sp_manual_product / sb / sd | No |
| Producto | Producto promocionado (opcional) | No |
| Campaign ID | ID de campaña de Amazon Ads (opcional) | No |
| Marketplace | Marketplace donde corre la campaña | No |
| Status | enabled / paused / archived | No |
| Budget Diario | Presupuesto diario en USD | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| SP Auto | Sponsored Products automático. Amazon elige keywords. |
| SP Manual Keyword | Sponsored Products manual por keywords. |
| SP Manual Product | Sponsored Products manual por targeting de productos. |
| SB | Sponsored Brands. Aparece en header de búsqueda. |
| SD | Sponsored Display. Retargeting on/off Amazon. |

### Tips

- SP Auto es bueno para descubrir keywords. SP Manual para optimizar.
- Budget diario mínimo recomendado: $10-20 por campaña.
- ACOS objetivo: < 30% para productos nuevos, < 15% para maduros.
- Archive campañas con ACOS > 50% después de 2 semanas.

## research — Research

Ruta: [/research](/research)

### Descripción

Pipeline de investigación de productos. Kanban y lista para gestionar ideas desde concepción hasta lanzamiento o rechazo.

### Acciones

| Acción | Descripción |
| --- | --- |
| Nueva Idea | Modal para registrar nueva idea |
| Cambiar Estado | Mueve tarjeta entre columnas |
| Eliminar | Elimina idea del pipeline |

### Tablas

#### Vista Kanban

| Columna | Descripción |
| --- | --- |
| Idea | Nuevas ideas de productos |
| Validando | En proceso de validación |
| Aprobado | Aprobado para sourcing |
| En Progreso | En desarrollo/muestras |
| Lanzado | Ya en venta |
| Rechazado | Descartado |

#### Vista Lista

| Columna | Descripción |
| --- | --- |
| Producto | Nombre de la idea |
| Categoría | Categoría Amazon objetivo |
| Precio Est. | Precio de venta estimado |
| ROI Est. | ROI estimado |
| Estado | Estado en pipeline |
| Prioridad | P1 (alta) a P5 (baja) |

### Formularios

#### Idea y Fuente

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre | Nombre de la idea o producto | Sí |
| Nicho | Nicho o subnicho de mercado | No |
| Source / Fuente | Origen de la idea (Jungle Scout, Helium 10, TikTok, competencia, etc.) | No |
| Estado | idea / validating / approved / rejected / in_progress / launched | No |
| Prioridad | P1 (1) a P5 (5). 1 = lanzar ASAP | No |

#### Mercado (Amazon)

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Categoría Amazon | Categoría objetivo en Amazon | No |
| ASIN de Referencia | ASIN modelo para estimar demanda y competencia | No |
| Amazon URL | URL del listing de referencia | No |
| Competition Level | very_low / low / medium / high / very_high | No |
| Sellers FBA | Cantidad de sellers FBA en el ASIN de referencia | No |
| BSR | Best Sellers Rank del ASIN de referencia | No |

#### Demanda y Reviews

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Ventas Mensuales Est. | Unidades mensuales estimadas del ASIN de referencia | No |
| Revenue Mensual Est. | Ingreso mensual estimado del nicho | No |
| Precio Promedio | Precio promedio de venta del nicho | No |
| Reviews Competidor | Cantidad de reviews del competidor principal | No |
| Rating Promedio | Rating promedio del listing (0 a 5) | No |

#### Costos y Rentabilidad Estimada

| Campo | Descripción | Requerido |
| --- | --- | --- |
| COGS Estimado | Costo unitario estimado de fabricación | No |
| FBA Fee Est. | Tarifa FBA estimada por unidad | No |
| Precio Venta Est. | Precio de venta estimado | No |
| ROI Est. | ROI estimado proyectado (%) | No |
| Alibaba URL | URL del proveedor o cotización en Alibaba | No |

#### Estrategia y Notas

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Notas de Diferenciación | Cómo te diferenciarías de la competencia | No |
| Keywords | Palabras clave del producto (separadas por coma) | No |
| Notas | Notas internas de la investigación | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Prioridad | P1 = Lanzar ASAP, P2 = Este mes, P3 = Este trimestre, P4 = Este año, P5 = Backlog. |
| Pipeline de Estados | idea → validating → approved → in_progress → launched. rejected es terminal. |
| Competition Level | very_low, low, medium, high, very_high. A mayor competencia, mayor costo de entrada y publicidad. |
| Validación | Fase en la que se estiman demanda, precio, reviews y rentabilidad del nicho antes de comprometer capital. |
| Criterio de Aprobación | Regla interna: ROI estimado > 150% y margen neto > 25% para mover una idea a Aprobado. |

### Tips

- Mantén máximo 5 productos en 'Validando' para enfocar recursos.
- ROI estimado > 150% antes de mover a 'Aprobado'.
- Valida con muestras físicas antes de 'En Progreso'.
- Documenta por qué rechazaste una idea para no reconsiderarla.

## forecasting — Forecasting

Ruta: [/forecasting](/forecasting)

### Descripción

Sugerencias automáticas de reorden basadas en velocidad de ventas, lead time del proveedor y stock actual.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Crítico | Stock < lead time (se agotará antes de reorden) |  |
| Advertencia | Stock < 2× lead time |  |
| Total Sugerencias | Productos que necesitan reorden |  |

### Tablas

#### Sugerencias de Reorden

| Columna | Descripción |
| --- | --- |
| Producto | Nombre del producto |
| Stock | Unidades disponibles |
| Ventas/día | Velocidad promedio |
| Días stock | Cuánto durará el stock |
| Lead time | Días de entrega proveedor |
| Sugerido | Cantidad recomendada para reorden |
| Proveedor | Proveedor principal |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Sugerido | Cantidad = MAX(MOQ, (Lead Time + 30 días buffer) × Ventas/día - Stock Actual). Asegura stock durante reorden + mes de seguridad. |

### Tips

- Prioriza productos 'Crítico' primero. Se agotarán antes de recibir reorden.
- Considera duplicar lead time en épocas altas (Q4, Chinese New Year).
- Sugerido incluye MOQ del proveedor. Si MOQ > sugerido, usa MOQ.
- Revisa forecasting semanalmente, no mensualmente.

## import — Importar

Ruta: [/import](/import)

### Descripción

Importación masiva de productos vía CSV/Excel. Valida headers, previsualiza datos y reporta errores antes de importar.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Filas Totales | Total de filas en archivo |  |
| Válidas | Filas sin errores |  |
| Con Errores | Filas con problemas de validación |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Descargar Plantilla | Plantilla CSV con headers correctos |
| Subir Archivo | Drag & drop o click para seleccionar |
| Analizar | Valida estructura antes de importar |
| Importar | Importa productos válidos |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Formatos Soportados | .xlsx, .csv, .tsv. Máximo 5MB, 500 filas. |
| Headers Requeridos | name, sku. Opcionales: asin, category, sale_price, unit_cost, weight_kg, fba_fee, etc. |
| Auto-mapping | Sistema intenta mapear headers en español/inglés automáticamente. |

### Tips

- Usa la plantilla descargable para evitar errores de formato.
- Prefiere CSV sobre Excel para evitar problemas de formato de celdas.
- Verifica que SKUs sean únicos antes de importar.
- Importa en lotes de 100-200 productos para mejor performance.

## sp-api — Amazon API

Ruta: [/sp-api](/sp-api)

### Descripción

Integración con Amazon Selling Partner API (SP-API) para sincronización automática de productos, órdenes, inventario, tarifas, devoluciones y pagos. Incluye gestión de conexiones OAuth, historial de sincronización y ejecución manual o automática.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Conexiones | Marketplaces conectados via OAuth SP-API |  |
| Última Sincronización | Timestamp del último sync completo |  |
| Sync Activo | Indica si hay un sync en ejecución |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Conectar Marketplace | OAuth flow para conectar Seller Central |
| Sincronizar Todo | Ejecuta sync completo de todos los tipos |
| Sincronizar por Tipo | Sync selectivo: solo productos, órdenes, etc. |

### Tablas

#### Historial de Sincronización

| Columna | Descripción |
| --- | --- |
| Tipo | products / orders / inventory / fees / returns / payouts |
| Estado | success / error / running |
| Procesados | Items procesados en el sync |
| Fallidos | Items con error |
| Fecha | Timestamp de ejecución |

### Glosario de sección

| Término | Definición |
| --- | --- |
| OAuth SP-API | Autenticación delegada via Amazon. El usuario autoriza a la app a acceder a su cuenta de Seller Central. El refresh token se almacena para renovación automática. |
| Sync Products | Obtiene listings activos via getListings() y actualiza/crea productos en la DB. |
| Sync Orders | Obtiene órdenes recientes via getOrders() + getOrderItems() y las registra como ventas. |
| Sync Inventory | Obtiene niveles de stock FBA via getInventory() y actualiza inventory + alertas. |
| Sync Fees | Estima tarifas FBA y referral fee para cada producto via getFeeEstimate(). |
| Sync Returns | Obtiene reportes de devoluciones via Reports API y registra returns. |
| Sync Payouts | Obtiene reportes de pagos via Reports API para el módulo de finanzas. |

### Tips

- SP-API requiere cuenta Professional de Amazon Seller Central.
- Necesitas registrar una aplicación en Seller Central > Developer Central.
- Scopes requeridos: sellingPartnerAPI, reports, feeds, notifications.
- Las credenciales (client_id, client_secret, AWS keys, role ARN) se configuran en Vercel env.
- El sync diario automático se ejecuta via cron en /api/sp-api/cron.
- Si no hay credenciales configuradas, el sync retorna 0 items procesados (no falla).

## members — Miembros

Ruta: [/members](/members)

### Descripción

Directorio de socios de la LLC. Gestión completa de miembros con participaciones, estados, albaceas y notas. Es la base del sistema de gobierno corporativo: cada miembro puede tener tareas asignadas, eventos de sucesión vinculados y participación en decisiones directivas.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Total Miembros | Cantidad total de socios registrados |  |
| Activos | Miembros con estado Activo |  |
| Participación Total | Suma de ownership de todos los miembros (debe ser ~100%) |  |
| Albaceas Asignados | Miembros que tienen albacea designado |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Nuevo Miembro | Formulario para registrar nuevo socio |
| Ver Detalle | Información completa del miembro |
| Editar | Modificar datos del miembro |
| Eliminar | Elimina miembro con confirmación |

### Tablas

#### Lista de Miembros

| Columna | Descripción |
| --- | --- |
| Nombre | Nombre completo del socio |
| Email | Correo electrónico del miembro |
| Participación | Porcentaje de ownership en la LLC |
| Estado | Activo / Retirado / Fallecido |
| Albacea | Nombre del albacea designado |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Estados de Miembro | Activo = socio vigente. Retirado = ya no es socio pero mantiene registro histórico. Fallecido = activa el proceso de sucesión. |
| Albacea | Persona física designada por el socio para gestionar su patrimonio en caso de fallecimiento. Datos requeridos: nombre y email. |
| Rol del Miembro | admin = gestión completa, editor = edita datos, viewer = solo lectura. Controla los permisos del socio dentro de la app. |

### Tips

- La suma de participaciones de todos los miembros debe ser exactamente 100%.
- El albacea puede ser otro miembro de la LLC o una persona externa.
- Los datos de gobierno corporativo son visibles para todos los socios autenticados.

## member-form — Crear / Editar Miembro

Ruta: [/members/new](/members/new)

### Descripción

Formulario para registrar un nuevo socio o modificar uno existente. Incluye campos de identificación, participación accionaria, estado, y datos del albacea.

### Formularios

#### Datos del Miembro

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre Completo | Nombre y apellido del socio | Sí |
| Email | Correo electrónico del miembro | No |
| Participación (%) | Porcentaje de ownership, valor entre 0 y 100 | Sí |
| Estado | Activo / Retirado / Fallecido | Sí |

#### Datos de Sucesión (Albacea)

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Nombre del Albacea | Persona designada para gestionar herencia | No |
| Email del Albacea | Correo del albacea para notificaciones | No |

#### Notas

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Notas | Información adicional relevante del miembro | No |

### Tips

- El porcentaje de participación por defecto se divide equitativamente entre miembros existentes.
- Los datos del albacea son críticos para el plan de sucesión — mantenelos actualizados.
- Un email de albacea válido permite notificaciones automáticas en eventos de sucesión.

## member-detail — Detalle de Miembro

Ruta: [/members/[id]](/members/[id])

### Descripción

Vista detallada de un socio con información general, datos de sucesión, notas, y enlace directo a su plan de sucesión.

### KPIs

| KPI | Descripción | Fórmula |
| --- | --- | --- |
| Participación | Porcentaje de ownership del socio |  |
| Estado | Situación actual del miembro |  |
| Albacea | Nombre del albacea designado |  |

### Acciones

| Acción | Descripción |
| --- | --- |
| Editar | Modificar datos del miembro |
| Eliminar | Eliminar miembro con confirmación |

### Tips

- Desde acá podés navegar al plan de sucesión del miembro para ver su timeline completo.
- Si el estado es 'Fallecido', la sucesión ya debería estar en progreso.

## tasks — Tareas

Ruta: [/tasks](/tasks)

### Descripción

Tablero Kanban para gestión de tareas operativas y de gobierno. Las tareas se organizan en columnas Pendiente → En Progreso → Completada, con soporte de drag & drop, prioridades, asignación a miembros, fechas de vencimiento y categorización por módulo.

### Acciones

| Acción | Descripción |
| --- | --- |
| Nueva Tarea | Toggle de formulario inline para crear tarea |
| Editar | Pre-llena formulario con datos existentes |
| Eliminar | Elimina tarea con confirmación |
| Drag & Drop | Arrastrar tarjeta entre columnas para cambiar estado |

### Tablas

#### Tareas Pendientes

| Columna | Descripción |
| --- | --- |
| Título | Nombre de la tarea |
| Prioridad | Baja / Media / Alta / Urgente (indicador de color) |
| Módulo | Documentos / FBA / General |
| Asignado a | Miembro responsable |
| Fecha Límite | Fecha de vencimiento |

#### Tareas en Progreso

| Columna | Descripción |
| --- | --- |
| Título | Nombre de la tarea |
| Prioridad | Baja / Media / Alta / Urgente |
| Asignado a | Miembro responsable |
| Vencimiento | Días restantes o vencida |

#### Tareas Completadas

| Columna | Descripción |
| --- | --- |
| Título | Nombre de la tarea |
| Asignado a | Miembro que la completó |
| Módulo | Categoría de la tarea |

### Formularios

#### Crear / Editar Tarea

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Título | Nombre descriptivo de la tarea | Sí |
| Estado | Pendiente / En Progreso / Completada | Sí |
| Prioridad | Baja / Media / Alta / Urgente | Sí |
| Módulo | Documentos / FBA / General (o texto libre) | No |
| Fecha Límite | Fecha de vencimiento opcional | No |
| Asignado a | Miembro responsable (desplegable con lista de miembros) | No |
| Descripción | Detalle ampliado de la tarea | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Prioridad | Urgente (rojo) = requiere acción inmediata. Alta (ámbar) = esta semana. Media (azul) = este mes. Baja (gris) = backlog. |
| Estados de Tarea | pending (Pendiente) → in_progress (En Progreso) → completed (Completada). Se actualizan con drag & drop. |
| Módulo | Categoría de la tarea: Documentos, FBA, General. Permite filtrar tareas por área del negocio. |

### Tips

- Arrastrá tarjetas entre columnas para actualizar el estado sin abrir el formulario.
- Las tareas vencidas se marcan automáticamente con indicador visual.
- Asigná tareas a miembros específicos para distribuir responsabilidades claramente.

## board-decisions — Decisiones Directivas

Ruta: [/board-decisions](/board-decisions)

### Descripción

Registro formal de decisiones del Directorio de la LLC. Cada decisión (DEC) tiene título, descripción, referencia documental, estado y votación. Vinculadas a la gestión ordinaria de la sociedad.

### Acciones

| Acción | Descripción |
| --- | --- |
| Nueva Decisión | Registrar una nueva DEC |
| Editar | Modificar decisión existente |
| Eliminar | Eliminar decisión |

### Tablas

#### Decisiones

| Columna | Descripción |
| --- | --- |
| Título | Nombre de la decisión directiva |
| Referencia Documental | Documento asociado en Drive |
| Estado | Borrador / Aprobado / Rechazado / Ejecutado |
| Fecha Decisión | Fecha de la resolución |

### Formularios

#### Nueva Decisión

| Campo | Descripción | Requerido |
| --- | --- | --- |
| Título | Nombre de la decisión directiva | Sí |
| Referencia Documental | Documento asociado (ej. DEC-NNN) | No |
| Descripción | Detalle de la resolución | No |
| Fecha Decisión | Fecha de la resolución | No |
| Estado | draft / approved / rejected / executed | No |
| File URL | Enlace al documento en Drive | No |
| Votación | Registro de votos por miembro | No |

### Glosario de sección

| Término | Definición |
| --- | --- |
| DEC | Documento de Decisión Directiva. Identificador único tipo DEC-NNN para seguimiento. |
| Estados | Borrador = en preparación. Aprobado = vigente. Rechazado = no aprobado. Ejecutado = implementado. |

### Tips

- Toda decisión importante de la LLC debe registrarse como DEC.
- Vinculá cada DEC a un documento en Drive como respaldo.

## drive — Google Drive

Ruta: [/drive](/drive)

### Descripción

Integración con Google Drive para almacenamiento y gestión de documentos del negocio. Cada socio conecta su propia cuenta de Google. Incluye navegador de archivos, CRUD completo, visualización de imágenes, edición de texto, y backup automático de datos de la app.

### Acciones

| Acción | Descripción |
| --- | --- |
| Conectar Google Drive | OAuth flow para autorizar acceso |
| Desconectar | Revoca el acceso a Drive |
| Subir Archivo | Drag & drop o selector de archivos |
| Nueva Carpeta | Crear carpeta en el directorio actual |
| Abrir en Drive | Abre el archivo en Google Drive web para edición nativa |

### Tablas

#### Lista de Archivos

| Columna | Descripción |
| --- | --- |
| Nombre | Nombre del archivo o carpeta |
| Tipo | Extensión del archivo |
| Tamaño | Peso del archivo formateado |
| Modificado | Fecha de última modificación |
| Acciones | Abrir en Drive / Descargar / Editar / Renombrar / Eliminar |

### Glosario de sección

| Término | Definición |
| --- | --- |
| OAuth2 | Cada usuario conecta su propia cuenta de Google Drive. El refresh token se guarda en user_settings para acceso persistente. |
| Backups | Los backups se almacenan en carpeta 'Backups' de Drive en formato .xlsx. Módulos: productos, ventas, pedidos, inventario, proveedores. |

### Tips

- Cada socio debe conectar su propia cuenta de Google Drive.
- Los documentos nativos de Google (Docs, Sheets) se abren directamente en Drive para edición.
- Hacé backup periódico de cada módulo desde la sección de backups.
- Podés navegar carpetas y organizar documentos como en Drive nativo.

## notifications — Notificaciones

Ruta: [/dashboard](/dashboard)

### Descripción

Sistema de notificaciones in-app con prioridades diferenciadas. Alertas de stock bajo, tareas vencidas, eventos de sucesión, y cambios en decisiones directivas. Accesible desde el header con indicador de no leídas.

### Tablas

#### Lista de Notificaciones

| Columna | Descripción |
| --- | --- |
| Prioridad | Crítica / Alta / Media / Baja (indicador de color) |
| Mensaje | Contenido de la notificación |
| Módulo | Area de la app que genera la alerta |
| Fecha | Timestamp de generación |
| Leída | Indica si fue vista por el usuario |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Prioridades | Crítica (rojo) = acción inmediata requerida. Alta (ámbar) = atención pronto. Media (azul) = informativo. Baja (gris) = recordatorio. |

### Tips

- Las notificaciones críticas requieren acción inmediata (stock 0, tareas vencidas).
- El badge en el header muestra el conteo de no leídas.
- Las notificaciones se auto-actualizan sin recargar la página.

## global-search — Búsqueda Global

Ruta: [/dashboard](/dashboard)

### Descripción

Paleta de comandos 'Command K' para búsqueda instantánea en toda la app. Accesible con Cmd+K (Mac) o Ctrl+K (Windows). Busca productos, proveedores, pedidos y módulos de navegación.

### Tablas

#### Resultados de Búsqueda

| Columna | Descripción |
| --- | --- |
| Tipo | Producto / Proveedor / Pedido / Módulo |
| Resultado | Nombre o título del elemento encontrado |
| Acción | Link directo al elemento seleccionado |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Teclas Rápidas | Cmd+K (Mac) o Ctrl+K (Windows) para abrir. Flechas para navegar. Enter para seleccionar. Esc para cerrar. |

### Tips

- Buscá cualquier producto por SKU, ASIN o nombre.
- También busca proveedores y módulos de navegación.
- Usá las flechas del teclado para navegar resultados sin mouse.

## onboarding — Onboarding

Ruta: [/dashboard](/dashboard)

### Descripción

Guía de inicio interactiva para nuevos usuarios. Checklist con pasos secuenciales que se muestra automáticamente hasta completar todos los pasos.

### Acciones

| Acción | Descripción |
| --- | --- |
| Crear Perfil | Configurar nombre, empresa y preferencias en Settings |
| Configurar Defaults | Establecer valores por defecto FBA: fees, marketplace, moneda |
| Agregar Primer Producto | Registrar un producto en el catálogo |
| Agregar Proveedor | Registrar un proveedor en la base |
| Importar Ventas | Subir CSV con ventas históricas |

### Glosario de sección

| Término | Definición |
| --- | --- |
| Progreso | El checklist muestra el porcentaje completado. Desaparece automáticamente al 100%. |

### Tips

- Completá todos los pasos para acceder a todas las funcionalidades.
- El onboarding solo se muestra una vez; después de completarlo no vuelve a aparecer.
- Si cerrás el onboarding, podés acceder a la ayuda desde el header (icono ?).
