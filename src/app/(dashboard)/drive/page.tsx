"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DriveBrowser } from "@/components/drive/drive-browser";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { useOrg } from "@/hooks/use-org";

export default function DrivePage() {
  const { locale } = useLocale();
  const { org } = useOrg();
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [browserVersion, setBrowserVersion] = useState(0);

  const handleConnect = async () => {
    const query = org?.id ? `?orgId=${encodeURIComponent(org.id)}` : "";
    window.location.href = `/api/drive/auth${query}`;
  };

  const handleDisconnect = async () => {
    setCheckingAuth(true);
    try {
      const headers = org?.id ? { "x-org-id": org.id } : undefined;
      const response = await fetch("/api/drive/connections", { headers });
      if (!response.ok) throw new Error("No se pudieron cargar las conexiones");

      const { data: connections } = await response.json();
      const activeConnection = connections?.find(
        (connection: { id?: string; status?: string }) => connection.status === "active"
      );
      if (!activeConnection?.id) {
        toast.error(t("drives.error_disconnect", locale));
        return;
      }

      const connectionId = selectedConnectionId || activeConnection.id;
      const deleteResponse = await fetch(`/api/drive/connections/${connectionId}`, {
        method: "DELETE",
        headers,
      });
      if (!deleteResponse.ok) throw new Error("No se pudo revocar la conexión");

      setSelectedConnectionId(null);
      setBrowserVersion((version) => version + 1);
      toast.success(t("drives.disconnected", locale));
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
      <DriveBrowser key={browserVersion} onConnectionChange={setSelectedConnectionId} />
    </div>
  );
}
