import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseBrowser } from "@/lib/supabase/service";
import { sendOrderEmail, shippedEmailTemplate } from "@/lib/resend";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServer();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userRes.user.id)
      .maybeSingle();

    if (prof?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const status = body.status as string;

    const allowed = ["shipped", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const service = createSupabaseBrowser();

    const { data: updated, error } = await service
      .from("orders")
      .update({ status })
      .eq("id", params.id)
      .select("id,user_id")
      .single();

    if (error) throw error;

    // email shipped
    if (status === "shipped") {
      const { data: profile } = await service
        .from("profiles")
        .select("email")
        .eq("id", updated.user_id)
        .maybeSingle();

      if (profile?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
        await sendOrderEmail({
          to: profile.email,
          subject: "Order Shipped",
          html: shippedEmailTemplate({ orderId: updated.id, appUrl }),
        });
      }
    }

    return NextResponse.json({ status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}