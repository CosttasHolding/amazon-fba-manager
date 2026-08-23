# Automatizaciones — Guia de Configuracion

## Arquitectura

```
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────┐
│  Vercel Cron     │───>│  /api/automation/*   │───>│  Supabase DB │
│  (automatico)   │    │  (endpoints)         │    │              │
└─────────────────┘    └──────────────────────┘    └──────────────┘
```

Los endpoints se ejecutan automaticamente via **Vercel Cron** segun la configuracion en `vercel.json`.

---

## Endpoints de Automatizacion

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/automation/notifications` | GET/POST | Genera y persiste notificaciones. Devuelve criticas + warnings |
| `/api/automation/forecasting` | GET/POST | Endpoint interno: devuelve solo conteos critical/warning por `x-org-id` |
| `/api/automation/weekly-summary` | GET/POST | Resumen semanal: revenue, ROI, alertas, top 5 |

Los reportes programados usan actualmente solo `format: "excel"`, porque el cron genera XLSX. La API rechaza `pdf` y `both` al crear o actualizar un schedule y el cron no procesa schedules legacy con otro formato.

### Autenticacion

Todos aceptan el header:
- `Authorization: Bearer <CRON_SECRET>`
- Forecasting también acepta `x-automation-secret` y exige `x-org-id` UUID; nunca devuelve sugerencias detalladas.

### Variables de Entorno Requeridas

```
CRON_SECRET=<generar con node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SUPABASE_SERVICE_ROLE_KEY=<de Supabase Dashboard>
```

---

## Cron Jobs

Configurados en `vercel.json`:

| Ruta | Horario | Descripcion |
|------|---------|-------------|
| `/api/cron/sync` | 0 6 * * * | Sync SP-API (diario 6am UTC) |
| `/api/cron/alerts` | 0 8 * * * | Evaluar reglas de alerta (diario 8am UTC) |
| `/api/cron/reports` | 0 12 * * 1 | Reportes programados (lunes 12pm UTC) |

**Nota Vercel Hobby:** Solo permite crons diarios (max 1 ejecucion/dia). En plan Pro se puede usar `0 */6 * * *` para alerts cada 6h.

---

## SP-API (Preparacion Futura)

La sync con Amazon SP-API se ejecuta via cron diario (`/api/cron/sync`).

**Credenciales necesarias** (completar en `.env` cuando existan):
- `SP_API_CLIENT_ID`
- `SP_API_CLIENT_SECRET`
- `SP_API_REFRESH_TOKEN`

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| Cron no ejecuta | Verificar `vercel.json` + logs en Vercel Dashboard → Functions |
| 401 en endpoints | Verificar CRON_SECRET coincide con el de Vercel |
| Notificaciones duplicadas | La logica deduplica por product_id + type en ultimas 24h |
