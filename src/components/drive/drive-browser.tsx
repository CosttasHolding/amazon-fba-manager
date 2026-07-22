"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { HardDrive } from "lucide-react";
import { DriveToolbar, NewFolderDialog } from "./drive-toolbar";
import { DriveFileList } from "./drive-file-list";
import { DriveUploadDialog } from "./drive-upload-dialog";
import { DriveTextEditor } from "./drive-text-editor";
import { DriveImageViewer } from "./drive-image-viewer";
import { DriveBackup } from "./drive-backup";
import type { DriveFile, DriveFolder } from "@/lib/drive";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

export function DriveBrowser() {
  const { locale } = useLocale();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [path, setPath] = useState<DriveFolder[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFile, setEditingFile] = useState<DriveFile | null>(null);
  const [viewingImage, setViewingImage] = useState<DriveFile | null>(null);

  const fetchFiles = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderId !== "root") params.set("folderId", folderId);
      const res = await fetch(`/api/drive/list?${params}`);
      if (res.ok) {
        const json = await res.json();
        setFiles(json.data.files || []);
      } else {
        toast.error(t("drives.error_load", locale));
      }
    } catch {
      toast.error(t("drives.error_load", locale));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId, fetchFiles]);

  const navigateTo = useCallback((folderId: string) => {
    if (folderId === "root") {
      setCurrentFolderId("root");
      setPath([]);
    } else {
      setCurrentFolderId(folderId);
    }
  }, []);

  const handleFolderClick = useCallback((folder: DriveFile) => {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  }, []);

  const handleDelete = useCallback(async (file: DriveFile) => {
    if (!confirm(t("drives.confirm_delete", locale).replace("{name}", file.name))) return;
    try {
      const res = await fetch(`/api/drive/delete/${file.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("drives.deleted", locale));
        fetchFiles(currentFolderId);
      } else {
        toast.error(t("drives.error_delete", locale));
      }
    } catch {
      toast.error(t("drives.error_delete", locale));
    }
  }, [currentFolderId, fetchFiles, locale]);

  const handleNewFolder = useCallback(async (name: string) => {
    try {
      const res = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: currentFolderId === "root" ? undefined : currentFolderId }),
      });
      if (res.ok) {
        toast.success(t("drives.folder_created", locale));
        setShowNewFolder(false);
        fetchFiles(currentFolderId);
      } else {
        toast.error(t("drives.error_create_folder", locale));
      }
    } catch {
      toast.error(t("drives.error_create_folder", locale));
    }
  }, [currentFolderId, fetchFiles, locale]);

  const handleDownload = useCallback(async (file: DriveFile) => {
    const a = document.createElement("a");
    a.href = `/api/drive/download/${file.id}`;
    a.download = file.name;
    a.click();
  }, []);

  const handleEdit = useCallback((file: DriveFile) => {
    setViewingImage(null);
    setEditingFile(file);
  }, []);

  const handleViewImage = useCallback((file: DriveFile) => {
    setEditingFile(null);
    setViewingImage(file);
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <DriveToolbar
        path={path}
        onNavigate={navigateTo}
        onUploadClick={() => setShowUpload(true)}
        onNewFolder={() => setShowNewFolder(true)}
        onRefresh={() => fetchFiles(currentFolderId)}
      />

      <DriveBackup />

      <DriveFileList
        files={files}
        loading={loading}
        onFolderClick={handleFolderClick}
        onEdit={handleEdit}
        onViewImage={handleViewImage}
        onDelete={handleDelete}
        onRename={(file) => {
          const newName = prompt(t("drive.rename_prompt", locale), file.name);
          if (newName && newName !== file.name) {
            fetch(`/api/drive/rename/${file.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName }),
            }).then((res) => {
              if (res.ok) {
                toast.success(t("drives.renamed", locale));
                fetchFiles(currentFolderId);
              } else {
                toast.error(t("drives.error_rename", locale));
              }
            });
          }
        }}
        onDownload={handleDownload}
      />

      {editingFile && (
        <DriveTextEditor
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSaved={() => fetchFiles(currentFolderId)}
        />
      )}

      {viewingImage && (
        <DriveImageViewer
          file={viewingImage}
          onClose={() => setViewingImage(null)}
        />
      )}

      <DriveUploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        currentFolderId={currentFolderId}
        onUploaded={() => fetchFiles(currentFolderId)}
      />

      <NewFolderDialog
        open={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        onConfirm={handleNewFolder}
      />
    </div>
  );
}
