"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface DriveUploadDialogProps {
  open: boolean;
  onClose: () => void;
  currentFolderId: string;
  onUploaded: () => void;
}

export function DriveUploadDialog({ open, onClose, currentFolderId, onUploaded }: DriveUploadDialogProps) {
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleSelect = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    let success = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", currentFolderId);

        const res = await fetch("/api/drive/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setUploading(false);

    if (success > 0) {
      toast.success(t("drives.upload_success", locale).replace("{count}", String(success)));
      onUploaded();
      setFiles([]);
      onClose();
    }
    if (failed > 0) {
      toast.error(t("drives.upload_failed", locale).replace("{count}", String(failed)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label={t("drive.upload_files_aria", locale)}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t("drives.upload_title", locale)}</h3>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] p-2.5 hover:bg-muted rounded-lg transition-colors flex items-center justify-center" aria-label={t("drive.close_aria", locale)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
        />

        <div
          onClick={handleSelect}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <Upload className="h-10 w-10 text-muted-foreground/70 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {files.length > 0
              ? t("drive.files_selected", locale).replace("{count}", String(files.length))
              : t("drive.click_to_select", locale)}
          </p>
        </div>

        {files.length > 0 && (
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {files.map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <FileTextIcon className="h-3 w-3 shrink-0" />
                {f.name}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("common.cancel", locale)}
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? t("drive.uploading", locale) : t("drives.upload", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
