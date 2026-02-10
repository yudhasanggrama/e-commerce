"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { Check, Eye, Heart, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/types/product";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

export default function ProductCard({ product }: { product: Product }) {
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const { addToCart } = useCart();

  // ✅ untuk private bucket: pakai signed url
  const imgSrc = product.image_signed_url ?? null;

  // kalau product berubah, reset imageError biar tidak "nyangkut"
  useEffect(() => {
    setImageError(false);
  }, [product.id, imgSrc]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAdding(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      // note: signed url bisa expire; kalau cart butuh persist, simpan path/id saja.
      image: imgSrc ?? "",
      quantity: 1,
    });

    setIsAdding(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked((v) => !v);
  };

  return (
    <Card className="group overflow-hidden bg-card border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          name="Like Button"
          className={cn(
            "absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-sm hover:bg-background",
            isLiked && "opacity-100 text-destructive"
          )}
          onClick={handleToggleLike}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
        </Button>

        <Link href={`/products/${product.slug}`} className="block relative">
          <div className="aspect-square overflow-hidden bg-muted">
            {!imageError && imgSrc ? (
              <Image
                src={imgSrc}
                alt={product.name}
                width={400}
                height={400}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
                // ✅ signed url sering ber-querystring; ini paling aman di Next dev
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-muted-foreground text-sm">Image not available</div>
              </div>
            )}
          </div>

          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Eye className="h-4 w-4 mr-2" />
              Quick View
            </Button>
          </div>
        </Link>
      </div>

      <CardContent className="p-4 space-y-3">
        <Link href={`/products/${product.slug}`}>
          <h2 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h2>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{formatIDR(product.price)}</span>
        </div>

        <Button
          className={cn(
            "w-full transition-all duration-300",
            justAdded
              ? "bg-green-600 text-white hover:bg-green-600"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={handleAddToCart}
          disabled={isAdding || product.stock <= 0}
        >
          {isAdding ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Adding...
            </div>
          ) : justAdded ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Added to Cart!
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {product.stock <= 0 ? "Out of stock" : "Add to Cart"}
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
