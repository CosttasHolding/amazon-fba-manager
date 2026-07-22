"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DriveBrowser } from "@/components/drive/drive-browser";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

export default function DrivePage() {
  const { locale } = useLocale();
  const [checkingAuth, setCheckingAuth] = useState(false);

  const handleConnect = async () => {
    window.location.href = "/api/drive/auth";
  };

  const handleDisconnect = async () => {
    setCheckingAuth(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from("user_settings").update({ drive_refresh_token: null }).eq("user_id", user.id);
        toast.success(t("drives.disconnected", locale));
      }
    } catch {
      toast.error(t("drives.error_disconnect", locale));
    } finally {
      setCheckingAuth(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("drive.badge", locale)}
        title={t("drive.title", locale)}
        subtitle={t("drive.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.drive", locale) }]}
      >
        <div className="flex gap-2">
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t("drive.connect", locale)}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={checkingAuth}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            {checkingAuth && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("drive.disconnect", locale)}
          </button>
        </div>
      </PageHeader>
      <DriveBrowser />
    </div>
  );
}
