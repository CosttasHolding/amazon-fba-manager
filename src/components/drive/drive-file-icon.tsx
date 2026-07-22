"use client";

import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Folder,
  FileCode,
  FileArchive,
} from "lucide-react";

interface DriveFileIconProps {
  mimeType: string;
  isFolder: boolean;
  className?: string;
}

export function DriveFileIcon({ mimeType, isFolder, className = "h-5 w-5" }: DriveFileIconProps) {
  if (isFolder) return <Folder className={`${className} text-amber-500`} />;

  if (mimeType.startsWith("image/")) return <FileImage className={`${className} text-sky-500`} />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className={`${className} text-emerald-500`} />;
  if (mimeType.includes("text/plain") || mimeType.includes("text/markdown") || mimeType.includes("text/csv"))
    return <FileText className={`${className} text-blue-500`} />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
    return <FileArchive className={`${className} text-purple-500`} />;
  if (mimeType.includes("json") || mimeType.includes("xml") || mimeType.includes("javascript"))
    return <FileCode className={`${className} text-pink-500`} />;

  return <File className={`${className} text-muted-foreground`} />;
}
