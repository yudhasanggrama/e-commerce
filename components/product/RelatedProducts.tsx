import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/db/products";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

export default function RelatedProducts({
  relatedProducts,
}: {
  relatedProducts: Product[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-foreground">Related Products</h2>
        <Button variant="ghost" asChild>
          <Link href="/products" className="text-primary hover:text-primary/80">
            View All
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((p) => (
          <Card key={p.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
            <Link href={`/product/${p.slug}`}>
              <div className="aspect-square overflow-hidden bg-muted">
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-1 mb-2">{p.name}</h3>
                <p className="text-lg font-bold text-primary">{formatIDR(p.price)}</p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
