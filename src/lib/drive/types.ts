export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  createdTime: string;
  parents: string[];
  webViewLink?: string;
  iconLink?: string;
  isFolder: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveListResponse {
  connection: {
    id: string;
    label: string;
    google_account_email: string | null;
    status: DriveConnectionStatus;
  };
  files: DriveFile[];
  nextPageToken: string | null;
}

export interface BackupResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  error?: string;
}

export type BackupType = "products" | "sales" | "orders" | "inventory" | "suppliers";

export type DriveConnectionStatus = "active" | "revoked" | "error";

export interface DriveConnectionMetadata {
  id: string;
  orgId: string;
  provider: "google_drive";
  label: string;
  googleAccountEmail: string | null;
  rootFolderId: string;
  status: DriveConnectionStatus;
  createdAt: string;
  updatedAt: string;
}
