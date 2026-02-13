import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServer();

  // contoh: ambil data ringkas (sesuaikan tabelmu)
  const [{ count: productCount }, { count: activeCount }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Store performance overview and quick actions.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
          >
            View Products
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            View Orders
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" value={productCount ?? 0} hint="All items in catalog" />
        <StatCard title="Active Products" value={activeCount ?? 0} hint="Visible on storefront" />
        <StatCard title="Orders (Today)" value="—" hint="Connect orders table" />
        <StatCard title="Revenue (This Month)" value="—" hint="Connect payments table" />
      </div>

      {/* Analytics + Recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Analytics placeholder */}
        <div className="lg:col-span-2 rounded-xl border bg-background p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sales Analytics</p>
              <p className="text-xs text-muted-foreground">
                Add a chart here (daily revenue, orders, conversion).
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </div>

          <div className="mt-4 h-65 rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
            Chart placeholder
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm font-medium">Recent Activity</p>
          <p className="text-xs text-muted-foreground">
            Latest updates (new products, stock edits, new orders).
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs text-muted-foreground">
                Once you connect orders, recent events will show here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
