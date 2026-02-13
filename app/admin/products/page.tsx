import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
    }

function getFirstParam(v: string | string[] | undefined): string {
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (v ?? "").trim();
    }

function isUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
    );
}

export default async function AdminProductsPage({
    searchParams,
    }: {
    searchParams: Promise<SearchParams>; // ✅ Next 16: Promise
    }) {
    const supabase = await createSupabaseServer(); // ✅ jangan await


    const sp = await searchParams;

    const q = getFirstParam(sp.q);
    const category = getFirstParam(sp.category);

    let productsQuery = supabase
        .from("products")
        .select("id,name,brand,price,stock,is_active,created_at,category_id")
        .order("created_at", { ascending: false });

    if (q) {
        productsQuery = productsQuery.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
    }


    if (category && isUuid(category)) {
        productsQuery = productsQuery.eq("category_id", category);
    }

    const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] =
        await Promise.all([
        productsQuery,
        supabase.from("categories").select("id,name,slug").order("name"),
        ]);

    if (productsError) console.error("productsError:", productsError);
    if (categoriesError) console.error("categoriesError:", categoriesError);

    const list = products ?? [];
    const total = list.length;
    const activeCount = list.filter((p: any) => p.is_active).length;
    const lowStockCount = list.filter((p: any) => Number(p.stock ?? 0) <= 5).length;

    return (
        <main className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
            <p className="text-xs text-slate-500">Admin Panel</p>
            <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
            <p className="text-sm text-slate-600">
                Manage products, monitor stock levels, update availability, and edit product details.
            </p>
            </div>

            <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
            + Add Product
            </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total Products</p>
            <p className="mt-1 text-2xl font-semibold">{total}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Active Products</p>
            <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Low Stock (≤ 5)</p>
            <p className="mt-1 text-2xl font-semibold">{lowStockCount}</p>
            </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
                <label className="text-xs font-medium text-slate-600">Search</label>
                <input
                suppressHydrationWarning
                name="q"
                defaultValue={q}
                placeholder="Search by product name or brand…"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
            </div>

            <div className="sm:w-65">
                <label className="text-xs font-medium text-slate-600">Category</label>
                <select
                suppressHydrationWarning
                name="category"
                defaultValue={category}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                >
                <option value="">All categories</option>
                {(categories ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                    {c.name}
                    </option>
                ))}
                </select>
            </div>

            <div className="sm:self-end">
                <button
                suppressHydrationWarning
                type="submit"
                className="w-full rounded-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-auto"
                >
                Apply Filters
                </button>
            </div>

            {(q || category) && (
                <div className="sm:self-end">
                <Link
                    href="/admin/products"
                    className="inline-flex w-full items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-auto"
                >
                    Reset
                </Link>
                </div>
            )}
            </form>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-medium text-slate-700">Product List</p>
            <p className="text-xs text-slate-500">{total} items</p>
            </div>

            <div className="overflow-auto">
            <table className="min-w-245 w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Brand</th>
                    <th className="px-4 py-3 text-left font-medium">Price</th>
                    <th className="px-4 py-3 text-left font-medium">Stock</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
                </thead>

                <tbody>
                {list.length === 0 ? (
                    <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        No products found.
                    </td>
                    </tr>
                ) : (
                    list.map((p: any, idx: number) => {
                    const stockNum = Number(p.stock ?? 0);
                    const lowStock = stockNum <= 5;
                    const canEdit = typeof p.id === "string" && isUuid(p.id);

                    return (
                        <tr
                        key={p.id ?? idx}
                        className={cn(
                            "border-b last:border-b-0",
                            idx % 2 === 0 && "bg-white",
                            idx % 2 === 1 && "bg-slate-50/40",
                            "hover:bg-slate-100/60"
                        )}
                        >
                        <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500">ID: {String(p.id ?? "-")}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">{p.brand ?? "-"}</td>

                        <td className="px-4 py-3 font-medium text-slate-900">
                            {formatIDR(p.price)}
                        </td>

                        <td className="px-4 py-3">
                            <span
                            className={cn(
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                                lowStock
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                            )}
                            >
                            {stockNum}
                            {lowStock ? " • low" : ""}
                            </span>
                        </td>

                        <td className="px-4 py-3">
                            <span
                            className={cn(
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1",
                                p.is_active
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-rose-50 text-rose-700 ring-rose-200"
                            )}
                            >
                            {p.is_active ? "Active" : "Inactive"}
                            </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                            {canEdit ? (
                            <Link
                                href={`/admin/products/${p.id}`}
                                className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                Edit
                            </Link>
                            ) : (
                            <span className="text-xs text-slate-400">No ID</span>
                            )}
                        </td>
                        </tr>
                    );
                    })
                )}
                </tbody>
            </table>
            </div>
        </div>
        </main>
    );
}
