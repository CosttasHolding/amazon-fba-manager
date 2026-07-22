export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { memberSchema } from "@/validations/member";

export const GET = createApiHandler(async ({ supabase, req }) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  let query = supabase.from("members").select("*").order("full_name");
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
});

export const POST = createApiHandler(async ({ supabase, user, req }) => {
  const body = await req.json();
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { error, data } = await supabase
    .from("members")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
});
