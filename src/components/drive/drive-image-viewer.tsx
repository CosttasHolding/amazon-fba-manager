"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2, X, Download } from "lucide-react";
import type { DriveFile } from "@/lib/drive";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface DriveImageViewerProps {
  file: DriveFile;
  onClose: () => void;
}

export function DriveImageViewer({ file, onClose }: DriveImageViewerProps) {
  const { locale } = useLocale();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadImage = async () => {
      try {
        const res = await fetch(`/api/drive/download/${file.id}`);
        if (res.ok) {
          const blob = await res.blob();
          if (!cancelled) {
            const objectUrl = URL.createObjectURL(blob);
            objectUrlRef.current = objectUrl;
            setUrl(objectUrl);
          }
        }
      } catch (e) {
        console.error("ERROR loading drive image", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadImage();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [file.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("drive.image_viewer_aria", locale)}>
      <div
        className="relative max-w-4xl max-h-[90vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-10 end-0 flex items-center gap-2">
          <a
            href={`/api/drive/download/${file.id}`}
            download={file.name}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors flex items-center justify-center"
          >
            <Download className="h-4 w-4" />
          </a>
          <button onClick={onClose} className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors flex items-center justify-center" aria-label={t("drive.close_viewer_aria", locale)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 w-64">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        ) : url ? (
          <div className="relative max-h-[85vh] max-w-full">
            <Image
              src={url}
              alt={file.name}
              fill
              className="!relative rounded-xl object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="text-white/60 text-sm">{t("drives.image_error", locale)}</div>
        )}
      </div>
    </div>
  );
}
