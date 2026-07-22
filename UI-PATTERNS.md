# UI Patterns — Amazon FBA Manager

> Guía técnica completa del sistema de diseño y patrones de interfaz de usuario.

---

## 1. Design System "Command Center Noir"

Estética cyber-industrial inspirada en terminales Bloomberg y dashboards de trading. Diseño optimizado para monitoreo prolongado con contraste reducido yfatiga visual mínima.

### Dark Mode Tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `bg-deep` | `#050a12` | Background principal de la aplicación |
| `bg-surface` | `#0a1020` | Superficies elevadas, headers |
| `bg-card` | `#0d1528` | Cards, paneles, contenedores |
| `bg-sidebar` | `#070d1a` | Sidebar lateral |
| `cyan` | `#00d4ff` | Color primario, links, acciones |
| `green` | `#00ff88` | Profit, valores positivos |
| `amber` | `#ffaa00` | Warnings, estados pendientes |
| `red` | `#ff3366` | Danger, errores, valores negativos |

### Light Mode Tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `bg` | `#f0f2f7` | Background (cold gray, **NO** pure white) |
| `card` | `#ffffff` | Cards, superficies elevadas |
| `border` | `#dde3ed` | Bordes y separadores |
| `cyan` | `#0088aa` | Color primario en light mode |

### High Contrast Mode

- Background: pure black (`#000000`) / pure white (`#ffffff`)
- Bordes: `3px` en todos los contenedores
- Focus outlines: máximo contraste y tamaño

### CSS Variables System

Definidas en HSL en `tailwind.config.ts`, consumidas como:

```css
hsl(var(--name))
```

