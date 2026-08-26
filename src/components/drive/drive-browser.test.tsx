import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ar from "@/lib/i18n/ar.json";
import en from "@/lib/i18n/en.json";
import es from "@/lib/i18n/es.json";

vi.mock("@/lib/i18n/locale-context", () => ({
  useLocale: () => ({ locale: "es" }),
}));
vi.mock("@/hooks/use-org", () => ({
  useOrg: () => ({ org: { id: "org-1" }, isLoading: false }),
}));

import { DriveBrowser } from "./drive-browser";

type DriveFileResponse = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  parents?: string[];
  webViewLink?: string;
  isFolder?: boolean;
};

function response(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function file(overrides: Partial<DriveFileResponse> = {}): DriveFileResponse {
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

function connection(id: string, label: string) {
  return {
    id,
    label,
    google_account_email: `${id}@example.com`,
    status: "active",
  };
}

function listResponse(files: DriveFileResponse[] = [], nextPageToken: string | null = null) {
  return response({ data: { files, nextPageToken } });
}

type PendingListRequest = {
  url: string;
  resolve: (value: unknown) => void;
  signal: AbortSignal | null | undefined;
};

function setupPendingFetch(connections: unknown[]) {
  const requests: PendingListRequest[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/drive/connections") {
      return Promise.resolve(response({ data: connections }));
    }

    return new Promise((resolve) => {
      requests.push({ url, resolve, signal: init?.signal });
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, requests };
}

function setupFetch(
  connections: unknown[],
  listFiles: DriveFileResponse[] = [],
  nextPageToken: string | null = null,
) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "/api/drive/connections") {
      return response({ data: connections });
    }
    return listResponse(listFiles, nextPageToken);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DriveBrowser read-only", () => {
  it("muestra un estado vacío cuando no hay una conexión activa", async () => {
    const { calls } = setupFetch([{ id: "revoked", label: "Old Drive", status: "revoked" }]);

    render(<DriveBrowser />);

    expect(await screen.findByText("Conectá Google Drive")).toBeInTheDocument();
    expect(screen.getByText("Conectá una cuenta de Google Drive para ver tus archivos.")).toBeInTheDocument();
    expect(calls.map(({ url }) => url)).toEqual(["/api/drive/connections"]);
    expect(screen.queryByRole("button", { name: "Actualizar" })).not.toBeInTheDocument();
  });

  it("envía la organización activa al cargar conexiones y archivos", async () => {
    const { calls } = setupFetch([connection("connection-1", "Equipo principal")]);

    render(<DriveBrowser />);

    await screen.findByText("Equipo principal");
    await waitFor(() => expect(calls.some(({ url }) => url.includes("/api/drive/list"))).toBe(true));

    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        url: "/api/drive/connections",
        init: expect.objectContaining({ headers: { "x-org-id": "org-1" } }),
      }),
      expect.objectContaining({
        url: "/api/drive/list?connectionId=connection-1",
        init: expect.objectContaining({ headers: { "x-org-id": "org-1" } }),
      }),
    ]));
  });

  it("carga metadata de conexiones y usa la conexión seleccionada", async () => {
    const { calls } = setupFetch([
      connection("connection-1", "Equipo principal"),
      connection("connection-2", "Equipo secundario"),
    ]);

    render(<DriveBrowser />);

    expect((await screen.findAllByText("Equipo principal")).length).toBeGreaterThan(0);
    expect(screen.getByText("connection-1@example.com")).toBeInTheDocument();
    expect(screen.getByText("Conectado")).toBeInTheDocument();
    await waitFor(() => {
      expect(calls.map(({ url }) => url)).toContain("/api/drive/list?connectionId=connection-1");
    });

    await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "Cuenta de Google Drive" }), "connection-2");

    await waitFor(() => {
      expect(calls.map(({ url }) => url)).toContain("/api/drive/list?connectionId=connection-2");
    });
  });

  it("limpia los archivos y el token antes de solicitar otra conexión", async () => {
    let newConnectionRequestStarted = false;
    let oldFilesVisibleWhenNewRequestStarted = false;
    let resolveNewConnection: ((value: unknown) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/drive/connections") {
        return Promise.resolve(response({
          data: [connection("connection-1", "Primaria"), connection("connection-2", "Secundaria")],
        }));
      }
      if (url.includes("connection-1")) {
        return Promise.resolve(listResponse([file({ name: "contexto-viejo.pdf" })], "page-2"));
      }

      newConnectionRequestStarted = true;
      oldFilesVisibleWhenNewRequestStarted = Boolean(screen.queryByText("contexto-viejo.pdf"));
      return new Promise((resolve) => {
        resolveNewConnection = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await screen.findByText("contexto-viejo.pdf");
    expect(screen.getByRole("button", { name: "Cargar más archivos" })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Cuenta de Google Drive" }), "connection-2");
    await waitFor(() => expect(newConnectionRequestStarted).toBe(true));

    expect(oldFilesVisibleWhenNewRequestStarted).toBe(false);
    expect(screen.queryByText("contexto-viejo.pdf")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargar más archivos" })).not.toBeInTheDocument();
    resolveNewConnection?.(listResponse());
  });

  it("limpia los archivos y el token antes de navegar a otra carpeta", async () => {
    const folder = file({
      id: "folder-1",
      name: "Invoices",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
    });
    let folderRequestStarted = false;
    let oldFilesVisibleWhenFolderRequestStarted = false;
    let resolveFolder: ((value: unknown) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/drive/connections") {
        return Promise.resolve(response({ data: [connection("connection-1", "Equipo principal")] }));
      }
      if (!url.includes("folderId=folder-1")) {
        return Promise.resolve(listResponse([folder, file({ name: "contexto-viejo.pdf" })], "page-2"));
      }

      folderRequestStarted = true;
      oldFilesVisibleWhenFolderRequestStarted = Boolean(screen.queryByText("contexto-viejo.pdf"));
      return new Promise((resolve) => {
        resolveFolder = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await screen.findByText("contexto-viejo.pdf");
    expect(screen.getByRole("button", { name: "Cargar más archivos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Invoices" }));
    await waitFor(() => expect(folderRequestStarted).toBe(true));

    expect(oldFilesVisibleWhenFolderRequestStarted).toBe(false);
    expect(screen.queryByText("contexto-viejo.pdf")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargar más archivos" })).not.toBeInTheDocument();
    resolveFolder?.(listResponse());
  });

  it("incluye conexión, carpeta y paginación, y conserva navegación y refresh", async () => {
    const folder = file({
      id: "folder-1",
      name: "Invoices",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
    });
    const { calls } = setupFetch([connection("connection-1", "Equipo principal")], [folder], "page-2");
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await screen.findByRole("button", { name: "Invoices" });

    await user.click(screen.getByRole("button", { name: "Cargar más archivos" }));
    expect(calls.map(({ url }) => url)).toContain("/api/drive/list?connectionId=connection-1&pageToken=page-2");

    await user.click(screen.getAllByRole("button", { name: "Invoices" })[0]);
    await waitFor(() => {
      expect(calls.map(({ url }) => url)).toContain("/api/drive/list?connectionId=connection-1&folderId=folder-1");
    });

    await user.click(screen.getByRole("button", { name: "Ir al inicio" }));
    await waitFor(() => {
      expect(calls.filter(({ url }) => url === "/api/drive/list?connectionId=connection-1")).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => {
      expect(calls.filter(({ url }) => url === "/api/drive/list?connectionId=connection-1")).toHaveLength(3);
    });
  });

  it("conserva los archivos cargados si falla una página adicional", async () => {
    const firstPage = file({ name: "primera-pagina.pdf" });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/drive/connections") {
        return response({ data: [connection("connection-1", "Equipo principal")] });
      }
      if (url.includes("pageToken=page-2")) {
        return response({}, false);
      }
      return listResponse([firstPage], "page-2");
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await screen.findByText("primera-pagina.pdf");
    await user.click(screen.getByRole("button", { name: "Cargar más archivos" }));

    await waitFor(() => expect(screen.getByText("primera-pagina.pdf")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Cargar más archivos" })).toBeInTheDocument();
  });

  it("no aborta la petición al pulsar la raíz que ya está activa", async () => {
    const { requests } = setupPendingFetch([connection("connection-1", "Equipo principal")]);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await waitFor(() => expect(requests).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: "Ir al inicio" }));

    expect(requests).toHaveLength(1);
    expect(requests[0].signal?.aborted).toBe(false);
    requests[0].resolve(listResponse());
  });

  it("no aborta la petición al pulsar el breadcrumb de la carpeta actual", async () => {
    const folder = file({
      id: "folder-1",
      name: "Invoices",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
    });
    const { requests } = setupPendingFetch([connection("connection-1", "Equipo principal")]);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await waitFor(() => expect(requests).toHaveLength(1));
    requests[0].resolve(listResponse([folder]));
    await screen.findByRole("button", { name: "Invoices" });

    await user.click(screen.getByRole("button", { name: "Invoices" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    requests[1].resolve(listResponse());
    await screen.findByText("No hay archivos para mostrar en esta carpeta");

    await user.click(screen.getByRole("button", { name: "Invoices" }));

    expect(requests).toHaveLength(2);
    expect(requests[1].signal?.aborted).toBe(false);
  });

  it("descarta una respuesta vieja después de navegar de carpeta a raíz", async () => {
    const folder = file({
      id: "folder-1",
      name: "Invoices",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
    });
    const { requests } = setupPendingFetch([connection("connection-1", "Equipo principal")]);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await waitFor(() => expect(requests).toHaveLength(1));
    requests[0].resolve(listResponse([folder]));
    await screen.findByRole("button", { name: "Invoices" });

    await user.click(screen.getByRole("button", { name: "Invoices" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    await user.click(screen.getByRole("button", { name: "Ir al inicio" }));
    await waitFor(() => expect(requests).toHaveLength(3));

    requests[2].resolve(listResponse([file({ name: "raiz-nueva.pdf" })]));
    await screen.findByText("raiz-nueva.pdf");
    requests[1].resolve(listResponse([file({ name: "carpeta-vieja.pdf" })]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText("raiz-nueva.pdf")).toBeInTheDocument();
    expect(screen.queryByText("carpeta-vieja.pdf")).not.toBeInTheDocument();
  });

  it("descarta una respuesta vieja cuando refresh compite con el listado actual", async () => {
    const { requests } = setupPendingFetch([connection("connection-1", "Equipo principal")]);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await waitFor(() => expect(requests).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(requests).toHaveLength(2));

    requests[1].resolve(listResponse([file({ name: "refresh-nuevo.pdf" })]));
    await screen.findByText("refresh-nuevo.pdf");
    requests[0].resolve(listResponse([file({ name: "refresh-viejo.pdf" })]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText("refresh-nuevo.pdf")).toBeInTheDocument();
    expect(screen.queryByText("refresh-viejo.pdf")).not.toBeInTheDocument();
  });

  it("descarta una respuesta vieja de paginación después de refresh", async () => {
    const { requests } = setupPendingFetch([connection("connection-1", "Equipo principal")]);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await waitFor(() => expect(requests).toHaveLength(1));
    requests[0].resolve(listResponse([file({ name: "primera-pagina.pdf" })], "page-2"));
    await screen.findByText("primera-pagina.pdf");

    await user.click(screen.getByRole("button", { name: "Cargar más archivos" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(requests).toHaveLength(3));

    requests[2].resolve(listResponse([file({ name: "refresh-final.pdf" })]));
    await screen.findByText("refresh-final.pdf");
    requests[1].resolve(listResponse([file({ name: "pagina-vieja.pdf" })]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText("refresh-final.pdf")).toBeInTheDocument();
    expect(screen.queryByText("pagina-vieja.pdf")).not.toBeInTheDocument();
  });

  it("aborta el listado pendiente al desmontar", async () => {
    const { requests } = setupPendingFetch([connection("connection-1", "Equipo principal")]);

    const { unmount } = render(<DriveBrowser />);
    await waitFor(() => expect(requests).toHaveLength(1));

    unmount();

    expect(requests[0].signal?.aborted).toBe(true);
  });

  it("no renderiza controles de mutación ni backup", async () => {
    const { fetchMock } = setupFetch([connection("connection-1", "Equipo principal")], [file()]);

    render(<DriveBrowser />);
    await screen.findByText("report.pdf");

    expect(screen.queryByRole("button", { name: /subir|nueva carpeta|editar|descargar|renombrar|eliminar|backup/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Backup a Google Drive")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/drive/connections", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("ignora una respuesta de listado vieja después de cambiar de conexión", async () => {
    const listResolvers: Array<(value: unknown) => void> = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/drive/connections") {
        return Promise.resolve(response({ data: [connection("connection-1", "Primaria"), connection("connection-2", "Secundaria")] }));
      }

      return new Promise((resolve) => {
        listResolvers.push(() => resolve(response({ data: { files: [file({ name: url.includes("connection-2") ? "nuevo.pdf" : "viejo.pdf" })], nextPageToken: null } })));
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DriveBrowser />);
    await waitFor(() => expect(listResolvers).toHaveLength(1));

    await user.selectOptions(screen.getByRole("combobox", { name: "Cuenta de Google Drive" }), "connection-2");
    await waitFor(() => expect(listResolvers).toHaveLength(2));

    listResolvers[1](undefined);
    await screen.findByText("nuevo.pdf");
    listResolvers[0](undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText("nuevo.pdf")).toBeInTheDocument();
    expect(screen.queryByText("viejo.pdf")).not.toBeInTheDocument();
  });

  it("muestra un error de conexiones distinto del estado vacío y permite reintentar", async () => {
    let attempts = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === "/api/drive/connections") {
        attempts += 1;
        return Promise.resolve(attempts === 1
          ? response({}, false)
          : response({ data: [connection("connection-1", "Equipo principal")] }));
      }
      return Promise.resolve(listResponse([file()]));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DriveBrowser />);

    expect(await screen.findByText("Error al cargar las conexiones")).toBeInTheDocument();
    expect(screen.queryByText("Conectá Google Drive")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText("Equipo principal");
    expect(attempts).toBe(2);
  });

  it("limpia el listado cuando falla y permite reintentar", async () => {
    let attempts = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === "/api/drive/connections") {
        return Promise.resolve(response({ data: [connection("connection-1", "Equipo principal")] }));
      }

      attempts += 1;
      return Promise.resolve(attempts === 1 ? response({}, false) : listResponse([file({ name: "recuperado.pdf" })]));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DriveBrowser />);

    expect(await screen.findByText("Error al cargar archivos")).toBeInTheDocument();
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("recuperado.pdf")).toBeInTheDocument();
  });

  it("usa copy read-only en los tres locales", () => {
    expect(es["drive.subtitle"]).toBe("Visualizá y abrí tus archivos de Google Drive sin modificar su contenido");
    expect(en["drive.subtitle"]).toBe("View and open your Google Drive files without modifying their content");
    expect(ar["drive.subtitle"]).toBe("اعرض ملفات Google Drive وافتحها دون تعديل محتواها");
    expect(es["drives.empty_hint"]).toBe("No hay archivos para mostrar en esta carpeta");
    expect(en["drives.empty_hint"]).toBe("There are no files to show in this folder");
    expect(ar["drives.empty_hint"]).toBe("لا توجد ملفات لعرضها في هذا المجلد");
  });
});
