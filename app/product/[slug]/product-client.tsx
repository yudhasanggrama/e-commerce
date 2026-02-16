"use client";

import Features from "@/components/product/Features";
import ProductBreadcrumb from "@/components/product/ProductBreadcrumb";
import RelatedProducts from "@/components/product/RelatedProducts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Heart, Minus, Plus, Share2, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/db/products";
import { useCartStore } from "@/stores/cart.store";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useAuthModalStore } from "@/stores/auth-modal.store";
import { toast } from "sonner";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

function toNum(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export default function ProductClient({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const router = useRouter();

  const addToCart = useCartStore((s) => s.addToCart);
  const setStockInCart = useCartStore((s) => s.setStock);

  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const productId = product.id; // stable per render
  const productIdRef = useRef(productId);
  productIdRef.current = productId;

  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const [stock, setStock] = useState(product.stock ?? 0);

  const [imgLoaded, setImgLoaded] = useState(false);
  const { isAuthed, loading: authLoading } = useAuthUser();
  const openAuthModal = useAuthModalStore((s) => s.openModal);

  const outOfStock = stock <= 0;
  const imgSrc = useMemo(() => product.image_signed_url ?? null, [product.image_signed_url]);
  

  useEffect(() => {
    setImgLoaded(false);
  }, [productId]);

  // sync dari props (kalau server refresh)
  useEffect(() => {
    let t: any = null;

    const softRefresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => router.refresh(), 250);
    };

    let channel: any = null;
    let authSub: any = null;
    let cancelled = false;

    const makeChannel = () =>
      supabase
        .channel(`product-detail-${productId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${productId}` },
          (payload) => {
            const next = payload.new as any;
            const prev = payload.old as any;

            // ✅ stock realtime
            const nextStock = toNum(next?.stock);
            if (nextStock !== null) {
              setStock(nextStock);
              setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, nextStock))));
              setStockInCart(productIdRef.current, nextStock);
            }

            // ✅ field lain -> refresh server (signed url, name, price, image, etc)
            const changedNonStock =
              (typeof next?.name === "string" && next?.name !== prev?.name) ||
              (toNum(next?.price) !== null && toNum(next?.price) !== toNum(prev?.price)) ||
              (next?.brand ?? null) !== (prev?.brand ?? null) ||
              (next?.description ?? null) !== (prev?.description ?? null) ||
              (next?.image_url ?? null) !== (prev?.image_url ?? null) ||
              (typeof next?.is_active === "boolean" && next?.is_active !== prev?.is_active);

            if (changedNonStock) softRefresh();
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "products", filter: `id=eq.${productId}` },
          () => {
            router.replace("/products");
            router.refresh();
          }
        )
        .subscribe((status: string) => {
          console.log("[product detail] status:", status);
        });

    const start = async () => {
      // 1) tunggu session siap
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        // 2) inject token ke realtime sebelum subscribe
        supabase.realtime.setAuth(token);
        channel = makeChannel();
      } else {
        console.log("[product detail] NO_SESSION (skip subscribe)");
      }

      // 3) kalau token berubah (login / refresh token / logout) -> resubscribe
      authSub = supabase.auth.onAuthStateChange((_evt: any, session: any) => {
        if (cancelled) return;

        const tok = session?.access_token;

        if (!tok) {
          if (channel) supabase.removeChannel(channel);
          channel = null;
          console.log("[product detail] NO_SESSION (unsubscribed)");
          return;
        }

        supabase.realtime.setAuth(tok);

        if (channel) supabase.removeChannel(channel);
        channel = makeChannel();
      });
    };

    start();

    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
      authSub?.data?.subscription?.unsubscribe?.();
    };
  }, [supabase, productId, router, setStockInCart]);

  // ✅ Realtime: UPDATE stock harus langsung berubah TANPA refresh
  useEffect(() => {
    let t: any = null;
    const softRefresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase
      .channel(`product-detail-${productId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${productId}` },
        (payload) => {


          const next = payload.new as any;
          const prev = payload.old as any;

          // ✅ stock realtime
          const nextStock = toNum(next?.stock);
          if (nextStock !== null) {
            setStock(nextStock);
            setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, nextStock))));
            setStockInCart(productIdRef.current, nextStock);
          }

          // ✅ field lain -> refresh server (signed url, name, price, image, etc)
          const changedNonStock =
            (typeof next?.name === "string" && next?.name !== prev?.name) ||
            (toNum(next?.price) !== null && toNum(next?.price) !== toNum(prev?.price)) ||
            (next?.brand ?? null) !== (prev?.brand ?? null) ||
            (next?.description ?? null) !== (prev?.description ?? null) ||
            (next?.image_url ?? null) !== (prev?.image_url ?? null) ||
            (typeof next?.is_active === "boolean" && next?.is_active !== prev?.is_active);

          if (changedNonStock) softRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "products", filter: `id=eq.${productId}` },
        () => {
          router.replace("/products");
          router.refresh();
        }
      )
      .subscribe((status) => {
        console.log("[product detail] status:", status);
      });

    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [supabase, productId, router]);

  const handleAddToCart = async () => {
    if (stock <= 0) return;

    const doAction = async () => {
      setIsAdding(true);
      await new Promise((resolve) => setTimeout(resolve, 250));

      const safeQty = Math.max(1, Math.min(quantity, stock));

      addToCart(
        {
          id: productId,
          name: product.name,
          price: product.price,
          image: imgSrc ?? "",
          stock,
          slug: product.slug,
        },
        safeQty
      );

      setIsAdding(false);
      toast.success("This product has been added to cart")
      setTimeout(() => 1600);
    };

    if (!isAuthed) {
      openAuthModal(async () => {
        await doAction();
      });
      return;
    }

    await doAction();
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    setTimeout(() => router.push("/cart"), 250);
  };

  const handleQuantityChange = (type: "increment" | "decrement") => {
    if (type === "increment") setQuantity((prev) => Math.min(prev + 1, Math.max(1, stock)));
    if (type === "decrement") setQuantity((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductBreadcrumb />

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 mb-16">
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="relative aspect-square bg-muted">
              <div
                className={cn(
                  "absolute inset-0 bg-muted transition-opacity duration-500",
                  imgLoaded ? "opacity-0" : "opacity-100"
                )}
              />

              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={product.name}
                  width={900}
                  height={900}
                  priority
                  fetchPriority="high"
                  className={cn(
                    "h-full w-full object-cover",
                    "transition duration-500 will-change-transform",
                    imgLoaded ? "blur-0 scale-100" : "blur-sm scale-[1.02]"
                  )}
                  onLoad={() => setImgLoaded(true)}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">No image</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{product.brand ? `Brand: ${product.brand}` : "Smartphone"}</span>
            <span className={cn(outOfStock ? "text-destructive" : "")}>
              {outOfStock ? "Out of stocks" : `Stocks: ${stock}`}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">(4.8) • 127 ulasan</span>

              <span className="mx-1 hidden sm:inline text-muted-foreground">•</span>

              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                {outOfStock ? "Out of stock" : "Ready"}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              {formatIDR(product.price)}
            </span>
          </div>

          {product.description ? (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          ) : (
            <p className="text-muted-foreground leading-relaxed">
              Smartphone dengan performa andal untuk harian—desain minimalis, nyaman digenggam.
            </p>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-border bg-background">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleQuantityChange("decrement")}
                    disabled={quantity <= 1}
                    className="h-10 w-10 rounded-l-xl"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <span className="px-4 py-2 min-w-16 text-center font-medium">
                    {quantity}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleQuantityChange("increment")}
                    disabled={outOfStock || quantity >= stock}
                    className="h-10 w-10 rounded-r-xl"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <span className="text-sm text-muted-foreground">Max according to stocks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={authLoading || isAdding || outOfStock}
                className="text-black"
              >
                <ShoppingCart />
                {!isAuthed ? "Add to cart" : outOfStock ? "Out of stocks" : "Add to cart"}
              </Button>

              <Button size="lg" variant="outline" onClick={handleBuyNow} disabled={outOfStock}>
                Beli sekarang
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className={cn(
                  "text-muted-foreground hover:text-black",
                  isLiked && "text-destructive"
                )}
              >
                <Heart className={cn("h-4 w-4 mr-2", isLiked && "fill-current")} />
                Wishlist
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Features />
      <RelatedProducts relatedProducts={relatedProducts} />
    </div>
  );
}