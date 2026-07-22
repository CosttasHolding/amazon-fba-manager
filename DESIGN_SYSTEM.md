# DESIGN SYSTEM - COMMAND CENTER NOIR
# Leer solo cuando se trabaja en UI/estilos

## Estetica
Cyber-industrial command center. Oscuro, preciso, datos vivos.
Inspiracion: cockpits espaciales, terminales Bloomberg, dashboards trading.
Tipografia mono para titulos + sans para body = sensacion de terminal de datos real.

---

## Dark Mode (primario)

| Token | Valor |
|---|---|
| bg-deep | #050a12 |
| bg-surface | #0a1020 |
| bg-card | #0d1528 |
| bg-card-elevated | #111d35 |
| bg-sidebar | #070d1a |
| border-default | #1a2744 |
| border-hover | #243352 |
| border-glow | rgba(0,212,255,0.15) |
| cyan (primary) | #00d4ff |
| green (profit/success) | #00ff88 |
| amber (warning) | #ffaa00 |
| red (danger) | #ff3366 |
| purple (info) | #7c5cff |
| text-primary | #e8edf5 |
| text-secondary | #7a8ba8 |
| text-tertiary | #4a5a75 |
| text-muted | #2d3a52 |

---

## Light Mode

| Token | Valor |
|---|---|
| bg | #f0f2f7 (gris frio, NO blanco puro) |
| surface | #f6f8fb |
| card | #ffffff |
| sidebar | #f8f9fc |
| border | #dde3ed |
| cyan (primary) | #0088aa |
| text-primary | #0d1321 |
| text-secondary | #5a6578 |

---

## High Contrast Mode

Overrides adicionales para accesibilidad. Se activa via el componente `ThemeToggle` y se persiste en `localStorage("fba-high-contrast")`.

| Regla | Valor |
|---|---|
| backgrounds | negro puro / blanco puro |
| focus outlines | 3px solido |
| borders | colores mas fuertes con `!important` |
| activacion | ThemeToggle click -> class `.high-contrast` en `<html>` |

---

## CSS Variables (formato HSL)

### Light (`:root`)

```css
--background: 210 20% 98%;
--foreground: 222 47% 11%;
--card: 0 0% 100%;
--card-foreground: 222 47% 11%;
--popover: 0 0% 100%;
--popover-foreground: 222 47% 11%;
--primary: 217 91% 50%;
--primary-foreground: 0 0% 100%;
--secondary: 210 20% 96%;
--secondary-foreground: 222 47% 11%;
--muted: 210 20% 96%;
--muted-foreground: 215 16% 47%;
--accent: 210 20% 96%;
--accent-foreground: 222 47% 11%;
--destructive: 0 84% 60%;
--destructive-foreground: 0 0% 100%;
--border: 214 20% 90%;
--input: 214 20% 90%;
--ring: 217 91% 50%;
--radius: 0.75rem;
```

### Dark (`.dark`)

```css
--background: 228 25% 8%;
--foreground: 210 20% 92%;
--card: 225 25% 11%;
--card-foreground: 210 20% 92%;
--popover: 225 25% 11%;
--popover-foreground: 210 20% 92%;
--primary: 192 100% 50%;
--primary-foreground: 228 25% 8%;
--secondary: 225 25% 15%;
--secondary-foreground: 210 20% 92%;
--muted: 225 25% 15%;
--muted-foreground: 217 18% 46%;
--accent: 225 25% 15%;
--accent-foreground: 210 20% 92%;
--destructive: 346 86% 58%;
--destructive-foreground: 0 0% 100%;
--border: 222 30% 18%;
--input: 222 30% 18%;
--ring: 192 100% 50%;
--radius: 0.75rem;
```

### Sidebar variables

```css
--sidebar: 228 25% 5%;
--sidebar-foreground: 210 20% 92%;
--sidebar-primary: 192 100% 50%;
--sidebar-accent: 225 25% 12%;
--sidebar-border: 222 30% 16%;
```

---

## Tipografia

### Fuentes

- **JetBrains Mono** (`font-display`, `--font-display`): Titulos, KPIs, labels, badges, datos numericos
- **Plus Jakarta Sans** (`font-body`, `--font-body`): Body text, botones, sidebar, UI general

### Convenciones de tamano

| Elemento | Clases |
|---|---|
| Page badge | `font-display uppercase text-[11px] tracking-[0.2em] text-primary` |
| Page title | `font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight` |
| KPI label | `font-display uppercase text-[10px] sm:text-[11px] tracking-[0.15em] text-muted-foreground` |
| KPI value | `font-display text-xl sm:text-3xl font-bold tabular-nums text-foreground` |
| Table header | `font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground` |
| Section label | `text-xs font-semibold text-primary uppercase tracking-wider` |
| Body text | `text-sm text-foreground` |
| Muted text | `text-xs text-muted-foreground` |
| SKU/Mono | `font-mono text-[10px]` o `text-xs font-mono` |

