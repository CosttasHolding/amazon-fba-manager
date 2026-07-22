"use client";

import { useState } from "react";
import { Upload, FolderPlus, ChevronRight, Home, RefreshCw } from "lucide-react";
import type { DriveFolder } from "@/lib/drive";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface DriveToolbarProps {
  path: DriveFolder[];
  onNavigate: (folderId: string) => void;
  onUploadClick: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
}

export function DriveToolbar({ path, onNavigate, onUploadClick, onNewFolder, onRefresh }: DriveToolbarProps) {
  const { locale } = useLocale();
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1 text-sm min-w-0">
        <button
          onClick={() => onNavigate("root")}
          className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted transition-colors shrink-0 flex items-center justify-center"
          aria-label={t("drive.go_home", locale)}
        >
          <Home className="h-4 w-4 text-muted-foreground" />
        </button>
        {path.map((folder, i) => (
          <div key={folder.id} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <button
              onClick={() => onNavigate(folder.id)}
              className={`truncate px-2.5 py-1.5 min-w-[44px] min-h-[44px] rounded-md hover:bg-muted transition-colors ${
                i === path.length - 1
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center"
            title={t("drives.title_refresh", locale)}
          aria-label={t("drive.refresh_aria", locale)}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={onNewFolder}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-sm"
          aria-label={t("drive.new_folder_aria", locale)}
        >
          <FolderPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("drives.new_folder", locale)}</span>
        </button>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          aria-label={t("drive.upload_aria", locale)}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">{t("drives.upload", locale)}</span>
        </button>
      </div>
    </div>
  );
}

export function NewFolderDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const { locale } = useLocale();
  if (!open) return null;

  return (
    <FolderNameDialog
      title={t("drives.new_folder", locale)}
      placeholder={t("drives.folder_name_placeholder", locale)}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

export function RenameDialog({
  open,
  currentName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const { locale } = useLocale();
  if (!open) return null;

  return (
    <FolderNameDialog
      title={t("drive.rename", locale)}
      initialValue={currentName}
      placeholder={t("drives.new_name_placeholder", locale)}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function FolderNameDialog({
  title,
  initialValue,
  placeholder,
  onClose,
  onConfirm,
}: {
  title: string;
  initialValue?: string;
  placeholder: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const { locale } = useLocale();
  const [name, setName] = useState(initialValue || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
      setName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("common.cancel", locale)}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("drive.confirm", locale)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
