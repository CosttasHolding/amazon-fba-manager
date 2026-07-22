"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Share2, Copy, Check, Loader2, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface SharedLink {
  id: string;
  token: string;
  title: string;
  active: boolean;
  created_at: string;
}

export function ShareDashboard() {
  const { locale } = useLocale();
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const { data, isLoading } = useSWR<{ data: SharedLink[] }>("/api/share", fetcher);
  const links = data?.data?.filter((l) => l.active) || [];

  const handleCreate = async () => {
    setCreating(true);
    try {
      await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || t("share.default_title", locale) }),
      });
      mutate("/api/share");
      setTitle("");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (token: string) => {
    await fetch(`/api/share?token=${token}`, { method: "DELETE" });
    mutate("/api/share");
  };

  const handleCopy = useCallback((token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="share-title" className="text-xs text-muted-foreground mb-1 block">{t("share.title_label", locale)}</label>
          <input
            id="share-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("share.title_placeholder", locale)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {t("share.generate_link", locale)}
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">{t("common.loading", locale)}</div>
      ) : links.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          {t("share.no_active_links", locale)}
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const url = `${window.location.origin}/share/${link.token}`;
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{url}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t("share.created_prefix", locale)} {new Date(link.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => window.open(url, "_blank")}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    title={t("share.open_link", locale)}
                    aria-label={t("accessibility.open_link", locale)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(link.token)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    title={t("share.copy_link", locale)}
                    aria-label={t("accessibility.copy_link", locale)}
                  >
                    {copiedId === link.token ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(link.token)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title={t("share.deactivate", locale)}
                    aria-label={t("accessibility.delete_link", locale)}
                  >
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
