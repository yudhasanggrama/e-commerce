import ProductNotFound from "@/components/product/ProductNotFound";
import ProductClient from "./product-client";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/products"; // ✅ pakai file yang sudah signed url

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>; // ✅ Next 16: params Promise
}) {
  try {
    const { productId } = await params; // ✅ unwrap params

    const product = await getProductBySlug(productId);
    if (!product) return <ProductNotFound />;

    const relatedProducts = await getRelatedProducts({
      currentProductId: product.id,
      categoryId: product.category_id,
      limit: 4,
    });

    return <ProductClient product={product} relatedProducts={relatedProducts} />;
  } catch {
    return <ProductNotFound />;
  }
}