**Regla estricta:** NUNCA usar `bg-white`, `bg-gray-*`, o clases de color hardcodeadas. Siempre usar tokens semánticos: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`.

---

## 2. Typography

| Font | Variable | Uso |
|------|----------|-----|
| JetBrains Mono | `font-display` | Títulos, KPIs, labels, badges, datos numéricos |
| Plus Jakarta Sans | `font-body` | Body text, botones, sidebar, UI general |

### Tamaños Clave

| Elemento | Tamaño | Font |
|----------|--------|------|
| Page badge | `11px` | JetBrains Mono |
| Page title | `24-36px` | JetBrains Mono |
| KPI label | `10-11px` | JetBrains Mono |
| KPI value | `20-30px` | JetBrains Mono |
| Table header | `11px` | JetBrains Mono |
| Section label | `12px` | JetBrains Mono |
| Body text | `14px` | Plus Jakarta Sans |
| Muted text | `12px` | Plus Jakarta Sans |

**Regla:** Siempre usar `tabular-nums` en datos numéricos para alineación correcta de columnas.

---

## 3. Component Catalog

### shadcn/ui Primitives (11)

| Componente | Archivo |
|------------|---------|
| AlertDialog | `components/ui/alert-dialog.tsx` |
| Button | `components/ui/button.tsx` |
| Card | `components/ui/card.tsx` |
| Dialog | `components/ui/dialog.tsx` |
| Input | `components/ui/input.tsx` |
| Label | `components/ui/label.tsx` |
| Popover | `components/ui/popover.tsx` |
| Select | `components/ui/select.tsx` |
| Skeleton | `components/ui/skeleton.tsx` |
| Textarea | `components/ui/textarea.tsx` |
| Sonner | `components/ui/sonner.tsx` |

### Application Components (13)

| Componente | Descripción |
|------------|-------------|
| Announcer / FormErrorMessage | Anuncios para screen readers y mensajes de error de formularios |
| Breadcrumbs | Navegación de migas de pan |
| DataTableWrapper | Wrapper genérico para tablas con sorting, filtering, pagination |
| EmptyState | Estado vacío con icono, título y acción |
| ErrorFallback | Fallback de error con retry |
| ExportButton | Botón de exportación (CSV, PDF, etc.) |
| FilterPanel | Panel de filtros colapsable |
| KpiCard | Card de KPI con icono, label, valor y tendencia |
| PageHeader | Header de página con título, badge y acciones |
| PageSkeleton | Skeleton de carga de página completa |
| PaginationControl | Control de paginación con page size selector |
| SectionCard | Card genérica para secciones de contenido |
| StatusBadge | Badge de estado con auto-detección de color |

### Layout Components (4)

| Componente | Especificación |
|------------|----------------|
| Sidebar | `w-64`, fixed left, `hidden lg:flex` |
| MobileBottomNav | 5 items + panel "More" expandible |
| TopHeader | `sticky top-0`, `backdrop-blur` |
| SkipToContent | Link de skip para accesibilidad |

### Modal Components (6)

| Componente | Entidad |
|------------|---------|
| ProductFormModal | Productos |
| SaleFormModal | Ventas |
| SupplierFormModal | Proveedores |
| OrderFormModal | Órdenes |
| MemberFormModal | Miembros del equipo |
| MemberDetailModal | Detalle de miembro |

### Feature Components (12)

| Componente | Función |
|------------|---------|
| GlobalSearch | Búsqueda global con `Cmd+K` |
| NotificationBell | Campana de notificaciones |
| OrgSwitcher | Selector de organización |
| OnboardingChecklist | Checklist de onboarding |
| HelpButton + HelpModal | Botón de ayuda con modal |
| FeeCalculatorInline | Calculadora de fees inline |
| CommentsSection | Sección de comentarios |
| ShareDashboard | Compartir dashboard |
| BarcodeScanner | Escáner de código de barras |
| PushToggle | Toggle de notificaciones push |
| ThemeToggle | Toggle dark/light/high-contrast |
| OrgLayout | Layout por organización |

### Chart Components (8)

| Componente | Tipo |
|------------|------|
| SalesChart | Gráfico de ventas |
| CategoryChart | Gráfico por categoría |
| ProfitBarChart | Gráfico de barras de profit |
| ComparisonChart | Gráfico de comparación |
| RevenueTrendChart | Tendencia de revenue |
| RevenueProjection | Proyección de revenue |
| ProfitabilityHeatmap | Heatmap de rentabilidad |
| ReportGenerator | Generador de reportes |

### Drive Components (8)

| Componente | Función |
|------------|---------|
| DriveBrowser | Navegador de archivos |
| DriveToolbar | Toolbar de acciones |
| DriveFileList | Lista de archivos |
| DriveFileIcon | Icono por tipo de archivo |
| DriveUploadDialog | Diálogo de upload |
| DriveTextEditor | Editor de texto |
| DriveImageViewer | Visor de imágenes |
| DriveBackup | Backup de archivos |

---

## 4. Responsive Patterns

### Desktop

```
┌──────────┬────────────────────────────┐
│          │       TopHeader            │
│ Sidebar  │  (sticky, backdrop-blur)   │
│  w-64    ├────────────────────────────┤
│  fixed   │                            │
│  left    │       Content              │
│          │  lg:ms-64                  │
│          │  p-4 sm:p-6 lg:p-8        │
└──────────┴────────────────────────────┘
```

### Mobile

```
┌────────────────────────────┐
│     Inline Header          │
├────────────────────────────┤
│                            │
│       Content              │
│       p-4                  │
│       pb-24                │
│                            │
├────────────────────────────┤
│  MobileBottomNav (5 items) │
│  fixed bottom-0            │
└────────────────────────────┘
```

### Patrones de Tabla

- Columnas desktop: `hidden md:table-cell`
- Fallback mobile: `md:hidden` con card layout
- Cada fila se renderiza como card en mobile

### KPI Grid

```
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

### Touch Targets

Todos los elementos interactivos deben cumplir WCAG 2.1:

```
min-w-[44px] min-h-[44px]
```

---

## 5. Form Patterns

### Stack Tecnológico

- **Form Library:** react-hook-form
- **Validation:** zod con `zodResolver`

### Input Binding

```tsx
<input {...form.register("fieldName")} />
// o
<Input {...form.register("fieldName")} />
```

### Select Binding

```tsx
const value = form.watch("field");
<Select value={value} onValueChange={(v) => form.setValue("field", v)}>
```

