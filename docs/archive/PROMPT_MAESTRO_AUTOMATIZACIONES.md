# Automatizaciones — Documentacion Tecnica

## Estado Actual

Las automatizaciones se ejecutan via **Vercel Cron** (nativo). Los endpoints estan en `/api/automation/*` y se autentican con `CRON_SECRET`.

## Endpoints

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/automation/notifications` | GET/POST | Genera notificaciones de stock (criticas + warnings) |
| `/api/automation/forecasting` | GET/POST | Productos en estado critical/warning de reorden |
| `/api/automation/weekly-summary` | GET/POST | Resumen semanal: revenue, ROI, top 5, alertas |

## Autenticacion

Header: `Authorization: Bearer <CRON_SECRET>`

Vercel Cron envia este header automaticamente. Para testing manual:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://amazon-fba-manager-virid.vercel.app/api/automation/notifications
```

## Cron Jobs (vercel.json)

| Ruta | Horario | Descripcion |
|------|---------|-------------|
| `/api/cron/sync` | 0 6 * * * | Sync SP-API (diario 6am UTC) |
| `/api/cron/alerts` | 0 8 * * * | Reglas de alerta (diario 8am UTC) |
| `/api/cron/reports` | 0 12 * * 1 | Reportes (lunes 12pm UTC) |

**Nota Hobby:** Solo 1 ejecucion/dia max. Plan Pro permite `0 */6 * * *`.

## Variables de Entorno

```
CRON_SECRET=<generar con node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SUPABASE_SERVICE_ROLE_KEY=<de Supabase Dashboard>
```

## SP-API (Futuro)

La sync con Amazon SP-API se ejecuta via cron diario (`/api/cron/sync`). Pendiente de configurar cuando exista la cuenta de Seller Central.
