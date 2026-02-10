import AdminProductFormClient from "@/components/admin/admin-product-form-client";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  if (!id || !isUuid(id)) return notFound();

  const supabase = await createSupabaseServer();

  const [{ data: product, error: productErr }, { data: categories, error: catErr }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase.from("categories").select("*").order("name"),
    ]);

  if (productErr) throw new Error(productErr.message);
  if (catErr) throw new Error(catErr.message);
  if (!product) return notFound();

  // ✅ pastikan plain JSON biar stabil
  const safeProduct = JSON.parse(JSON.stringify(product));
  const safeCategories = JSON.parse(JSON.stringify(categories ?? []));

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Edit Produk</h1>

      {/* ✅ render form dari client wrapper */}
      <AdminProductFormClient categories={safeCategories} defaultValues={safeProduct} />
    </main>
  );
}
