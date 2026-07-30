"use client";

import { useMemo, useState } from "react";
import React from "react";
import { t } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAlertRules, useAlertHistory, useScheduledReports, useReorderRules } from "@/hooks/use-data";
import { AlertRule, AlertHistory, ScheduledReport, AlertConditionType, AlertChannel, ReportTemplate, ReportFrequency, ReportFormat, ReorderRuleWithProduct } from "@/types";
import { Bell, Clock, History, ShoppingCart, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, FileText, Calendar, Mail, RefreshCw, Package, Truck, AlertTriangle } from "lucide-react";

type Tab = "rules" | "history" | "schedules" | "auto-reorder";

function CONDITION_LABELS(locale: Locale): Record<AlertConditionType, string> {
  return {
    low_stock: t("alerts.condition.low_stock", locale),
    out_of_stock: t("alerts.condition.out_of_stock", locale),
    overstock: t("alerts.condition.overstock", locale),
    low_margin: t("alerts.condition.low_margin", locale),
    sales_drop: t("alerts.condition.sales_drop", locale),
    price_change: t("alerts.condition.price_change", locale),
    roi_below: t("alerts.condition.roi_below", locale),
    ppc_overbudget: t("alerts.condition.ppc_overbudget", locale),
  };
}

function ENTITY_LABELS(locale: Locale): Record<string, string> {
  return {
    inventory: t("alerts.entity.inventory", locale),
    sales: t("alerts.entity.sales", locale),
    profitability: t("alerts.entity.profitability", locale),
    price: t("alerts.entity.price", locale),
    ppc: t("alerts.entity.ppc", locale),
  };
}

function AlertSeverityBadge({ severity, locale }: { severity: string; locale: Locale }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border", colors[severity] || "bg-muted text-muted-foreground")}>
      {t(`alerts.severity.${severity}`, locale)}
    </span>
  );
}

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("rules");
  const { locale } = useLocale();
  const { rules, isLoading: rulesLoading, mutate: mutateRules } = useAlertRules();
  const { history, isLoading: historyLoading, mutate: mutateHistory } = useAlertHistory();
  const { reports, isLoading: reportsLoading, mutate: mutateReports } = useScheduledReports();

  const tabs: { id: Tab; label: string; icon: typeof Bell }[] = useMemo(() => [
    { id: "rules", label: t("alerts.rules", locale), icon: Bell },
    { id: "history", label: t("alerts.history", locale), icon: History },
    { id: "schedules", label: t("alerts.schedules", locale), icon: Clock },
    { id: "auto-reorder", label: t("alerts.reorder", locale), icon: ShoppingCart },
  ], [locale]);

  if (rulesLoading && historyLoading && reportsLoading) {
    return <PageSkeleton kpiCount={3} rowCount={4} showCharts showSearch={false} />;
  }

  return (
    <div>
      <PageHeader
        badge={t("alerts.badge", locale)}
        title={t("alerts.title", locale)}
        subtitle={t("alerts.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.alerts", locale) }]}
      />

      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-muted/50 w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {activeTab === "rules" && <RulesTab rules={rules} mutate={mutateRules} locale={locale} />}

      {/* History Tab */}
      {activeTab === "history" && <HistoryTab history={history} mutate={mutateHistory} locale={locale} />}

      {/* Schedules Tab */}
      {activeTab === "schedules" && <SchedulesTab reports={reports} mutate={mutateReports} locale={locale} />}

      {/* Auto Reorder Tab */}
      {activeTab === "auto-reorder" && <AutoReorderTab locale={locale} />}
    </div>
  );
}

