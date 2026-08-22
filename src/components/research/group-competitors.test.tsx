import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupCompetitors } from "./group-competitors";
import type { ResearchGroupItem } from "@/lib/research/group-data";
import type { Locale } from "@/lib/i18n/translations";

const locale: Locale = "es";

function buildItem(overrides: Partial<ResearchGroupItem> = {}): ResearchGroupItem {
  return {
    id: "item-1",
    user_id: "user-1",
    name: "Bandeja Organizadora",
    niche: null,
    asin_reference: "B0TEST1234",
    amazon_category: null,
    estimated_monthly_sales: 1200,
    estimated_monthly_revenue: 9600,
    estimated_fba_fee: null,
    seller_count_fba: 42,
    average_price: 24.99,
    review_count_competitor: null,
    average_rating: null,
    bsr: 15200,
    competition_level: "low",
    amazon_url: null,
    alibaba_url: null,
    estimated_cogs: null,
    estimated_selling_price: null,
    estimated_roi: null,
    differentiation_notes: null,
    keywords: null,
    status: "idea",
    priority: 3,
    source: "capture",
    source_data: { image_url: "https://example.com/img.jpg" },
    score: 78,
    notes: null,
    created_at: "2026-08-10T10:00:00.000Z",
    updated_at: "2026-08-10T10:00:00.000Z",
    group_id: "group-1",
    ...overrides,
  };
}

const groups = [
  { id: "group-2", name: "Cocina" },
  { id: "group-3", name: "Jardín" },
];

function setup(itemOverrides: Partial<ResearchGroupItem> = {}) {
  const onEdit = vi.fn();
  const onDeepDive = vi.fn();
  const onStatusChange = vi.fn();
  const onMove = vi.fn();
  const item = buildItem(itemOverrides);
  render(
    <GroupCompetitors
      items={[item]}
      groups={groups}
      locale={locale}
      onEdit={onEdit}
      onDeepDive={onDeepDive}
      onStatusChange={onStatusChange}
      onMove={onMove}
    />
  );
  return { onEdit, onDeepDive, onStatusChange, onMove, item };
}

describe("GroupCompetitors", () => {
  it("renderiza los datos del competidor", () => {
    setup();
    expect(screen.getByText("Bandeja Organizadora")).toBeDefined();
    expect(screen.getByText("B0TEST1234")).toBeDefined();
    expect(screen.getByText("capture")).toBeDefined();
    expect(screen.getByText("78")).toBeDefined();
    expect(screen.getByText("Baja")).toBeDefined();
    expect(screen.getByAltText("")).toHaveProperty("src", "https://example.com/img.jpg");
  });

  it("muestra dash cuando faltan datos", () => {
    setup({
      asin_reference: null,
      source: null,
      score: null,
      average_price: null,
      seller_count_fba: null,
      bsr: null,
      competition_level: null,
      source_data: null,
    });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText("78")).toBeNull();
  });

  it("Elegir dispara onStatusChange con approved", async () => {
    const user = userEvent.setup();
    const { onStatusChange, item } = setup();
    await user.click(screen.getByRole("button", { name: "Aprobado" }));
    expect(onStatusChange).toHaveBeenCalledWith(item, "approved");
  });

  it("Descartar dispara onStatusChange con rejected", async () => {
    const user = userEvent.setup();
    const { onStatusChange, item } = setup();
    await user.click(screen.getByRole("button", { name: "Rechazado" }));
    expect(onStatusChange).toHaveBeenCalledWith(item, "rejected");
  });

  it("DeepDive y Editar disparan sus callbacks", async () => {
    const user = userEvent.setup();
    const { onEdit, onDeepDive, item } = setup();
    await user.click(screen.getByRole("button", { name: "Deep Dive IA" }));
    await user.click(screen.getByRole("button", { name: "Editar Research" }));
    expect(onDeepDive).toHaveBeenCalledWith(item);
    expect(onEdit).toHaveBeenCalledWith(item);
  });

  it("Mover abre el menu con otros grupos y sacar del grupo", async () => {
    const user = userEvent.setup();
    const { onMove, item } = setup();
    await user.click(screen.getByRole("button", { name: "Mover de grupo" }));
    expect(screen.getByRole("button", { name: "Cocina" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Jardín" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sacar del grupo" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Jardín" }));
    expect(onMove).toHaveBeenCalledWith(item, "group-3");
  });

  it("Sacar del grupo llama onMove con null", async () => {
    const user = userEvent.setup();
    const { onMove, item } = setup();
    await user.click(screen.getByRole("button", { name: "Mover de grupo" }));
    await user.click(screen.getByRole("button", { name: "Sacar del grupo" }));
    expect(onMove).toHaveBeenCalledWith(item, null);
  });

  it("grupo sin items muestra mensaje vacio", () => {
    render(
      <GroupCompetitors
        items={[]}
        groups={groups}
        locale={locale}
        onEdit={vi.fn()}
        onDeepDive={vi.fn()}
        onStatusChange={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(screen.getByText("Sin productos")).toBeDefined();
  });
});
