import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import RealtimeMyOrdersClient from "./ui";

export default async function MyOrdersPage() {
  const supabase = await createSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <div className="p-4">Unauthorized</div>;

  const userId = userRes.user.id;

  const { data: orders } = await supabase
    .from("orders")
    .select("id,status,payment_status,total,created_at,user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">My Orders</h1>

      <RealtimeMyOrdersClient userId={userId} />

      <div className="space-y-2">
        {(orders ?? []).map((o: any) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}/confirmation`}
            className="block border rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm">{o.id}</div>
                <div className="text-sm text-muted-foreground">
                  Rp {o.total.toLocaleString("id-ID")}
                </div>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}