import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/i18n/locale-context", () => ({
  useLocale: () => ({ locale: "es" }),
}));

import { DriveFileList } from "./drive-file-list";
import type { DriveFile } from "@/lib/drive";

function file(overrides: Partial<DriveFile> = {}): DriveFile {
  return {
    id: "file-1",
    name: "report.pdf",
    mimeType: "application/pdf",
    size: "42",
    modifiedTime: "2026-08-25T00:00:00Z",
    createdTime: "2026-08-24T00:00:00Z",
    parents: ["root"],
    isFolder: false,
    ...overrides,
  };
}

function renderList(files: DriveFile[]) {
  return render(
    <DriveFileList
      files={files}
      loading={false}
      onFolderClick={vi.fn()}
      hasMore={false}
      loadingMore={false}
      onLoadMore={vi.fn()}
    />
  );
}

describe("DriveFileList read-only", () => {
  it("abre archivos con webViewLink en Google Drive con una relación segura", () => {
    renderList([file({ webViewLink: "https://drive.google.com/file/d/file-1/view" })]);

    const link = screen.getByRole("link", { name: "Abrir en Google Drive" });
    expect(link).toHaveAttribute("href", "https://drive.google.com/file/d/file-1/view");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("link", { name: "Abrir en Google Drive" })).toHaveLength(1);
  });

  it("no muestra una acción de apertura cuando falta webViewLink", () => {
    renderList([file(), file({ id: "file-2", name: "no-link.txt", mimeType: "text/plain" })]);

    expect(screen.queryByRole("link", { name: "Abrir en Google Drive" })).not.toBeInTheDocument();
  });

  it("mantiene la navegación de carpetas dentro de la aplicación", async () => {
    const onFolderClick = vi.fn();
    render(
      <DriveFileList
        files={[file({ id: "folder-1", name: "Invoices", mimeType: "application/vnd.google-apps.folder", isFolder: true })]}
        loading={false}
        onFolderClick={onFolderClick}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Invoices" }));

    expect(onFolderClick).toHaveBeenCalledWith(expect.objectContaining({ id: "folder-1" }));
  });
});
