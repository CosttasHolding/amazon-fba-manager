import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrashPage from "./page";

const itemId = "11111111-1111-4111-8111-111111111111";

const deletedItem = {
  id: itemId,
  name: "Producto Borrado",
  deleted_at: "2026-08-01T12:00:00.000Z",
};

interface RecordedCall {
  url: string;
  init?: RequestInit;
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function stubFetch(items: Array<{ id: string; name: string; deleted_at: string }>): RecordedCall[] {
  const calls: RecordedCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const entry: RecordedCall = { url: String(input), init };
    calls.push(entry);
    const method = init?.method ?? "GET";
    if (method === "GET" && entry.url.startsWith("/api/trash")) return jsonResponse({ data: items });
    if (method === "POST" && entry.url === "/api/trash/restore") return jsonResponse({ data: {} });
    if (method === "DELETE" && entry.url === "/api/trash") return jsonResponse({ data: { success: true } });
    throw new Error(`fetch no mockeado: ${method} ${entry.url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

function getCalls(calls: RecordedCall[], method: "GET" | "POST" | "DELETE"): RecordedCall[] {
  return calls.filter((c) => (c.init?.method ?? "GET") === method);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TrashPage", () => {
  it("borrar definitivo queda deshabilitado hasta escribir la palabra de confirmación", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([deletedItem]);
    render(<TrashPage />);
    await screen.findByText("Producto Borrado");

    await user.click(screen.getByRole("button", { name: "Borrar definitivo" }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Escribí BORRAR para confirmar");
    const confirmButton = within(dialog).getByRole("button", { name: "Borrar definitivo" });

    expect(confirmButton).toBeDisabled();
    await user.type(input, "borrar");
    expect(confirmButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, "BORRAR");
    expect(confirmButton).toBeEnabled();

    expect(getCalls(calls, "DELETE")).toHaveLength(0);
  });

  it("confirmar el borrado dispara DELETE con entity e id y refresca la lista", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([deletedItem]);
    render(<TrashPage />);
    await screen.findByText("Producto Borrado");

    await user.click(screen.getByRole("button", { name: "Borrar definitivo" }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Escribí BORRAR para confirmar");
    await user.type(input, "BORRAR");
    await user.click(within(dialog).getByRole("button", { name: "Borrar definitivo" }));

    await waitFor(() => {
      expect(getCalls(calls, "DELETE")).toHaveLength(1);
    });
    const deleteCall = getCalls(calls, "DELETE")[0];
    expect(deleteCall.url).toBe("/api/trash");
    expect(JSON.parse(String(deleteCall.init?.body))).toEqual({ entity: "products", id: itemId });

    await waitFor(() => {
      expect(getCalls(calls, "GET")).toHaveLength(2);
    });
  });

  it("Restaurar dispara POST con entity e id y refresca la lista", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([deletedItem]);
    render(<TrashPage />);
    await screen.findByText("Producto Borrado");

    await user.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() => {
      expect(getCalls(calls, "POST")).toHaveLength(1);
    });
    const restoreCall = getCalls(calls, "POST")[0];
    expect(restoreCall.url).toBe("/api/trash/restore");
    expect(JSON.parse(String(restoreCall.init?.body))).toEqual({ entity: "products", id: itemId });

    await waitFor(() => {
      expect(getCalls(calls, "GET")).toHaveLength(2);
    });
  });

  it("sin elementos muestra el estado vacío de la papelera", async () => {
    stubFetch([]);
    render(<TrashPage />);
    expect(await screen.findByText("La papelera está vacía")).toBeDefined();
    expect(screen.queryByText("Producto Borrado")).toBeNull();
  });
});
