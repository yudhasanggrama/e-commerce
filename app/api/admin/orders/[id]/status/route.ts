export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(
  req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // ✅ Next.js 16: params bisa Promise
    const { id } = await Promise.resolve(ctx.params);

    if (!id || !isUUID(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userRes.user.id)
      .maybeSingle();

    if (prof?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const status = String(body?.status ?? "");

    const allowed = new Set(["shipped", "completed", "cancelled"]);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const service = createSupabaseService();

    const { error } = await service
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ status });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Update failed" },
      { status: 500 }
    );
  }
}