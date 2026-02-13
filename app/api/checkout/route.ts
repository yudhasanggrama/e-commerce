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
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const items = (body.items ?? []) as CartItemInput[];
    const shipping = body.shipping ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Service role buat read/update products
    const service = createSupabaseService();

    // Ambil profile hanya full_name (email pakai auth user email)
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

    // Validasi
    for (const it of items) {
      const p = map.get(it.product_id);
      if (!p || !p.is_active) {
        return NextResponse.json({ error: "Product inactive/not found" }, { status: 400 });
      }
      if (it.quantity <= 0) {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
      }
      if (p.stock < it.quantity) {
        return NextResponse.json({ error: `Stock not enough: ${p.name}` }, { status: 400 });
      }
    }

    // 1) Create order (pakai supabase session: user_id by RLS)
    const { data: orderIns, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        payment_status: "unpaid",
        subtotal: 0,
        shipping_fee: 0,
        total: 0,
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;
    const orderId = orderIns.id as string;

    // 2) order_items + subtotal
    let subtotal = 0;
    const orderItems = items.map((it) => {
      const p = map.get(it.product_id)!;
      subtotal += p.price * it.quantity;
      return {
        order_id: orderId,
        product_id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        quantity: it.quantity,
      };
    });

    const shippingFee = subtotal > 500_000 ? 0 : 25_000;
    const total = subtotal + shippingFee;

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) throw itemsErr;

    // 3) Reserve stock (kurangi stock pakai service role)
    // MVP: loop update (boleh), tapi pastikan stock tidak negatif
    for (const it of items) {
      const p = map.get(it.product_id)!;
      const next = p.stock - it.quantity;
      if (next < 0) {
        await service.from("orders").update({ status: "cancelled" }).eq("id", orderId);
        return NextResponse.json({ error: "Stock not enough" }, { status: 400 });
      }
      const { error } = await service.from("products").update({ stock: next }).eq("id", it.product_id);
      if (error) throw error;
      p.stock = next;
    }

    // 4) Update totals (INI yang bikin Rp 0 kalau kelupaan)
    const { data: orderCheck, error: chkErr } = await service
      .from("orders")
      .select("subtotal,shipping_fee,total")
      .eq("id", orderId)
      .single();

    if (chkErr) throw chkErr;

    console.log("TOTALS SAVED:", orderCheck);

    // 5) Midtrans Snap
    const providerOrderId = `order-${orderId}`; // ini yang nanti datang di payload.order_id webhook
    const snap = await createMidtransSnap({
      providerOrderId,
      grossAmount: total,
      customer: {
        first_name: (shipping.name ?? profile?.full_name ?? "Customer").split(" ")[0],
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

    // 6) payments row (pastikan provider_order_id sama dengan providerOrderId)
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
    return NextResponse.json({ error: e?.message ?? "Checkout failed" }, { status: 500 });
  }
}