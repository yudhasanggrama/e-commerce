import { createSupabaseServer } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import RealtimeOrderClient from "./ui";

type Params = { id: string };

export default async function ConfirmationPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  // ✅ kompatibel: kalau params object -> langsung, kalau Promise -> di-await
  const { id } = await Promise.resolve(params);

  const supabase = await createSupabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <div className="p-4">Unauthorized</div>;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (orderErr) return <div className="p-4">Error: {orderErr.message}</div>;
  if (!order) return <div className="p-4">Order not found</div>;

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  if (itemsErr) return <div className="p-4">Error: {itemsErr.message}</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order Confirmation</h1>

      <div className="border rounded-lg p-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Order ID</div>
          <div className="font-mono">{order.id}</div>
          <div className="text-sm text-muted-foreground">
            Total: Rp {Number(order.total ?? 0).toLocaleString("id-ID")}
          </div>
          <div className="text-sm text-muted-foreground">
            Payment: {order.payment_status}
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <RealtimeOrderClient orderId={order.id} initialOrder={order} />

      <div className="border rounded-lg p-3 space-y-2">
        <div className="font-medium">Items</div>
        {(items ?? []).map((it: any) => (
          <div key={it.id} className="flex justify-between text-sm">
            <span>
              {it.name} x {it.quantity}
            </span>
            <span>Rp {Number(it.price * it.quantity).toLocaleString("id-ID")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}