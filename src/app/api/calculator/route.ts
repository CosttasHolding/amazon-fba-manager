import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcRefFee, calcFBAFee, calcMetrics } from "@/lib/calculations";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-utils";

const calcSchema = z.object({
  unitCost: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  weightKg: z.coerce.number().min(0).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = calcSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parse.error.flatten().fieldErrors }, { status: 400 });
    }

    const { unitCost, salePrice, weightKg } = parse.data;
    const referralFee = calcRefFee(salePrice);
    const fbaFee = calcFBAFee(weightKg || 1);
    const result = calcMetrics(unitCost, 0, 0, 0, salePrice, referralFee, fbaFee, 0, 0);
    return NextResponse.json({ ...result, referralFee, fbaFee });
  } catch (err) {
    return apiErrorResponse(err, 400, "POST /api/calculator");
  }
}
