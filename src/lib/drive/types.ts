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
