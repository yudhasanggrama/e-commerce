// app/api/checkout/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { createMidtransSnap } from "@/lib/midtrans";

type CartItemInput = { product_id: string; quantity: number };

type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes.user;

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const items = (body.items ?? []) as CartItemInput[];
    const shipping = body.shipping ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Service role buat read products + read profile (kalau RLS ketat)
    const service = createSupabaseService();

    // Ambil profile (optional)
    const { data: profile } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const productIds = items.map((i) => i.product_id);

    const { data: productsRaw, error: prodErr } = await service
      .from("products")
      .select("id,name,price,stock,image_url,is_active")
      .in("id", productIds);

    if (prodErr) throw prodErr;

    const products = (productsRaw ?? []) as ProductRow[];
    const map = new Map(products.map((p) => [p.id, p]));

    // Validasi item + stok (cek stok sekarang, tapi belum “reserve”)
    for (const it of items) {
      const p = map.get(it.product_id);
      if (!p || !p.is_active) {
        return NextResponse.json(
          { error: "Product inactive/not found" },
          { status: 400 }
        );
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
      }
      if (p.stock < it.quantity) {
        return NextResponse.json(
          { error: `Stock not enough: ${p.name}` },
          { status: 400 }
        );
      }
    }

    // Hitung subtotal (server-side)
    let subtotal = 0;
    for (const it of items) {
      const p = map.get(it.product_id)!;
      subtotal += p.price * it.quantity;
    }

    const shippingFee = subtotal > 500_000 ? 0 : 25_000;
    const total = subtotal + shippingFee;

    // 1) Create order (PENDING) — stok belum berkurang
    const { data: orderIns, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        payment_status: "unpaid", 
        subtotal,
        shipping_fee: shippingFee,
        total,
        paid_at: null,
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;
    const orderId = orderIns.id as string;

    // 2) Insert order_items
    const orderItems = items.map((it) => {
      const p = map.get(it.product_id)!;
      return {
        order_id: orderId,
        product_id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        quantity: it.quantity,
      };
    });

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      // rollback: hapus order kalau gagal insert items
      await service.from("orders").delete().eq("id", orderId);
      throw itemsErr;
    }

    // 3) Midtrans Snap (gross_amount harus = total)
    const providerOrderId = `order-${orderId}`;

    const snap = await createMidtransSnap({
      providerOrderId,
      grossAmount: total,
      customer: {
        first_name: String(shipping.name ?? profile?.full_name ?? "Customer")
          .trim()
          .split(" ")[0],
        email: shipping.email ?? user.email ?? "",
        phone: shipping.phone ?? "",
      },
      items: orderItems.map((oi) => ({
        id: oi.product_id!,
        price: oi.price,
        quantity: oi.quantity,
        name: oi.name,
      })),
    });

    // 4) payments row (optional tapi bagus untuk audit)
    const { error: payErr } = await supabase.from("payments").insert({
      order_id: orderId,
      provider: "midtrans",
      provider_order_id: providerOrderId,
      gross_amount: total,
      transaction_status: "pending",
      payload: snap,
    });

    if (payErr) throw payErr;

    return NextResponse.json({
      order_id: orderId,
      snap_token: snap.token,
      redirect_url: snap.redirect_url,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Checkout failed" },
      { status: 500 }
    );
  }
}