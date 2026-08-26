import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  driveBrowserMounts: 0,
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/i18n/locale-context", () => ({
  useLocale: () => ({ locale: "es" }),
}));
vi.mock("@/hooks/use-org", () => ({
  useOrg: () => ({ org: { id: "org-1" }, isLoading: false }),
}));
vi.mock("@/components/drive/drive-browser", () => ({
  DriveBrowser: ({ onConnectionChange }: { onConnectionChange?: (id: string) => void }) => {
    useEffect(() => {
      mocks.driveBrowserMounts += 1;
    }, []);
    return (
      <button type="button" onClick={() => onConnectionChange?.("active-2")}>
        Seleccionar conexión secundaria
      </button>
    );
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import DrivePage from "./page";

interface RecordedCall {
  url: string;
  init?: RequestInit;
}

function stubFetch(connections: unknown[]): RecordedCall[] {
  const calls: RecordedCall[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init };
    calls.push(call);
    if ((init?.method ?? "GET") === "GET") return { ok: true, json: async () => ({ data: connections }) };
    if (init?.method === "DELETE") return { ok: true, json: async () => ({ data: { success: true } }) };
    throw new Error(`fetch no mockeado: ${init?.method ?? "GET"} ${String(input)}`);
  }));
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.driveBrowserMounts = 0;
});

describe("DrivePage disconnect", () => {
  it("loads connection metadata and deletes the active connection without browser Supabase updates", async () => {
    const calls = stubFetch([
      { id: "revoked-1", status: "revoked" },
      { id: "active-1", status: "active" },
    ]);
    const user = userEvent.setup();
    render(<DrivePage />);

    await user.click(screen.getByRole("button", { name: "Desconectar" }));

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].url).toBe("/api/drive/connections");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
    expect(calls[0].init?.headers).toEqual({ "x-org-id": "org-1" });
    expect(calls[1].url).toBe("/api/drive/connections/active-1");
    expect(calls[1].init?.method).toBe("DELETE");
    expect(calls[1].init?.headers).toEqual({ "x-org-id": "org-1" });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Desconectado de Google Drive");
  });

  it("shows the existing error state and does not delete when there is no active connection", async () => {
    const calls = stubFetch([{ id: "revoked-1", status: "revoked" }]);
    const user = userEvent.setup();
    render(<DrivePage />);

    await user.click(screen.getByRole("button", { name: "Desconectar" }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].url).toBe("/api/drive/connections");
    expect(mocks.toastError).toHaveBeenCalledWith("Error al desconectar");
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("revokes the selected connection instead of always revoking the first one", async () => {
    const calls = stubFetch([
      { id: "active-1", status: "active" },
      { id: "active-2", status: "active" },
    ]);
    const user = userEvent.setup();
    render(<DrivePage />);

    await user.click(screen.getByRole("button", { name: "Seleccionar conexión secundaria" }));
    await waitFor(() => expect(mocks.driveBrowserMounts).toBe(1));
    await user.click(screen.getByRole("button", { name: "Desconectar" }));

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].url).toBe("/api/drive/connections/active-2");
    await waitFor(() => expect(mocks.driveBrowserMounts).toBe(2));
  });
});
