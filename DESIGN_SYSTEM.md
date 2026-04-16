# DESIGN SYSTEM - COMMAND CENTER NOIR
# Leer solo cuando se trabaja en UI/estilos

## ESTETICA
Cyber-industrial command center. Oscuro, preciso, datos vivos.
Inspiracion: cockpits espaciales, terminales Bloomberg, dashboards trading.
Tipografia mono para titulos + sans para body = sensacion de terminal de datos real.

## DARK MODE (primario)
bg-deep: #050a12
bg-surface: #0a1020
bg-card: #0d1528
bg-card-elevated: #111d35
bg-sidebar: #070d1a
border-default: #1a2744
border-hover: #243352
border-glow: rgba(0,212,255,0.15)
cyan: #00d4ff (primary accent, links, active)
green: #00ff88 (profit, success)
amber: #ffaa00 (warning, stock bajo)
red: #ff3366 (danger, delete)
purple: #7c5cff (info badges)
text-primary: #e8edf5
text-secondary: #7a8ba8
text-tertiary: #4a5a75
text-muted: #2d3a52

## LIGHT MODE
bg: #f0f2f7 (gris frio, NO blanco puro)
surface: #f6f8fb
card: #ffffff
sidebar: #f8f9fc
border: #dde3ed
cyan: #0088aa
text-primary: #0d1321
text-secondary: #5a6578

## TIPOGRAFIA
Display/titulos/KPI values/labels: "JetBrains Mono" (monospace, via next/font/google)
Body/UI/botones/tablas: "Plus Jakarta Sans" (sans-serif, via next/font/google)
Datos numericos: JetBrains Mono con tabular-nums

## COMPONENTES A CREAR
1. kpi-card.tsx: label uppercase tracking-[0.15em] text-[11px], value text-3xl bold tabular-nums, trend arrows, icon top-right, hover scale(1.01)+glow, fade-up animation
2. status-badge.tsx: pill con dot+texto uppercase, variants success/warning/danger/info/neutral, auto-detect from status string
3. data-table-wrapper.tsx: container bg-card rounded-2xl, th uppercase text-[11px] tracking-wider, row hover bg-white/[0.02], footer "Mostrando X de Y"
4. page-header.tsx: badge cyan uppercase, title text-3xl bold, subtitle, breadcrumbs, action slot
5. pagination-control.tsx: active page bg-cyan-500, inactive bg-white/[0.04]

## SIDEBAR
bg #070d1a, w-64 fixed left, hidden lg:flex
Logo: "FBA Manager" bold + "COMMAND CENTER" text-[10px] cyan tracking-[0.2em]
7 items: Dashboard, Productos, Proveedores, Inventario, Ventas, Calculadora, Configuracion
Active: cyan-400 + barra izquierda 3px + bg-cyan-400/[0.05]
Inactive: text-slate-500 hover:text-slate-300
User info bottom con avatar+nombre+email
usePathname() para active detection
Sin boton CTA

## HEADER TOP
Sticky, bg-surface/80 backdrop-blur-xl border-b
Search: bg-white/[0.04] rounded-xl, hidden mobile
Right: Bell icon (decorativo), ThemeToggle, Avatar

## ANIMACIONES CSS (globals.css)
fadeUp: translateY(10px)->0 + opacity, 400ms
shimmer: gradient slide para skeletons
pulseGlow: para live indicators
progressFill: para barras de progreso
Stagger: .animation-delay-100 a .animation-delay-400
Hover glow: box-shadow 0 0 20px rgba(0,212,255,0.08)

## INPUTS (formularios)
bg: white/[0.04] dark, white light
border: border-border, focus: ring-1 ring-cyan-500/40
Labels: font-display uppercase text-[11px] tracking-wider
Selects: bg-popover SOLIDO siempre

## BOTONES
Primary: bg-cyan-500 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]
Secondary: bg-white/[0.06] border-border
Danger: bg-rose-500/10 text-rose-400

## STATUS COLORS
active/enviado/delivered -> green
low_stock/paused/pendiente -> amber
out_of_stock/sin_stock -> red
processing/en_transito -> cyan
discontinued -> slate