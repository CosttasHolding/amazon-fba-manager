"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HardDrive, Loader2 } from "lucide-react";
import { DriveToolbar } from "./drive-toolbar";
import { DriveFileList } from "./drive-file-list";
import type { DriveFile, DriveFolder, DriveConnectionStatus } from "@/lib/drive";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { useOrg } from "@/hooks/use-org";

interface DriveConnectionSummary {
  id: string;
  label: string;
  googleAccountEmail: string | null;
  status: DriveConnectionStatus;
}

interface DriveConnectionApi {
  id: string;
  label: string;
  google_account_email: string | null;
  status: DriveConnectionStatus;
}

interface DriveBrowserProps {
  onConnectionChange?: (connectionId: string | null) => void;
}

export function DriveBrowser({ onConnectionChange }: DriveBrowserProps = {}) {
  const { locale } = useLocale();
  const { org, isLoading: loadingOrg } = useOrg();
  const activeOrgId = org?.id || null;
  const [connections, setConnections] = useState<DriveConnectionSummary[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionsError, setConnectionsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [path, setPath] = useState<DriveFolder[]>([]);
  const connectionsRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  const connectionsAbortRef = useRef<AbortController | null>(null);
  const listAbortRef = useRef<AbortController | null>(null);

  const fetchFiles = useCallback(async (connectionId: string, folderId: string, pageToken?: string, append = false) => {
    const requestId = ++listRequestRef.current;
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setNextPageToken(null);
      setFiles([]);
    }
    setListError(false);

    try {
      const params = new URLSearchParams({ connectionId });
      if (folderId !== "root") params.set("folderId", folderId);
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`/api/drive/list?${params.toString()}`, {
        signal: controller.signal,
        ...(activeOrgId ? { headers: { "x-org-id": activeOrgId } } : {}),
      });
      if (!res.ok) {
        throw new Error("list request failed");
      }

      const json = await res.json() as { data?: { files?: DriveFile[]; nextPageToken?: string | null } };
      if (requestId !== listRequestRef.current) return;
      const pageFiles = json.data?.files || [];
      setFiles((current) => append ? [...current, ...pageFiles] : pageFiles);
      setNextPageToken(json.data?.nextPageToken || null);
    } catch {
      if (controller.signal.aborted || requestId !== listRequestRef.current) return;
      if (!append) {
        setFiles([]);
        setNextPageToken(null);
      }
      setListError(true);
      toast.error(t("drives.error_load", locale));
    } finally {
      if (requestId === listRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeOrgId, locale]);

  const fetchConnections = useCallback(async () => {
    const requestId = ++connectionsRequestRef.current;
    connectionsAbortRef.current?.abort();
    const controller = new AbortController();
    setLoadingConnections(true);
    setConnectionsError(false);
    connectionsAbortRef.current = controller;
    try {
      const res = await fetch("/api/drive/connections", {
        signal: controller.signal,
        ...(activeOrgId ? { headers: { "x-org-id": activeOrgId } } : {}),
      });
      if (!res.ok) throw new Error("connections request failed");

      const json = await res.json() as { data?: DriveConnectionApi[] };
      if (requestId !== connectionsRequestRef.current) return;
      const activeConnections = (json.data || [])
        .filter((connection) => connection.status === "active")
        .map(({ id, label, google_account_email, status }) => ({
          id,
          label,
          googleAccountEmail: google_account_email,
          status,
        }));

      setConnections(activeConnections);
      setSelectedConnectionId((current) =>
        activeConnections.some((connection) => connection.id === current)
          ? current
          : activeConnections[0]?.id || null
      );
    } catch {
      if (controller.signal.aborted || requestId !== connectionsRequestRef.current) return;
      setConnections([]);
      setSelectedConnectionId(null);
      setFiles([]);
      setListError(false);
      setConnectionsError(true);
      toast.error(t("drive.connection_error", locale));
    } finally {
      if (requestId === connectionsRequestRef.current) setLoadingConnections(false);
    }
  }, [activeOrgId, locale]);

  const invalidateListRequest = useCallback(() => {
    listRequestRef.current += 1;
    listAbortRef.current?.abort();
  }, []);

  const resetListContext = useCallback(() => {
    setFiles([]);
    setNextPageToken(null);
    setListError(false);
    setLoading(true);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    if (loadingOrg) return;
    setConnections([]);
    setSelectedConnectionId(null);
    setFiles([]);
    setCurrentFolderId("root");
    setPath([]);
    void fetchConnections();
  }, [fetchConnections, loadingOrg]);

  useEffect(() => {
    onConnectionChange?.(selectedConnectionId);
  }, [onConnectionChange, selectedConnectionId]);

  useEffect(() => () => {
    connectionsRequestRef.current += 1;
    listRequestRef.current += 1;
    connectionsAbortRef.current?.abort();
    listAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (selectedConnectionId) {
      void fetchFiles(selectedConnectionId, currentFolderId);
    }
  }, [currentFolderId, fetchFiles, selectedConnectionId]);

  const navigateTo = useCallback((folderId: string) => {
    if (folderId === currentFolderId) return;
    invalidateListRequest();
    resetListContext();
    if (folderId === "root") {
      setCurrentFolderId("root");
      setPath([]);
      return;
    }

    setCurrentFolderId(folderId);
    setPath((current) => {
      const index = current.findIndex((folder) => folder.id === folderId);
      return index >= 0 ? current.slice(0, index + 1) : current;
    });
  }, [currentFolderId, invalidateListRequest, resetListContext]);

  const handleFolderClick = useCallback((folder: DriveFile) => {
    if (folder.id === currentFolderId) return;
    invalidateListRequest();
    resetListContext();
    setPath((current) => [...current, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  }, [currentFolderId, invalidateListRequest, resetListContext]);

  const handleConnectionChange = useCallback((connectionId: string) => {
    if (connectionId === selectedConnectionId) return;
    invalidateListRequest();
    resetListContext();
    setSelectedConnectionId(connectionId);
    setCurrentFolderId("root");
    setPath([]);
  }, [invalidateListRequest, resetListContext, selectedConnectionId]);

  if (loadingConnections) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connectionsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center" role="alert">
        <HardDrive className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("drive.connection_error", locale)}</p>
        <button
          type="button"
          onClick={() => void fetchConnections()}
          className="rounded-xl border border-border bg-muted px-4 py-2 text-sm text-foreground hover:bg-muted/80"
        >
          {t("drive.retry", locale)}
        </button>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <HardDrive className="h-10 w-10 text-muted-foreground/50" />
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("drive.connection_empty_title", locale)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("drive.connection_empty_description", locale)}</p>
        </div>
      </div>
    );
  }

  const selectedConnection = connections.find((connection) => connection.id === selectedConnectionId) || connections[0];
  const fileList = (
    <DriveFileList
      files={files}
      loading={loading}
      onFolderClick={handleFolderClick}
      hasMore={Boolean(nextPageToken)}
      loadingMore={loadingMore}
      onLoadMore={() => {
        if (selectedConnectionId && nextPageToken) {
          void fetchFiles(selectedConnectionId, currentFolderId, nextPageToken, true);
        }
      }}
    />
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 flex-wrap">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{selectedConnection.label}</p>
          {selectedConnection.googleAccountEmail && (
            <p className="truncate text-xs text-muted-foreground">{selectedConnection.googleAccountEmail}</p>
          )}
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
          {t("drive.connection_status_active", locale)}
        </span>
        {connections.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("drive.connection_selector", locale)}</span>
            <select
              value={selectedConnectionId || ""}
              onChange={(event) => handleConnectionChange(event.target.value)}
              aria-label={t("drive.connection_selector", locale)}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
            >
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <DriveToolbar path={path} onNavigate={navigateTo} onRefresh={() => {
        if (selectedConnectionId) void fetchFiles(selectedConnectionId, currentFolderId);
      }} />

      {listError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center" role="alert">
          <p className="text-sm text-muted-foreground">{t("drives.error_load", locale)}</p>
          <button
            type="button"
            onClick={() => {
              if (selectedConnectionId) void fetchFiles(selectedConnectionId, currentFolderId);
            }}
            className="rounded-xl border border-border bg-muted px-4 py-2 text-sm text-foreground hover:bg-muted/80"
          >
            {t("drive.retry", locale)}
          </button>
        </div>
      )}
      {(!listError || files.length > 0) && fileList}
    </div>
  );
}
