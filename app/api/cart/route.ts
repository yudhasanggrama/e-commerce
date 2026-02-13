import { NextResponse } from "next/server";
import {
  fetchMyCart,
  setCartItemQty,
  removeCartItem,
} from "@/lib/cart/cart.service";

/**
 * GET /api/cart
 */
export async function GET() {
  try {
    const data = await fetchMyCart();
    return NextResponse.json(data);
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}

/**
 * POST /api/cart
 * body: { productId, qty }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, qty } = body ?? {};

    if (!productId || typeof qty !== "number") {
      return NextResponse.json(
        { message: "INVALID_BODY" },
        { status: 400 }
      );
    }

    await setCartItemQty(productId, qty);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}

/**
 * DELETE /api/cart?productId=xxx
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { message: "MISSING_PRODUCT_ID" },
        { status: 400 }
      );
    }

    await removeCartItem(productId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}