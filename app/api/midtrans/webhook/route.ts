export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { mapMidtransToOrder, verifyMidtransSignature } from "@/lib/midtrans";
import { failedEmailTemplate, paidEmailTemplate, sendOrderEmail } from "@/lib/resend";

export async function POST(req: Request) {
  let payload: any = null;

  try {
    // Midtrans biasanya JSON, tapi kita tetap amanin
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = Object.fromEntries(new URLSearchParams(text));
      }
    }

    console.log("🔔 MIDTRANS WEBHOOK HIT:", {
      order_id: payload?.order_id,
      transaction_status: payload?.transaction_status,
      status_code: payload?.status_code,
      gross_amount: payload?.gross_amount,
    });

    // 1) verify signature
    const ok = await verifyMidtransSignature(payload);
    if (!ok) {
      console.error("❌ Invalid signature", payload?.order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const providerOrderId = payload.order_id as string | undefined;
    if (!providerOrderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const service = createSupabaseService();

    // 2) find payment by provider_order_id (JANGAN single() biar gak throw 500)
    const { data: payment, error: payErr } = await service
      .from("payments")
      .select("id,order_id")
      .eq("provider_order_id", providerOrderId)
      .maybeSingle();

    if (payErr) {
      console.error("❌ payments lookup error:", payErr);
      return NextResponse.json({ error: "payments lookup error" }, { status: 500 });
    }

    if (!payment) {
      // Ini penyebab #1: provider_order_id mismatch / row payment belum kebentuk
      console.error("❌ Payment not found for provider_order_id:", providerOrderId);

      // Supaya Midtrans tidak retry terus-terusan (dan spam), lebih aman balikin 200
      // tapi tetap log biar kamu bisa fix mapping order_id.
      return NextResponse.json({ received: true, note: "payment_not_found" });
    }

    // 3) map status
    const mapped = mapMidtransToOrder(payload);

    // 4) update payment payload
    const { error: payUpErr } = await service
      .from("payments")
      .update({
        transaction_status: payload.transaction_status ?? "pending",
        fraud_status: payload.fraud_status ?? null,
        payment_type: payload.payment_type ?? null,
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (payUpErr) throw payUpErr;

    // 5) read order (ambil prev status untuk idempotency restore)
    const { data: order, error: ordErr } = await service
      .from("orders")
      .select("id,user_id,total,status,payment_status")
      .eq("id", payment.order_id)
      .single();

    if (ordErr) throw ordErr;

    const prevStatus = order.status as string | null;

    // 6) update order
    const { error: ordUpErr } = await service
      .from("orders")
      .update({
        status: mapped.status,
        payment_status: mapped.payment_status,
        paid_at: mapped.paid_at,
      })
      .eq("id", order.id);

    if (ordUpErr) throw ordUpErr;

    // 7) restore stock (ONLY once)
    const nowTerminal = mapped.status === "expired" || mapped.status === "cancelled";
    const wasTerminal = prevStatus === "expired" || prevStatus === "cancelled";

    if (nowTerminal && !wasTerminal) {
      const { data: items, error: itErr } = await service
        .from("order_items")
        .select("product_id,quantity")
        .eq("order_id", order.id);

      if (itErr) throw itErr;

      if (items?.length) {
        for (const it of items) {
          if (!it.product_id) continue;

          const { data: prod, error: prodErr } = await service
            .from("products")
            .select("stock")
            .eq("id", it.product_id)
            .single();
          if (prodErr) throw prodErr;

          await service
            .from("products")
            .update({ stock: Number(prod.stock ?? 0) + Number(it.quantity ?? 0) })
            .eq("id", it.product_id);
        }
      }
    }

    // 8) email (JANGAN bikin webhook gagal)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const { data: profile } = await service
        .from("profiles")
        .select("email")
        .eq("id", order.user_id)
        .maybeSingle();

      const to = profile?.email;
      if (to && appUrl) {
        if (mapped.payment_status === "paid") {
          await sendOrderEmail({
            to,
            subject: "Payment Success - Order Paid",
            html: paidEmailTemplate({ orderId: order.id, total: order.total, appUrl }),
          });
        } else if (mapped.payment_status === "failed" || mapped.payment_status === "expired") {
          await sendOrderEmail({
            to,
            subject: "Payment Failed/Expired",
            html: failedEmailTemplate({
              orderId: order.id,
              reason: payload.transaction_status ?? "unknown",
              appUrl,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Email error (ignored):", emailErr);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("🔥 WEBHOOK ERROR:", e?.message);
    if (e?.stack) console.error(e.stack);
    if (payload) console.error("Payload:", payload);

    return NextResponse.json({ error: e?.message ?? "Webhook error" }, { status: 500 });
  }
}