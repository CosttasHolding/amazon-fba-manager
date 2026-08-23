"use client";

import { Download, Trash2, Edit3, Eye, FileEdit, Loader2, ExternalLink } from "lucide-react";
import { DriveFileIcon } from "./drive-file-icon";
import type { DriveFile } from "@/lib/drive";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface DriveFileListProps {
  files: DriveFile[];
  loading: boolean;
  onFolderClick: (folder: DriveFile) => void;
  onEdit: (file: DriveFile) => void;
  onViewImage: (file: DriveFile) => void;
  onDelete: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onDownload: (file: DriveFile) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function DriveFileList({
  files,
  loading,
  onFolderClick,
  onEdit,
  onViewImage,
  onDelete,
  onRename,
  onDownload,
  hasMore,
  loadingMore,
  onLoadMore,
}: DriveFileListProps) {
  const { locale } = useLocale();
  const canEdit = (mime: string) =>
    mime === "text/plain" ||
    mime === "text/markdown" ||
    mime === "text/csv" ||
    mime === "application/json" ||
    mime === "text/html" ||
    mime === "text/css" ||
    mime === "application/xml";

  const isImage = (mime: string) => mime.startsWith("image/");

  const isGoogleDoc = (mime: string) =>
    mime.startsWith("application/vnd.google-apps.");

  const openInDrive = (file: DriveFile) => {
    if (file.webViewLink) window.open(file.webViewLink, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <FolderOpenIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">{t("drives.empty_folder", locale)}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{t("drives.empty_hint", locale)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-start">
              {t("drive.column_name", locale)}
            </th>
            <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-start hidden sm:table-cell">
              {t("drive.column_type", locale)}
            </th>
            <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-end hidden md:table-cell">
              {t("drive.column_size", locale)}
            </th>
            <th scope="col" className="font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-end hidden md:table-cell">
              {t("drive.column_modified", locale)}
            </th>
            <th scope="col" className="px-4 py-3 text-end">
              <span className="sr-only">{t("drives.actions", locale)}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.id}
              className="border-b border-border/50 hover:bg-foreground/[0.02] transition-colors"
            >
              <td className="px-4 py-3">
                <button
                  onClick={() => {
                    if (file.isFolder) onFolderClick(file);
                    else if (isGoogleDoc(file.mimeType) && file.webViewLink) openInDrive(file);
                  }}
                  className="flex items-center gap-2.5 min-w-0"
                >
                  <DriveFileIcon mimeType={file.mimeType} isFolder={file.isFolder} />
                  <span className="text-sm text-foreground/80 truncate hover:text-foreground transition-colors">
                    {file.name}
                  </span>
                </button>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground">
                  {file.isFolder ? t("drive.type_folder", locale) : file.mimeType.split("/").pop()}
                </span>
              </td>
              <td className="px-4 py-3 text-end hidden md:table-cell">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {file.isFolder ? "—" : formatSize(Number(file.size))}
                </span>
              </td>
              <td className="px-4 py-3 text-end hidden md:table-cell">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(file.modifiedTime, locale)}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <div className="flex items-center justify-end gap-1">
                  {!file.isFolder && canEdit(file.mimeType) && (
                    <button
                      onClick={() => onEdit(file)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                      title={t("drive.action_edit", locale)}
                      aria-label={t("drive.action_edit_file", locale)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!file.isFolder && isImage(file.mimeType) && (
                    <button
                      onClick={() => onViewImage(file)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                      title={t("drive.action_view", locale)}
                      aria-label={t("drive.action_view_image", locale)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!file.isFolder && file.webViewLink && (
                    <button
                      onClick={() => openInDrive(file)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                      title={t("drive.action_open_drive", locale)}
                      aria-label={t("drive.action_open_drive", locale)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!file.isFolder && (
                    <button
                      onClick={() => onDownload(file)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                      title={t("drive.action_download", locale)}
                      aria-label={t("drive.action_download_file", locale)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!file.isFolder && canEdit(file.mimeType) && (
                    <button
                      onClick={() => onRename(file)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                      title={t("drive.action_rename", locale)}
                      aria-label={t("drive.action_rename_file", locale)}
                    >
                      <FileEdit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!file.isFolder && (
                    <button
                      onClick={() => onDelete(file)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                      title={t("drive.action_delete", locale)}
                      aria-label={t("drive.action_delete_file", locale)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted text-sm text-foreground hover:bg-muted/80 disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("drive.load_more", locale)}
          </button>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