/* ─── Rules Tab ─── */
function RulesTab({ rules, mutate, locale }: { rules: AlertRule[]; mutate: () => void; locale: Locale }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    entity: "inventory" as string,
    condition_type: "low_stock" as AlertConditionType,
    threshold: 5,
    channel: "in_app" as AlertChannel,
    comparison: "lt" as string,
    time_window: "24h" as string,
  });
  const [loading, setLoading] = useState(false);

  const entityLabels = useMemo(() => ENTITY_LABELS(locale), [locale]);
  const conditionLabels = useMemo(() => CONDITION_LABELS(locale), [locale]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(t("alerts.toast.create_rule_error", locale));
      toast.success(t("alerts.toast.rule_created", locale));
      setCreating(false);
      setForm({ name: "", description: "", entity: "inventory", condition_type: "low_stock", threshold: 5, channel: "in_app", comparison: "lt", time_window: "24h" });
      mutate();
    } catch {
      toast.error(t("alerts.toast.create_rule_error", locale));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (rule: AlertRule) => {
    try {
      await fetch("/api/alerts/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      mutate();
    } catch {
      toast.error(t("alerts.toast.update_error", locale));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/alerts/rules?id=${id}`, { method: "DELETE" });
      toast.success(t("alerts.toast.rule_deleted", locale));
      mutate();
    } catch {
      toast.error(t("alerts.toast.delete_error", locale));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} {t("alerts.rules_count", locale)}</p>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("alerts.new_rule", locale)}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label htmlFor="alert-rule-name" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.name", locale)}</label>
              <input
                id="alert-rule-name"
                type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("alerts.placeholder.rule_name", locale)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="alert-rule-entity" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.entity", locale)}</label>
              <select
                id="alert-rule-entity"
                value={form.entity}
                onChange={(e) => setForm({ ...form, entity: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-popover text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(entityLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="alert-rule-condition" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.condition", locale)}</label>
              <select
                id="alert-rule-condition"
                value={form.condition_type}
                onChange={(e) => setForm({ ...form, condition_type: e.target.value as AlertConditionType })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-popover text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(conditionLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="alert-rule-threshold" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.threshold", locale)}</label>
              <input
                id="alert-rule-threshold"
                type="number" value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="alert-rule-channel" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.channel", locale)}</label>
              <select
                id="alert-rule-channel"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as AlertChannel })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-popover text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="in_app">{t("alerts.channel.in_app", locale)}</option>
                <option value="email">{t("alerts.channel.email", locale)}</option>
                <option value="both">{t("alerts.channel.both", locale)}</option>
              </select>
            </div>
            <div>
              <label htmlFor="alert-rule-time-window" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.time_window", locale)}</label>
              <select
                id="alert-rule-time-window"
                value={form.time_window}
                onChange={(e) => setForm({ ...form, time_window: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-popover text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="1h">{t("alerts.time_window.1h", locale)}</option>
                <option value="24h">{t("alerts.time_window.24h", locale)}</option>
                <option value="7d">{t("alerts.time_window.7d", locale)}</option>
                <option value="30d">{t("alerts.time_window.30d", locale)}</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="alert-rule-description" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.description_optional", locale)}</label>
            <input
              id="alert-rule-description"
              type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("alerts.placeholder.description", locale)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {t("common.cancel", locale)}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !form.name.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              {t("alerts.create_rule", locale)}
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 && !creating ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("alerts.empty.no_rules", locale)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("alerts.empty.create_first_rule", locale)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">{rule.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {entityLabels[rule.entity] || rule.entity}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {conditionLabels[rule.condition_type] || rule.condition_type}
                  </span>
                </div>
                {rule.description && (
                  <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-muted-foreground">{t("alerts.display.threshold", locale)}{rule.threshold}</span>
                  <span className="text-[10px] text-muted-foreground">{t("alerts.display.channel", locale)}{rule.channel}</span>
                  {rule.last_triggered_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {t("alerts.display.last_triggered", locale)}{new Date(rule.last_triggered_at).toLocaleDateString(locale)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(rule)}
                  className={cn("p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px]", rule.enabled ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted/50")}
                >
                  {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => handleDelete(rule.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors min-w-[44px] min-h-[44px]">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── History Tab ─── */
function HistoryTab({ history, mutate, locale }: { history: AlertHistory[]; mutate: () => void; locale: Locale }) {
  const conditionLabels = useMemo(() => CONDITION_LABELS(locale), [locale]);

  const handleMarkRead = async (ids: string[]) => {
    try {
      await fetch("/api/alerts/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      mutate();
    } catch {
      toast.error(t("alerts.toast.mark_read_error", locale));
    }
  };

  const unreadIds = history.filter((h) => !h.read).map((h) => h.id);

  return (
    <div className="space-y-4">
      {unreadIds.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{unreadIds.length} {t("alerts.unread_count", locale)}</p>
          <button
            onClick={() => handleMarkRead(unreadIds)}
            className="text-xs text-primary hover:underline min-w-[44px] min-h-[44px]"
          >
            {t("alerts.mark_all_read", locale)}
          </button>
        </div>
      )}

      {history.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("alerts.empty.no_history", locale)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div
              key={h.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer",
                h.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"
              )}
              onClick={() => handleMarkRead([h.id])}
            >
              <AlertSeverityBadge severity={h.severity} locale={locale} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", h.read ? "text-foreground" : "text-foreground font-medium")}>{h.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{h.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-muted-foreground">{conditionLabels[h.condition_type as AlertConditionType] || h.condition_type}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString(locale)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Schedules Tab ─── */
function SchedulesTab({ reports, mutate, locale }: { reports: ScheduledReport[]; mutate: () => void; locale: Locale }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    template: "profitability" as ReportTemplate,
    frequency: "weekly" as ReportFrequency,
    time: "08:00",
    format: "pdf" as ReportFormat,
    recipients: [] as string[],
    emailInput: "",
  });
  const [loading, setLoading] = useState(false);

  const templateLabels: Record<string, string> = useMemo(() => ({
    profitability: t("alerts.template.profitability", locale),
    inventory: t("alerts.template.inventory", locale),
    "sales-summary": t("alerts.template.sales_summary", locale),
    "roi-ranking": t("alerts.template.roi_ranking", locale),
  }), [locale]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          template: form.template,
          frequency: form.frequency,
          time: form.time,
          format: form.format,
          recipients: form.recipients,
          channel: "email",
        }),
      });
      if (!res.ok) throw new Error("Error");
      toast.success(t("alerts.toast.schedule_created", locale));
      setCreating(false);
      setForm({ name: "", template: "profitability", frequency: "weekly", time: "08:00", format: "pdf", recipients: [], emailInput: "" });
      mutate();
    } catch {
      toast.error(t("alerts.toast.create_error", locale));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
      toast.success(t("alerts.toast.schedule_deleted", locale));
      mutate();
    } catch {
      toast.error(t("alerts.toast.delete_error", locale));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{reports.length} {t("alerts.reports_count", locale)}</p>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("alerts.submit_schedule", locale)}
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label htmlFor="schedule-name" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.name", locale)}</label>
              <input
                id="schedule-name"
                type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("alerts.placeholder.schedule_name", locale)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="schedule-template" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.template", locale)}</label>
              <select
                id="schedule-template"
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value as ReportTemplate })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-popover text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(templateLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="schedule-frequency" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.frequency", locale)}</label>
              <select
                id="schedule-frequency"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as ReportFrequency })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-popover text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="daily">{t("alerts.frequency.daily", locale)}</option>
                <option value="weekly">{t("alerts.frequency.weekly", locale)}</option>
                <option value="monthly">{t("alerts.frequency.monthly", locale)}</option>
              </select>
            </div>
            <div>
              <label htmlFor="schedule-time" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.time", locale)}</label>
              <input
                id="schedule-time"
                type="time" value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="schedule-format" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.format", locale)}</label>
              <select
                id="schedule-format"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as ReportFormat })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-popover text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="pdf">{t("alerts.format.pdf", locale)}</option>
                <option value="excel">{t("alerts.format.excel", locale)}</option>
                <option value="both">{t("alerts.format.both", locale)}</option>
              </select>
            </div>
            <div>
              <label htmlFor="schedule-email" className="text-xs text-muted-foreground mb-1 block">{t("alerts.field.recipient_email", locale)}</label>
              <div className="flex gap-1">
                <input
                  id="schedule-email"
                  type="email" value={form.emailInput}
                  onChange={(e) => setForm({ ...form, emailInput: e.target.value })}
                  placeholder={t("alerts.placeholder.email", locale)}
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => {
                    if (form.emailInput && !form.recipients.includes(form.emailInput)) {
                      setForm({ ...form, recipients: [...form.recipients, form.emailInput], emailInput: "" });
                    }
                  }}
                  className="px-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs"
                >
                  +
                </button>
              </div>
              {form.recipients.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.recipients.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                      {r}
                      <button onClick={() => setForm({ ...form, recipients: form.recipients.filter((x) => x !== r) })} className="hover:text-foreground">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground">
              {t("common.cancel", locale)}
            </button>
            <button onClick={handleSubmit} disabled={loading || !form.name.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              {t("alerts.submit_schedule", locale)}
            </button>
          </div>
        </div>
      )}

      {reports.length === 0 && !creating ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("alerts.empty.no_schedules", locale)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("alerts.empty.schedule_hint", locale)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-muted-foreground">{templateLabels[r.template] || r.template}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{r.frequency}</span>
                  <span className="text-[10px] text-muted-foreground">{r.time}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{r.format}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors min-w-[44px] min-h-[44px]">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Auto Reorder Tab ─── */
function AutoReorderTab({ locale }: { locale: Locale }) {
  const { rules, isLoading, mutate } = useReorderRules();
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    supplier_id: "",
    min_stock: 10,
    max_stock: 100,
    auto_po: false,
    lead_time_days: 30,
    safety_stock_days: 14,
    notes: "",
  });

  const needsReorder = rules.filter((r) => r.product_stock && r.product_stock <= r.min_stock);
  const activeRules = rules.filter((r) => r.enabled);

  const handleSubmit = async () => {
    if (!form.product_id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reorder-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, supplier_id: form.supplier_id || undefined }),
      });
      if (!res.ok) throw new Error("Error");
      toast.success(t("alerts.reorder.toast.rule_created", locale));
      setCreating(false);
      setForm({ product_id: "", supplier_id: "", min_stock: 10, max_stock: 100, auto_po: false, lead_time_days: 30, safety_stock_days: 14, notes: "" });
      mutate();
    } catch {
      toast.error(t("alerts.reorder.toast.create_error", locale));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (rule: ReorderRuleWithProduct) => {
    try {
      await fetch("/api/reorder-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      mutate();
    } catch {
      toast.error(t("alerts.reorder.toast.update_error", locale));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/reorder-rules?id=${id}`, { method: "DELETE" });
      toast.success(t("alerts.reorder.toast.rule_deleted", locale));
      mutate();
    } catch {
      toast.error(t("alerts.reorder.toast.delete_error", locale));
    }
  };

  if (isLoading) {
    return <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{t("alerts.reorder.kpi.active_rules", locale)}</p>
          <p className="text-lg font-display font-bold text-foreground">{activeRules.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{t("alerts.reorder.kpi.needs_reorder", locale)}</p>
          <p className="text-lg font-display font-bold text-amber-500">{needsReorder.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{t("alerts.reorder.kpi.auto_po_active", locale)}</p>
          <p className="text-lg font-display font-bold text-foreground">{rules.filter((r) => r.auto_po).length}</p>
        </div>
      </div>

      {/* Create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} {t("alerts.reorder.rules_count", locale)}</p>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("alerts.reorder.new_rule", locale)}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label htmlFor="reorder-product" className="text-xs text-muted-foreground mb-1 block">{t("alerts.reorder.field.product", locale)}</label>
              <ProductSelect
                id="reorder-product"
                value={form.product_id}
                onChange={(v) => setForm({ ...form, product_id: v })}
              />
            </div>
            <div>
              <label htmlFor="reorder-supplier" className="text-xs text-muted-foreground mb-1 block">{t("alerts.reorder.field.supplier_optional", locale)}</label>
              <SupplierSelect
                id="reorder-supplier"
                value={form.supplier_id}
                onChange={(v) => setForm({ ...form, supplier_id: v })}
              />
            </div>
            <div>
              <label htmlFor="reorder-min-stock" className="text-xs text-muted-foreground mb-1 block">{t("alerts.reorder.field.min_stock", locale)}</label>
              <input
                id="reorder-min-stock"
                type="number" value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="reorder-max-stock" className="text-xs text-muted-foreground mb-1 block">{t("alerts.reorder.field.max_stock", locale)}</label>
              <input
                id="reorder-max-stock"
                type="number" value={form.max_stock}
                onChange={(e) => setForm({ ...form, max_stock: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="reorder-lead-time" className="text-xs text-muted-foreground mb-1 block">{t("alerts.reorder.field.lead_time", locale)}</label>
              <input
                id="reorder-lead-time"
                type="number" value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="reorder-safety-stock" className="text-xs text-muted-foreground mb-1 block">{t("alerts.reorder.field.safety_stock", locale)}</label>
              <input
                id="reorder-safety-stock"
                type="number" value={form.safety_stock_days}
                onChange={(e) => setForm({ ...form, safety_stock_days: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label htmlFor="reorder-auto-po" className="flex items-center gap-2 cursor-pointer">
              <input
                id="reorder-auto-po"
                type="checkbox" checked={form.auto_po}
                onChange={(e) => setForm({ ...form, auto_po: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-xs text-foreground">{t("alerts.reorder.field.auto_po", locale)}</span>
            </label>
          </div>
          <div>
            <label htmlFor="reorder-notes" className="text-xs text-muted-foreground mb-1 block">{t("alerts.reorder.field.notes_optional", locale)}</label>
            <input
              id="reorder-notes"
              type="text" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t("alerts.reorder.placeholder.notes", locale)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground">
              {t("common.cancel", locale)}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !form.product_id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              {t("alerts.reorder.create_rule", locale)}
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 && !creating ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("alerts.reorder.empty.no_rules", locale)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("alerts.reorder.empty.hint", locale)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const needsReorder = rule.product_stock && rule.product_stock <= rule.min_stock;
            return (
              <div key={rule.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <Package className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{rule.product_name || t("common.product", locale)}</p>
                    {rule.product_sku && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{rule.product_sku}</span>
                    )}
                    {needsReorder && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3" /> {t("alerts.reorder.status.reorder", locale)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{t("alerts.reorder.display.stock", locale)}{rule.product_stock ?? "\u2014"}</span>
                    <span className="text-[10px] text-muted-foreground">{t("alerts.reorder.display.min", locale)}{rule.min_stock} / {t("alerts.reorder.display.max", locale)}{rule.max_stock}</span>
                    <span className="text-[10px] text-muted-foreground">{t("alerts.reorder.display.lead", locale)}{rule.lead_time_days}d</span>
                    {rule.supplier_name && (
                      <span className="text-[10px] text-muted-foreground">{rule.supplier_name}</span>
                    )}
                    {rule.suggested_qty && rule.suggested_qty > 0 ? (
                      <span className="text-[10px] font-medium text-green-500">{t("alerts.reorder.display.suggested", locale)}{rule.suggested_qty}{t("alerts.reorder.display.units", locale)}</span>
                    ) : null}
                    {rule.auto_po && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t("alerts.reorder.display.auto_po", locale)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={cn("p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px]", rule.enabled ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted/50")}
                  >
                    {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors min-w-[44px] min-h-[44px]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [search, setSearch] = useState("");
  const { locale } = useLocale();

  React.useEffect(() => {
    fetch("/api/products?limit=200")
      .then((r) => r.json())
      .then((d) => setProducts(d.data || []))
      .catch((err) => console.error("ERROR fetching products for alert select", err));
  }, []);

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("alerts.reorder.placeholder.search_product", locale)}
        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {search && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-40 overflow-y-auto">
          {filtered.slice(0, 10).map((p) => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setSearch(`${p.name} (${p.sku})`); }}
              className="w-full text-start px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors"
            >
              {p.name} <span className="text-muted-foreground font-mono">{p.sku}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const { locale } = useLocale();

  React.useEffect(() => {
    fetch("/api/suppliers?limit=200")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.data || []))
      .catch((err) => console.error("ERROR fetching suppliers for alert select", err));
  }, []);

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("alerts.reorder.placeholder.search_supplier", locale)}
        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {search && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-40 overflow-y-auto">
          <button
            onClick={() => { onChange(""); setSearch(t("common.no_supplier", locale)); }}
            className="w-full text-start px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50"
          >
            {t("common.no_supplier", locale)}
          </button>
          {filtered.slice(0, 10).map((s) => (
            <button
              key={s.id}
              onClick={() => { onChange(s.id); setSearch(s.name); }}
              className="w-full text-start px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