### Error Display

```tsx
<FormErrorMessage field={form.formState.errors.fieldName} />
// Renderiza con role="alert" para screen readers
```

### Submission Pattern

```tsx
form.handleSubmit(async (data) => {
  try {
    await saveData(data);
    toast.success(t("key", locale));
    onOpenChange(false);
  } catch (error) {
    toast.error(error.message);
  }
});
```

### Modal Form Pattern

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <section>
        <p className="sectionLabel">Section Title</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* inputs */}
        </div>
      </section>
      {/* Sticky footer with submit button */}
    </form>
  </DialogContent>
</Dialog>
```

### Form Constants

Importar desde `lib/form-constants.ts`:

```ts
import { inputClass, labelClass, sectionLabel } from "@/lib/form-constants";
```

| Constante | Uso |
|-----------|-----|
| `inputClass` | Clases estándar para inputs |
| `labelClass` | Clases estándar para labels |
| `sectionLabel` | Clases para títulos de sección en forms |

---

## 6. Animation System

### Dashboard Animations (`animations.css`)

| Animación | Descripción |
|-----------|-------------|
| `fadeUp` | Fade + translate hacia arriba |
| `fade-in` | Fade in simple |
| `slide-in-left` | Slide desde la izquierda |
| `slide-in-right` | Slide desde la derecha |
| `scale-in` | Scale up con fade |
| `count-up` | Animación de conteo numérico |
| `stagger-fade-up` | Fade up con stagger automático |
| `shimmer` | Efecto shimmer de carga |
| `pulse-glow` | Pulso con glow |
| `progress-fill` | Fill de barra de progreso |

### Stagger Classes

```css
.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 50ms; }
.stagger-3 { animation-delay: 100ms; }
.stagger-4 { animation-delay: 150ms; }
.stagger-5 { animation-delay: 200ms; }
.stagger-6 { animation-delay: 250ms; }
.stagger-7 { animation-delay: 300ms; }
.stagger-8 { animation-delay: 350ms; }
```

Incremento de 50ms entre cada paso.

### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Deshabilita TODAS las animaciones */
}
```

### Radix CSS Animations

Animaciones de apertura en Dialog y Popover:

- `zoom-in-95` / `zoom-out-95`
- `fade-in-0` / `fade-out-0`
- `slide-in-from-*` / `slide-out-to-*`

### ui-overrides.css

| Utilidad | Descripción |
|----------|-------------|
| `.glow-sm` | Glow sutil en hover |
| `.glow-md` | Glow moderado |
| `.hover-lift` | Elevación en hover con sombra |
| Popover backgrounds | Backgrounds sólidos (no transparentes) para Popovers |

---

## 7. Chart Architecture

### Base

- Todas las charts usan **Recharts** con `ResponsiveContainer`
- Componentes chart marcados como `"use client"`
- Dynamic imports: `dynamic(() => import(...), { ssr: false })`
- Loading state: skeleton con efecto pulse

### Custom Tooltip

```tsx
<div className="rounded-xl border border-border bg-card p-3 shadow-lg">
  {/* tooltip content */}
</div>
```

### Grid Configuration

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
```

### Axis Configuration

```tsx
<XAxis
  fontSize={10}
  fill="hsl(var(--muted-foreground))"
  tickLine={false}
/>
```

### Currency Formatting

```ts
// Formato estándar
value.toLocaleString("en-US", { style: "currency", currency: "USD" })
// Resultado: $1,234.56

// Y-axis para valores >= 1000
`$${(value / 1000).toFixed(0)}k`
// Resultado: $1k, $5k, $10k
```

### i18n

Todas las charts usan `useLocale()` para internacionalización.

### Empty States

Centrados en un contenedor de `280px`:

```tsx
<div className="flex items-center justify-center h-[280px]">
  <p className="text-muted-foreground text-sm">No hay datos disponibles</p>
