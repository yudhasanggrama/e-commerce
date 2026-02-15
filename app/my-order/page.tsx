import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import RealtimeMyOrdersClient from "./ui";

const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 10; // 10 menit

export default async function MyOrdersPage() {
  const supabase = await createSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <div className="p-4">Unauthorized</div>;

  const userId = userRes.user.id;

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      payment_status,
      total,
      created_at,
      order_items (
        id,
        name,
        image_url,
        quantity
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // helper: sign 1 path
  async function signPath(path: string | null) {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGN_EXPIRES_IN);
    if (error) return null;
    return data.signedUrl;
  }

  // sign first item image per order (biar hemat request)
  const ordersWithSigned = await Promise.all(
    (orders ?? []).map(async (o: any) => {
      const items = o.order_items ?? [];
      const first = items[0] ?? null;

      const signed = await signPath(first?.image_url ?? null);

      return {
        ...o,
        _firstItem: first,
        _firstImageSigned: signed,
        _itemCount: items.length,
      };
    })
  );

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">My Orders</h1>

      <RealtimeMyOrdersClient userId={userId} />

      <div className="space-y-3">
        {ordersWithSigned.map((o: any) => {
          const first = o._firstItem;
          const moreCount = Math.max(0, (o._itemCount ?? 0) - 1);

          return (
            <Link
              key={o.id}
              href={`/orders/${o.id}/confirmation`}
              className="block border rounded-lg p-3 hover:bg-muted/30 transition"
            >
              <div className="flex gap-3">
                <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
                  {o._firstImageSigned ? (
                    <Image
                      src={o._firstImageSigned}
                      alt={first?.name ?? "Product"}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-muted-foreground">
                        {o.id}
                      </div>

                      <div className="font-semibold text-sm line-clamp-1">
                        {first?.name ?? "Order"}
                      </div>

                      {moreCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          +{moreCount} item lainnya
                        </div>
                      )}

                      <div className="text-sm mt-1">
                        Rp {Number(o.total ?? 0).toLocaleString("id-ID")}
                      </div>
                    </div>

                    <OrderStatusBadge status={o.status} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}