import { createSupabaseServer } from "@/lib/supabase/server";
import AdminOrderClient from "./ui";

export default async function AdminOrderDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params; // ✅ unwrap params dulu

  const supabase = await createSupabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <div className="p-4">Unauthorized</div>;

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRes.user.id)
    .maybeSingle();

  if (prof?.role !== "admin") return <div className="p-4">Forbidden</div>;

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

  return <AdminOrderClient order={order} items={items ?? []} />;
}