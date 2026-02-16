import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseService } from "@/lib/supabase/service";
import { sendOrderEmail, paidEmailTemplate, failedEmailTemplate } from "@/lib/resend"; 

/**
 * Midtrans signature:
 * sha512(order_id + status_code + gross_amount + serverKey)
 */
function verifySignature(body: any) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;

  const raw = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === body.signature_key;
}

function extractOrderUuid(providerOrderId: string): string | null {
  if (!providerOrderId) return null;
  const m = providerOrderId.match(/^order-([0-9a-fA-F-]{36})$/);
  return m?.[1] ?? null;
}

function mapMidtransToOrder(body: any): {
  status: string;
  payment_status: string;
  paid_at: string | null;
} {
  const tx = (body.transaction_status ?? "").toLowerCase();
  const fraud = (body.fraud_status ?? "").toLowerCase();
  const paidAt = new Date().toISOString();

  const isPaid = tx === "settlement" || tx === "capture" || tx === "success";
  const isFailed = tx === "deny" || tx === "expire" || tx === "cancel" || tx === "failure";
  const isPending = tx === "pending";

  if (isPaid) {
    if (fraud === "challenge") {
      return { status: "pending", payment_status: "unpaid", paid_at: null };
    }
    return { status: "paid", payment_status: "paid", paid_at: paidAt };
  }

  if (isFailed) return { status: "cancelled", payment_status: "failed", paid_at: null };
  if (isPending) return { status: "pending", payment_status: "unpaid", paid_at: null };

  return { status: "pending", payment_status: "unpaid", paid_at: null };
}

export async function POST(req: Request) {
  const service = createSupabaseService();

  try {
    const body = await req.json();

    if (!verifySignature(body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const providerOrderId = body.order_id as string; // "order-<uuid>"
    const orderId = extractOrderUuid(providerOrderId);

    if (!orderId) {
      return NextResponse.json(
        { error: "Invalid provider order_id format", providerOrderId },
        { status: 400 }
      );
    }

    // 1) Update payments (recommended)
    await service
      .from("payments")
      .update({
        provider: "midtrans",
        provider_order_id: providerOrderId, // ✅ ini harus order_id dari midtrans (order-uuid)
        transaction_status: body.transaction_status ?? null,
        fraud_status: body.fraud_status ?? null,
        payment_type: body.payment_type ?? null,
        gross_amount: Number(body.gross_amount ?? 0),
        payload: body,
      })
      .eq("order_id", orderId);

    const mapped = mapMidtransToOrder(body);
    const isPaid = mapped.payment_status === "paid";
    const isFailed = mapped.payment_status === "failed";

    // 2) Ambil order + email user (profiles)
    const { data: orderRow, error: orderErr } = await service
      .from("orders")
      .select("id,user_id,total,payment_email_sent,failed_email_sent")
      .eq("id", orderId)
      .single();

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: profile } = await service
      .from("profiles")
      .select("email,full_name")
      .eq("id", orderRow.user_id)
      .single();

    const to = profile?.email;
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";

    // 3) Paid branch
    if (isPaid) {
      // Optional RPC fulfill
      const { error: rpcErr } = await service.rpc("fulfill_order_paid", {
        p_order_id: orderId,
      });

      await service
        .from("orders")
        .update({
          status: mapped.status,                 // "paid" (atau kamu bisa ganti jadi "processing")
          payment_status: mapped.payment_status, // "paid"
          paid_at: mapped.paid_at,
        })
        .eq("id", orderId);

      // ✅ Send email sekali saja
      if (to && !orderRow.payment_email_sent) {
        await sendOrderEmail({
          to,
          subject: `Payment Success ✅ (Order ${orderId})`,
          html: paidEmailTemplate({
            orderId,
            total: orderRow.total,
            appUrl,
          }),
        });

        await service
          .from("orders")
          .update({
            payment_email_sent: true,
            payment_email_sent_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }

      // Midtrans harus tetap 200 (biar tidak retry spam)
      if (rpcErr) {
        console.error("[midtrans] fulfill_order_paid error:", rpcErr.message);
        return NextResponse.json(
          { ok: true, warning: "paid_but_fulfill_failed", detail: rpcErr.message },
          { status: 200 }
        );
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 4) Non-paid (pending/failed/cancel/expire)
    await service
      .from("orders")
      .update({
        status: mapped.status,
        payment_status: mapped.payment_status,
        paid_at: mapped.paid_at, // null untuk pending/failed
      })
      .eq("id", orderId);

    // ✅ Optional: kirim email gagal/expired sekali saja
    if (isFailed && to && !orderRow.failed_email_sent) {
      await sendOrderEmail({
        to,
        subject: `Pembayaran gagal / expired (Order ${orderId})`,
        html: failedEmailTemplate({
          orderId,
          reason: `${body.transaction_status ?? "failed"}${body.fraud_status ? ` (${body.fraud_status})` : ""}`,
          appUrl,
        }),
      });

      await service
        .from("orders")
        .update({
          failed_email_sent: true,
          failed_email_sent_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[midtrans notification] error:", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}