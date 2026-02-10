import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type Product = {
  created_at?: any;
  updated_at?: any;
  id: string;
  name: string;
  slug: string;
  brand: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;          // PATH: products/xxx.jpg
  image_signed_url?: string | null;  // SIGNED URL
  is_active: boolean;
  category_id: string | null;
};

const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 30; // 30 menit (lebih nyaman buat browsing)

async function signImagePaths<T extends { image_url: string | null }>(
  rows: T[]
): Promise<(T & { image_signed_url: string | null })[]> {
  const admin = createSupabaseAdmin();

  return await Promise.all(
    rows.map(async (row) => {
      if (!row.image_url) return { ...row, image_signed_url: null };

      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(row.image_url, SIGN_EXPIRES_IN);

      if (error) return { ...row, image_signed_url: null };

      return { ...row, image_signed_url: data.signedUrl };
    })
  );
}

export async function getCategories() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(params: {
  search?: string;
  category?: string; // slug
  sort?: string;
}) {
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("products")
    .select("id,name,slug,brand,description,price,stock,image_url,is_active,category_id")
    .eq("is_active", true);

  if (params.search) query = query.ilike("name", `%${params.search}%`);

  if (params.category) {
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.category)
      .maybeSingle();

    if (catErr) throw catErr;
    if (cat?.id) query = query.eq("category_id", cat.id);
  }

  if (params.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (params.sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("name", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  return await signImagePaths((data ?? []) as Product[]);
}

export async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,brand,description,price,stock,image_url,category_id,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [signed] = await signImagePaths([data as Product]);
  return signed;
}

export async function getRelatedProducts(params: {
  currentProductId: string;
  categoryId?: string | null;
  limit?: number;
}) {
  const supabase = await createSupabaseServer();
  const limit = params.limit ?? 4;

  let q = supabase
    .from("products")
    .select("id,name,slug,brand,description,price,stock,image_url,category_id,is_active")
    .eq("is_active", true)
    .neq("id", params.currentProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.categoryId) q = q.eq("category_id", params.categoryId);

  const { data, error } = await q;
  if (error) throw error;

  return await signImagePaths((data ?? []) as Product[]);
}
