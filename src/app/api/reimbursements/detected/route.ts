export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPagination, getOrgId, paginatedResponse } from "@/lib/api-handler";

const RECONCILIATION_STATUSES = new Set([
  "unrecorded_amazon_reimbursement",
  "possible_duplicate_loss",
  "possible_existing_claim",
  "linked",
  "dismissed",
]);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const { page, perPage, from, to } = buildPagination(req, 50);
    if (status && !RECONCILIATION_STATUSES.has(status)) {
      return NextResponse.json({ error: "Estado de reconciliación inválido" }, { status: 400 });
    }

    let query = supabase
      .from("amazon_reimbursement_events")
      .select(
        "id, marketplace, reimbursement_id, case_id, amazon_order_id, original_reimbursement_id, original_reimbursement_type, sku, fnsku, asin, reason, approval_date, amount_per_unit, amount_total, currency, quantity_reimbursed_cash, quantity_reimbursed_inventory, quantity_reimbursed_total, product_id, product_match_status, movement_match_status, reconciliation_status, linked_reimbursement_id, first_seen_at, last_seen_at, created_at, updated_at, products(name, sku), amazon_reimbursement_movement_matches(id, stock_movement_id, match_reason, confidence, stock_movements(id, movement_type, quantity, created_at, reference))",
        { count: "exact" },
      )
      .eq("org_id", orgId)
      .order("approval_date", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (status) query = query.eq("reconciliation_status", status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
  } catch (error) {
    console.error("Detected reimbursements route error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
