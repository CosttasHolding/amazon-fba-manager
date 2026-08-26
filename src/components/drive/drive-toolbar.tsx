"use client";

import { ChevronRight, Home, RefreshCw } from "lucide-react";
import type { DriveFolder } from "@/lib/drive";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface DriveToolbarProps {
  path: DriveFolder[];
  onNavigate: (folderId: string) => void;
  onRefresh: () => void;
}

export function DriveToolbar({ path, onNavigate, onRefresh }: DriveToolbarProps) {
  const { locale } = useLocale();

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1 text-sm min-w-0">
        <button
          type="button"
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
              type="button"
              onClick={() => onNavigate(folder.id)}
              className={`truncate px-2.5 py-1.5 min-w-[44px] min-h-[44px] rounded-md hover:bg-muted transition-colors ${
                i === path.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center"
        title={t("drives.title_refresh", locale)}
        aria-label={t("drive.refresh_aria", locale)}
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}