</div>
```

---

## 8. Color Utilities

### roiColor(roi)

| Condición | Color |
|-----------|-------|
| `>= 30` | Emerald (verde positivo) |
| `>= 15` | Amber (advertencia) |
| `< 15` | Rose (peligro) |

### profitColor(p)

| Condición | Color |
|-----------|-------|
| `> 0` | Emerald |
| `=== 0` | Amber |
| `< 0` | Rose |

### stockColor(s)

| Estado | Color |
|--------|-------|
| `normal` | Green |
| `low_stock` | Amber |
| `out_of_stock` | Red |
| `overstock` | Blue |

---

## 9. Toast Patterns (Sonner)

### Success

```tsx
toast.success(t("successMessage", locale));
```

### Error

```tsx
toast.error(errorMessage);
```

### Theme-Aware

Los toasts sincronizan automáticamente con el tema actual (dark/light) usando `useTheme()`.

---

## 10. Status Badge Auto-Detection

### Success (Emerald)

| Estado |
|--------|
| `active` |
| `activo` |
| `enviado` |
| `delivered` |
| `completado` |

### Warning (Amber)

| Estado |
|--------|
| `low_stock` |
| `paused` |
| `pendiente` |
| `pausado` |

### Danger (Rose)

| Estado |
|--------|
| `out_of_stock` |
| `cancelled` |
| `cancelado` |

### Info (Cyan)

| Estado |
|--------|
| `processing` |
| `en_transito` |
| `in_transit` |

### Neutral (Slate)

| Estado |
|--------|
| `discontinued` |
| `inactive` |

---

## 11. Icons (lucide-react)

### Sizing

| Contexto | Tamaño |
|----------|--------|
| Small (inline) | 3.5-4px (`w-3.5 h-3.5` / `w-4 h-4`) |
| Sidebar | 18px (`w-[18px] h-[18px]`) |
| KPI | 3.5-5px responsive |
| Dialog | 5px (`w-5 h-5`) |
| Mobile | 5px (`w-5 h-5`) |

### Color Mapping

| Uso | Clase |
|-----|-------|
| Primary | `text-primary` |
| Muted | `text-muted-foreground` |
| Success | `text-emerald-400` (dark) / `text-emerald-500` (light) |
| Warning | `text-amber-400` (dark) / `text-amber-500` (light) |
| Danger | `text-rose-400` |
| Info | `text-cyan-400` |

### Most Used Icons

| Icono | Uso |
|-------|-----|
| `Loader2` | Spinner de carga (con `animate-spin`) |
| `TrendingUp` / `TrendingDown` | Tendencias de KPIs |
| `Bell` | Notificaciones |
| `Check` | Completado, éxito |
| `X` | Cerrar, cancelar |
| `Search` | Búsqueda |
| `Filter` | Filtros |
| `Download` | Exportación |
| `Plus` | Agregar nuevo |
| `Settings` | Configuración |
| `Sun` / `Moon` | Toggle de tema |

---

## 12. Accessibility (WCAG 2.1 AA)

### Skip to Content

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute ...">
  Skip to content
</a>
```

### ARIA Roles

| Rol | Elemento |
|-----|----------|
| `banner` | TopHeader |
| `main` | Contenido principal (`id="main-content"`) |
| `navigation` | Sidebar, MobileBottomNav, Breadcrumbs |
| `dialog` | Modales (Dialog, AlertDialog) |
| `menu` | Menús desplegables |
| `alert` | Mensajes de error (FormErrorMessage) |
| `status` | Estados dinámicos |

### aria-live

| Región | Política |
|--------|----------|
| Search results | `aria-live="polite"` |
| Alert messages | `aria-live="assertive"` |

### Focus Management

```css
/* Focus visible: outline de 2px (3px en high-contrast) */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* High contrast mode */
[data-theme="high-contrast"] *:focus-visible {
  outline-width: 3px;
}

/* Mouse focus removal */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### Announcer Component

Componente dedicado para anuncios de screen readers:

```tsx
// Uso
<Announcer message="Producto creado exitosamente" />

// Implementación interna
<div role="status" aria-live="polite" className="sr-only">
  {message}
</div>
```

Permite notificaciones accesibles sin interrumpir la experiencia visual.
