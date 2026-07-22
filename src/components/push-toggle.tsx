"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePushNotification } from "@/components/push-notification-provider";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

export function PushToggle() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } =
    usePushNotification();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(false);

  if (!isSupported) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success(t("push.unsubscribed", locale));
      } else {
        await subscribe();
        toast.success(t("push.subscribed", locale));
      }
    } catch {
      toast.error(
        isSubscribed
          ? t("push.unsubscribe_error", locale)
          : t("push.subscribe_error", locale)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={
        isSubscribed
          ? t("push.disable", locale)
          : t("push.enable", locale)
      }
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
        isSubscribed
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
          : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {isSubscribed
        ? t("push.enabled", locale)
        : t("push.disabled", locale)}
    </button>
  );
}
