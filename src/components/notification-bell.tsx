"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  PackageX,
  BoxesIcon,
  TrendingDown,
  CheckCircle2,
  Info,
  X,
  CheckCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { NotificationsResponse, Notification, NotificationPriority } from "@/types";

const PRIORITY_CONFIG: Record<
  NotificationPriority,
  { color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  critical: {
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    icon: PackageX,
  },
  warning: {
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    icon: AlertTriangle,
  },
  info: {
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    icon: Info,
  },
  success: {
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    icon: CheckCircle2,
  },
};

const TYPE_ICON: Record<string, React.ElementType> = {
  out_of_stock: PackageX,
  low_stock: AlertTriangle,
  overstock: BoxesIcon,
  low_margin: TrendingDown,
  import_complete: CheckCircle2,
  import_error: AlertTriangle,
  system: Info,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Hace ${diffD}d`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const dismissedParam = Array.from(dismissed).join(",");
      const url = dismissedParam
        ? `/api/notifications?dismissed=${encodeURIComponent(dismissedParam)}`
        : "/api/notifications";
      const res = await fetch(url);
      if (res.ok) {
        const json: NotificationsResponse = await res.json();
        setData(json);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [dismissed]);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (data) {
      setData({
        ...data,
        notifications: data.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unread_count: Math.max(0, data.unread_count - 1),
      });
    }
  };

  const handleDismissAll = () => {
    if (!data) return;
    const allIds = new Set(dismissed);
    data.notifications.forEach((n) => allIds.add(n.id));
    setDismissed(allIds);
    setData({
      ...data,
      notifications: data.notifications.map((n) => ({ ...n, read: true })),
      unread_count: 0,
    });
  };

  const handleClickNotification = (notification: Notification) => {
    if (notification.product_id) {
      router.push(`/products/${notification.product_id}`);
      setOpen(false);
    }
  };

  const unreadCount = data?.unread_count ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-all duration-200 group"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notification-panel"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
      >
        <Bell className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none shadow-lg shadow-destructive/30 animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Pulse animation when there are critical notifications */}
        {notifications.some((n) => n.priority === "critical" && !n.read) && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-destructive/40 animate-ping" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          id="notification-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 z-50 animate-in fade-in-0 slide-in-from-top-2 zoom-in-95 duration-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchNotifications()}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="Actualizar"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Leer todas
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Cargando…</p>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2 text-center px-6">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                    <Bell className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Todo en orden
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    No hay alertas activas en este momento
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notification) => {
                  const config = PRIORITY_CONFIG[notification.priority];
                  const TypeIcon = TYPE_ICON[notification.type] || config.icon;
                  const isRead = notification.read;

                  return (
                    <div
                      key={notification.id}
                      className={`group relative flex gap-3 px-4 py-3 transition-all duration-150 ${
                        isRead
                          ? "opacity-50 hover:opacity-70"
                          : "hover:bg-muted/30"
                      } ${notification.product_id ? "cursor-pointer" : ""}`}
                      onClick={() => handleClickNotification(notification)}
                    >
                      {/* Unread indicator */}
                      {!isRead && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}

                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bgColor} border ${config.borderColor} flex items-center justify-center mt-0.5`}
                      >
                        <TypeIcon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs font-semibold ${
                              isRead ? "text-muted-foreground" : config.color
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap flex-shrink-0">
                            {timeAgo(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.product_sku && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/50 text-muted-foreground/70">
                            {notification.product_sku}
                          </span>
                        )}
                      </div>

                      {/* Dismiss button */}
                      {!isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(notification.id);
                          }}
                          className="flex-shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-all duration-150"
                          title="Marcar como leída"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground/60">
                  {notifications.length} alerta{notifications.length !== 1 ? "s" : ""} activa{notifications.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => {
                    router.push("/inventory");
                    setOpen(false);
                  }}
                  className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Ver inventario →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}