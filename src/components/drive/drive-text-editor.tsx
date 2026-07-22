"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { DriveFile } from "@/lib/drive";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface DriveTextEditorProps {
  file: DriveFile;
  onClose: () => void;
  onSaved: () => void;
}

export function DriveTextEditor({ file, onClose, onSaved }: DriveTextEditorProps) {
  const { locale } = useLocale();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modified, setModified] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/drive/download/${file.id}`, { signal: controller.signal });
        if (res.ok) {
          const text = await res.text();
          setContent(text);
        } else {
          toast.error(t("drives.error_load_content", locale));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(t("drives.error_load_content", locale));
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
    return () => controller.abort();
  }, [file.id, locale]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/drive/update/${file.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        toast.success(t("drives.saved", locale));
        setModified(false);
        onSaved();
      } else {
        toast.error(t("drives.error_save", locale));
      }
    } catch {
      toast.error(t("drives.error_save", locale));
    } finally {
      setSaving(false);
    }
  }, [file.id, content, onSaved, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{file.name}</span>
          <span className="text-xs text-muted-foreground">- {t("drives.editing", locale)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !modified}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? t("drives.saving", locale) : t("drives.save", locale)}
          </button>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] p-2.5 hover:bg-muted rounded-lg transition-colors flex items-center justify-center" aria-label={t("drive.close_editor", locale)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setModified(true);
        }}
        className="w-full h-96 p-4 bg-transparent text-foreground font-mono text-sm resize-none focus:outline-none"
        spellCheck={false}
      />
      <div className="px-4 py-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {content.length} {t("drive.characters", locale)}
        </span>
        {modified && (
          <span className="text-xs text-amber-500">{t("drives.unsaved", locale)}</span>
        )}
      </div>
    </div>
  );
}
