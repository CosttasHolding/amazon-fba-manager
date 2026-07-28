"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { t } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { toast } from "sonner";
import {
  Link2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
  Loader2,
  Package,
  ShoppingCart,
  PackageSearch,
  DollarSign,
  Undo2,
  Banknote,
  Bell,
  BellOff,
  Webhook,
} from "lucide-react";

interface Connection {
  id: string;
  marketplace: string;
  seller_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  items_processed: number;
  items_failed: number;
  created_at: string;
  completed_at: string | null;
}

interface WebhookSubscription {
  id: string;
  notification_type: string;
  status: string;
  last_received_at: string | null;
  created_at: string;
  sp_api_connections?: { marketplace: string; seller_id: string };
}

interface WebhookLog {
  id: string;
  notification_type: string;
  status: string;
  amazon_notification_id: string;
  processing_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

function SYNC_ACTIONS(locale: Locale) {
  return [
    { type: "products" as const, label: t("sp_api.action_products", locale), icon: Package, color: "primary" },
    { type: "orders" as const, label: t("sp_api.action_orders", locale), icon: ShoppingCart, color: "primary" },
    { type: "inventory" as const, label: t("sp_api.action_inventory", locale), icon: PackageSearch, color: "primary" },
    { type: "fees" as const, label: t("sp_api.action_fees", locale), icon: DollarSign, color: "primary" },
    { type: "returns" as const, label: t("sp_api.action_returns", locale), icon: Undo2, color: "primary" },
    { type: "payouts" as const, label: t("sp_api.action_payouts", locale), icon: Banknote, color: "primary" },
  ];
}

export default function SpApiPage() {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [activeTab, setActiveTab] = useState<"sync" | "webhooks">("sync");
  const [webhookSubscriptions, setWebhookSubscriptions] = useState<WebhookSubscription[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookActivating, setWebhookActivating] = useState(false);
  const syncActions = SYNC_ACTIONS(locale);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sp-api/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.data || []);
      }
    } catch {
      toast.error(t("sp_api.error_load", locale));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchConnections();
    fetchSyncLogs();
    fetchWebhookSubscriptions();
    fetchWebhookLogs();

    const error = searchParams.get("error");
    const connected = searchParams.get("connected");

    if (error) toast.error(t("sp_api.error_connect", locale).replace("{error}", decodeURIComponent(error)));
    if (connected) toast.success(t("sp_api.connected_success", locale));
  }, [searchParams, locale, fetchConnections]);

  const fetchSyncLogs = async () => {
    try {
      const res = await fetch("/api/sp-api/sync?limit=10");
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data.data || []);
      }
    } catch (e) {
      console.error("ERROR fetching sync logs", e);
    }
  };

  const fetchWebhookSubscriptions = async () => {
    try {
      const res = await fetch("/api/sp-api/webhooks/subscribe");
      if (res.ok) {
        const data = await res.json();
        setWebhookSubscriptions(data.data || []);
      }
    } catch (e) {
      console.error("ERROR fetching webhook subscriptions", e);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      const res = await fetch("/api/sp-api/webhooks?limit=20");
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data.data || []);
      }
    } catch (e) {
      console.error("ERROR fetching webhook logs", e);
    }
  };

  const handleActivateWebhooks = async () => {
    const activeConnection = connections.find((c) => c.status === "active");
    if (!activeConnection) {
      toast.error(t("sp_api.webhooks_connect_first", locale));
      return;
    }

    setWebhookActivating(true);
    try {
      const res = await fetch("/api/sp-api/webhooks/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: activeConnection.id }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(t("sp_api.webhooks_activated", locale));
        fetchWebhookSubscriptions();
      } else {
        toast.error(result.error || t("sp_api.webhooks_error_activate", locale));
      }
    } catch {
      toast.error(t("sp_api.webhooks_error_activate", locale));
    } finally {
      setWebhookActivating(false);
    }
  };

  const handleDeactivateWebhook = async (subscriptionId: string, notificationType: string) => {
    try {
      const res = await fetch(`/api/sp-api/webhooks/subscribe?subscriptionId=${subscriptionId}&notificationType=${encodeURIComponent(notificationType)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("sp_api.webhooks_deactivated", locale));
        fetchWebhookSubscriptions();
      } else {
        toast.error(t("sp_api.webhooks_error_deactivate", locale));
      }
    } catch {
      toast.error(t("sp_api.webhooks_error_deactivate", locale));
    }
  };

  const WEBHOOK_TYPE_LABELS: Record<string, string> = {
    ORDER_STATUS_CHANGED: "sp_api.webhooks_type_order",
    INVENTORY_EVENT: "sp_api.webhooks_type_inventory",
    FULFILLMENT_ORDER_STATUS_CHANGED: "sp_api.webhooks_type_fulfillment",
    FEES_INVENTORY_HEALTH_CHANGED: "sp_api.webhooks_type_fees",
    ANY_OFFER_CHANGED: "sp_api.webhooks_type_any_offer",
    PRICING_HEALTH_CHANGED: "sp_api.webhooks_type_pricing",
    PRODUCT_TYPE_CHANGED: "sp_api.webhooks_type_product",
    REPORT_PROCESSING_FINISHED: "sp_api.webhooks_type_report",
  };

  const handleConnect = async () => {
    try {
      const res = await fetch("/api/sp-api/auth");
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const err = await res.json();
        toast.error(err.error || t("sp_api.error_init_connect", locale));
      }
    } catch {
      toast.error(t("sp_api.error_connect_amazon", locale));
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/sp-api/connections/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("sp_api.disconnected", locale));
        fetchConnections();
      } else {
        toast.error(t("sp_api.error_disconnect", locale));
      }
    } catch {
      toast.error(t("sp_api.error_disconnect", locale));
    }
  };

  const handleSyncAll = async () => {
    const activeConnection = connections.find((c) => c.status === "active");
    if (!activeConnection) {
      toast.error(t("sp_api.error_connect_first", locale));
      return;
    }

    setSyncingAll(true);
    try {
      const types = ["products", "orders", "inventory", "fees"];
      let successCount = 0;
      let failCount = 0;

      for (const syncType of types) {
        try {
          const res = await fetch("/api/sp-api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              syncType,
              connectionId: activeConnection.id,
            }),
          });
          const result = await res.json();
          if (result.success) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(t("sp_api.sync_completed", locale).replace("{count}", String(successCount)));
      } else {
        toast.warning(
          `${successCount} ${t("sp_api.sync_completed", locale).split(" ").slice(1).join(" ")}, ${failCount} failed`
        );
      }
      fetchSyncLogs();
    } catch {
      toast.error(t("sp_api.error_sync_auto", locale));
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSync = async (type: string) => {
    const activeConnection = connections.find((c) => c.status === "active");
    if (!activeConnection) {
      toast.error(t("sp_api.error_connect_first", locale));
      return;
    }

    setSyncing(type);
    try {
      const res = await fetch("/api/sp-api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncType: type,
          connectionId: activeConnection.id,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(t("sp_api.sync_processed", locale).replace("{type}", type).replace("{processed}", String(result.processed)));
      } else {
        toast.error(result.error || t("sp_api.error_sync_type", locale).replace("{type}", type));
      }
      fetchSyncLogs();
    } catch {
      toast.error(t("sp_api.error_sync_connection", locale));
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <PageSkeleton kpiCount={3} rowCount={3} showSearch={false} />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("badge.sp_api", locale)}
        title="Amazon SP-API"
        subtitle={t("sp_api.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.sp_api", locale) }]}
      />

      {connections.length === 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("sp_api.connect_info_title", locale)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("sp_api.connect_info_desc", locale)}
                </p>
              </div>
            </div>

            <Button onClick={handleConnect} className="w-full sm:w-auto">
              <Link2 className="h-4 w-4 me-2" />
              {t("sp_api.connect_button", locale)}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <p className="text-sm font-medium text-foreground">{t("sp_api.preparation_status", locale)}</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">{t("sp_api.prep_automation_endpoints", locale)}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">{t("sp_api.prep_notifications_table", locale)}</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">{t("sp_api.prep_credentials", locale)}</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">{t("sp_api.prep_seller_account", locale)}</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {connections.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-2xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Amazon {conn.marketplace}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conn.seller_id !== "pending" ? conn.seller_id : t("sp_api.pending_seller_id", locale)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title={t("sp_api.disconnect_title", locale)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    conn.status === "active" ? "bg-emerald-500" : "bg-red-500"
                  }`} />
                  <span className="text-muted-foreground">
                    {conn.status === "active" ? t("sp_api.status_active", locale) : conn.status}
                  </span>
                  <span className="text-muted-foreground/70">{"—"}</span>
                  <span className="text-muted-foreground">
                    {t("sp_api.connected_since", locale)} {new Date(conn.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}
                  </span>
                </div>
              </div>
            ))}

            <button
              onClick={handleConnect}
              className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-5 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <Link2 className="h-6 w-6 text-muted-foreground/70 group-hover:text-primary transition-colors" />
              <p className="text-xs text-muted-foreground/70 group-hover:text-foreground transition-colors">
                {t("sp_api.add_marketplace", locale)}
              </p>
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50 w-fit">
            <button
              onClick={() => setActiveTab("sync")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "sync" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              {t("sp_api.sync_title", locale)}
            </button>
            <button
              onClick={() => setActiveTab("webhooks")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "webhooks" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Webhook className="h-4 w-4" />
              {t("sp_api.webhooks_tab", locale)}
            </button>
          </div>

          {activeTab === "sync" && (
            <>
              <DataTableWrapper title={t("sp_api.sync_title", locale)} icon={RefreshCw}>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={handleSyncAll}
                  disabled={syncing !== null || syncingAll}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {syncingAll ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <RefreshCw className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  <span className="text-[11px] text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors">
                    {t("sp_api.sync_all", locale)}
                  </span>
                </button>
                {syncActions.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => handleSync(action.type)}
                    disabled={syncing !== null}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {syncing === action.type ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <span className="text-[11px] text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            </DataTableWrapper>

              <DataTableWrapper title={t("sp_api.history_title", locale)} icon={RefreshCw}>
                {syncLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("sp_api.empty_history", locale)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("sp_api.empty_history_hint", locale)}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-start">
                            {t("sp_api.type_header", locale)}
                          </th>
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-start">
                            {t("sp_api.status_header", locale)}
                          </th>
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-end">
                            {t("sp_api.processed_header", locale)}
                          </th>
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-end">
                            {t("sp_api.failed_header", locale)}
                          </th>
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-end">
                            {t("sp_api.date_header", locale)}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncLogs.map((log) => (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-foreground/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground/80 capitalize">{log.sync_type}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                log.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : log.status === "failed"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}>
                                {log.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                {log.status === "failed" && <AlertTriangle className="h-3 w-3" />}
                                {log.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-end text-foreground/70 tabular-nums">
                              {log.items_processed}
                            </td>
                            <td className="px-4 py-3 text-sm text-end text-red-500 tabular-nums">
                              {log.items_failed}
                            </td>
                            <td className="px-4 py-3 text-sm text-end text-muted-foreground tabular-nums">
                              {new Date(log.created_at).toLocaleString(locale === "en" ? "en-US" : "es-ES")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DataTableWrapper>
            </>
          )}

          {activeTab === "webhooks" && (
            <>
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t("sp_api.webhooks_title", locale)}</p>
                      <p className="text-xs text-muted-foreground">{t("sp_api.webhooks_subtitle", locale)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleActivateWebhooks}
                    disabled={webhookActivating || connections.length === 0}
                    variant={webhookSubscriptions.some((s) => s.status === "active") ? "outline" : "default"}
                  >
                    {webhookActivating ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : webhookSubscriptions.some((s) => s.status === "active") ? (
                      <BellOff className="h-4 w-4 me-2" />
                    ) : (
                      <Bell className="h-4 w-4 me-2" />
                    )}
                    {webhookSubscriptions.some((s) => s.status === "active")
                      ? t("sp_api.webhooks_deactivate", locale)
                      : webhookActivating
                      ? t("sp_api.webhooks_activating", locale)
                      : t("sp_api.webhooks_activate", locale)}
                  </Button>
                </div>

                {webhookSubscriptions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {webhookSubscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-border bg-muted/30 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate">
                            {t(WEBHOOK_TYPE_LABELS[sub.notification_type] || sub.notification_type, locale)}
                          </span>
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            sub.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : sub.status === "error"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {sub.status === "active"
                              ? t("sp_api.webhooks_status_active", locale)
                              : sub.status === "error"
                              ? t("sp_api.webhooks_status_error", locale)
                              : sub.status === "paused"
                              ? t("sp_api.webhooks_status_paused", locale)
                              : t("sp_api.webhooks_status_pending", locale)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t("sp_api.webhooks_last_received", locale)}:{" "}
                          {sub.last_received_at
                            ? new Date(sub.last_received_at).toLocaleString(locale === "en" ? "en-US" : "es-ES")
                            : t("sp_api.webhooks_never", locale)}
                        </p>
                        {sub.status === "active" && (
                          <button
                            onClick={() => handleDeactivateWebhook(sub.id, sub.notification_type)}
                            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                          >
                            {t("sp_api.webhooks_deactivate", locale)}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DataTableWrapper title={t("sp_api.webhooks_logs_title", locale)} icon={Webhook}>
                {webhookLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Webhook className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("sp_api.webhooks_logs_empty", locale)}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-start">
                            {t("sp_api.type_header", locale)}
                          </th>
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-start">
                            {t("sp_api.status_header", locale)}
                          </th>
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-end">
                            {t("sp_api.webhooks_logs_time", locale)}
                          </th>
                          <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-end">
                            {t("sp_api.date_header", locale)}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {webhookLogs.map((log) => (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-foreground/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground/80">
                              {t(WEBHOOK_TYPE_LABELS[log.notification_type] || log.notification_type, locale)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                log.status === "processed"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : log.status === "failed"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}>
                                {log.status === "processed" && <CheckCircle2 className="h-3 w-3" />}
                                {log.status === "failed" && <AlertTriangle className="h-3 w-3" />}
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-end text-muted-foreground tabular-nums">
                              {log.processing_time_ms != null
                                ? t("sp_api.webhooks_logs_ms", locale).replace("{time}", String(log.processing_time_ms))
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-end text-muted-foreground tabular-nums">
                              {new Date(log.created_at).toLocaleString(locale === "en" ? "en-US" : "es-ES")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DataTableWrapper>
            </>
          )}
        </>
      )}
    </div>
  );
}