Siempre usar `tabular-nums` para datos numericos.

---

## Componentes Base (shadcn/ui)

Los 11 primitivos shadcn con sus customizaciones:

- **Button**: variants (primary, secondary, destructive, ghost, outline), sizes incluyendo icon variants
- **Card**: `rounded-2xl`, `border-border/50`, `transition-all hover:shadow-md`
- **Dialog**: Radix animations, `min-w-[44px]` close button para touch
- **Input**: `rounded-xl`, `focus:ring-2 focus:ring-primary/20`
- **Select**: `bg-popover` SOLIDO (nunca translucido), `rounded-xl`, `shadow-xl`
- **AlertDialog**: `data-open`/`data-closed` pattern, size prop
- **PopoverContent**: `rounded-xl`, `bg-popover`, animaciones direccionales
- **Tabs**: variant underline con indicador animado
- **Tooltip**: delay 300ms, `bg-popover` solido
- **Badge**: pill con dot, variants segun status
- **Separator**: `bg-border/50` con opacidad reducida

---

## Sidebar

- `bg #070d1a`, `w-64 fixed left`, `hidden lg:flex`
- Logo: "FBA Manager" bold + "COMMAND CENTER" `text-[10px] cyan tracking-[0.2em]`
- OrgSwitcher embebido debajo del logo
- Active: `cyan-400` + barra izquierda 3px + `bg-cyan-400/[0.05]`
- Inactive: `text-slate-500 hover:text-slate-300`
- User info bottom con avatar + nombre + email
- `usePathname()` para active detection
- Sin boton CTA

---

## Header Top

- Sticky, `bg-surface/80 backdrop-blur-xl border-b`
- Search: Cmd+K global search (`bg-white/[0.04] rounded-xl`, hidden mobile)
- Right: NotificationBell, ThemeToggle, Avatar
- Mobile: inline header in layout (logo + settings + theme + logout)

---

## Animaciones CSS (animations.css)

| Animacion | Keyframes | Duracion | Uso |
|---|---|---|---|
| `fadeUp` | `translateY(10px) -> 0`, `opacity 0 -> 1` | 400ms | Entrada de cards, KPIs |
| `shimmer` | gradient slide background | 1.5s loop | Skeleton loading |
| `pulseGlow` | box-shadow pulse cyan | 2s loop | Live indicators |
| `progressFill` | width 0% -> target% | 600ms ease-out | Barras de progreso |
| `.animation-delay-100` a `.animation-delay-400` | nth-child delay | 100ms increments | Stagger de elementos |

Hover glow: `box-shadow 0 0 20px rgba(0,212,255,0.08)`

---

## Inputs (formularios)

- `bg`: `white/[0.04]` dark, `white` light
- `border`: `border-border`, `focus: ring-1 ring-cyan-500/40`
- Labels: `font-display uppercase text-[11px] tracking-wider`
- Selects: `bg-popover` SOLIDO siempre

---

## Botones

- **Primary**: `bg-cyan-500 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]`
- **Secondary**: `bg-white/[0.06] border-border`
- **Danger**: `bg-rose-500/10 text-rose-400`

---

## Status Colors

| Status | Color |
|---|---|
| active / enviado / delivered / completado | green (#00ff88) |
| low_stock / paused / pendiente / pausado | amber (#ffaa00) |
| out_of_stock / sin_stock / cancelled / cancelado | red (#ff3366) |
| processing / en_transito / in_transit | cyan (#00d4ff) |
| discontinued / inactive / descontinuado | slate |

---

## Charts (Recharts)

- `ResponsiveContainer` wrapping siempre
- Custom tooltips: `rounded-xl border border-border bg-card/popover p-3`
- Grid: `strokeDasharray="3 3"` con `hsl(var(--border))`
- Axis: `fontSize 10-11`, `fill hsl(var(--muted-foreground))`
- Currency: `$XX.XX`, Y-axis: `$Xk` para values >= 1000

---

## Accessibility

- **Skip-to-content link**: primer elemento focusable, `sr-only` hasta focus
- **ARIA roles, labels, live regions**: en todos los componentes interactivos
- **Focus-visible**: 2px outline normal, 3px en high-contrast mode
- **Mouse focus removal**: `focus:not(:focus-visible)` quita outline
- **44px min touch targets**: todos los botones/links interactivos
- **prefers-reduced-motion: reduce**: desactiva animaciones CSS
- **Announcer component**: live region para screen readers, mensajes de estado
