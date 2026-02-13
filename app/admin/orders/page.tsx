import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AdminOrdersPage(
  props: { searchParams: Promise<{ status?: string }> }
) {
  const { status } = await props.searchParams; // ⬅️ unwrap

  const supabase = await createSupabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <div className="p-4">Unauthorized</div>;

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRes.user.id)
    .maybeSingle();

  if (prof?.role !== "admin") return <div className="p-4">Forbidden</div>;

  let q = supabase
    .from("orders")
    .select("id,status,payment_status,total,created_at,user_id")
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data: orders } = await q;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Admin - Orders</h1>

      <div className="flex gap-2 text-sm">
        <Link className="underline" href="/admin/orders">All</Link>
        <Link className="underline" href="/admin/orders?status=pending">Pending</Link>
        <Link className="underline" href="/admin/orders?status=paid">Paid</Link>
        <Link className="underline" href="/admin/orders?status=shipped">Shipped</Link>
        <Link className="underline" href="/admin/orders?status=expired">Expired</Link>
      </div>

      <div className="space-y-2">
        {(orders ?? []).map((o: any) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="block border rounded-lg p-3"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-mono text-sm">{o.id}</div>
                <div className="text-sm text-muted-foreground">
                  Rp {o.total.toLocaleString("id-ID")} • {o.status} • {o.payment_status}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString("id-ID")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}