export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { boardDecisionSchema } from "@/validations/member";

export const GET = createApiHandler(async ({ supabase }) => {
  const { data, error } = await supabase
    .from("board_decisions")
    .select("*")
    .order("decision_date", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export const POST = createApiHandler(async ({ supabase, user, req }) => {
  const body = await req.json();
  const parsed = boardDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { error, data } = await supabase
    .from("board_decisions")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});
