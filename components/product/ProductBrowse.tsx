"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, ArrowUpDown, Tag, CheckCircle2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { Product } from "@/lib/db/products";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { useAuthModalStore } from "@/stores/auth-modal.store";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; slug: string };

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function ProductBrowse({
  products,
  categories,
  selectedCategory,
  search,
  sort,
  page,
}: {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  search: string;
  sort: string;
  page: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // Hydration-safe (Radix Select mismatch + extension)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Cart store
  const addToCart = useCartStore((s) => s.addToCart);

  // Auth store + modal
  const user = useAuthStore((s) => s.user);
  const openModal = useAuthModalStore((s) => s.openModal);

  // ✅ UI state untuk tombol Add (per produk)
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  async function doAddToCart(p: Product) {
    if (p.stock <= 0) return;

    // kalau lagi loading di produk ini, stop
    if (loadingId === p.id) return;

    setLoadingId(p.id);

    // biar smooth (simulasi delay kecil)
    await new Promise((r) => setTimeout(r, 350));

    addToCart(
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        image: p.image_signed_url || "/placeholder-product.png",
        stock: p.stock,
      },
      1
    );

    setLoadingId(null);
    setAddedId(p.id);

    // balik normal setelah 1.5s
    window.setTimeout(() => {
      setAddedId((cur) => (cur === p.id ? null : cur));
    }, 1500);
  }

  async function handleAddToCart(e: React.MouseEvent, p: Product) {
    e.preventDefault();
    e.stopPropagation();

    if (p.stock <= 0) return;

    // ✅ kalau belum login: buka modal dan simpan aksi add-to-cart untuk dijalankan setelah login
    if (!user?.email) {
      openModal(async () => {
        await doAddToCart(p);
      });
      return;
    }

    await doAddToCart(p);
  }

  const categoryItems = useMemo(
    () => [{ id: "all", name: "All Products", slug: "all" }, ...categories],
    [categories]
  );

  function setQuery(next: Record<string, string | undefined>) {
    const qs = new URLSearchParams(sp.toString());

    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all" || v === "") qs.delete(k);
      else qs.set(k, v);
    });

    if (next.category !== undefined || next.sort !== undefined || next.search !== undefined) {
      qs.delete("page");
    }

    router.push(`${pathname}${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          {search ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Showing results for <span className="font-medium text-foreground">{search}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Find the best smartphones for your needs.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpDown className="h-4 w-4" />
            Sort
          </div>

          {mounted ? (
            <Select value={sort || "name_asc"} onValueChange={(v) => setQuery({ sort: v })}>
              <SelectTrigger className="w-50 rounded-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name A–Z</SelectItem>
                <SelectItem value="price_asc">Price Low to High</SelectItem>
                <SelectItem value="price_desc">Price High to Low</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="h-10 w-50 rounded-full border" />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl border bg-background p-4 sticky top-24">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Category</div>
              <Badge variant="secondary" className="rounded-full text-black">
                {categoryItems.length - 1}
              </Badge>
            </div>

            <div className="space-y-1">
              {categoryItems.map((c) => {
                const active = (selectedCategory || "all") === c.slug;

                const qs = new URLSearchParams();
                if (search) qs.set("search", search);
                if (sort) qs.set("sort", sort);
                if (c.slug !== "all") qs.set("category", c.slug);

                const href = `/products${qs.toString() ? `?${qs.toString()}` : ""}`;

                return (
                  <Link
                    key={c.id}
                    href={href}
                    className={[
                      "group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition text-black",
                      active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    ].join(" ")}
                  >
                    <span>{c.name}</span>
                    {active ? <CheckCircle2 className="h-4 w-4 text-black" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <section>
          {/* Mobile category pills */}
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden pb-1">
            {categoryItems.map((c) => {
              const active = (selectedCategory || "all") === c.slug;
              return (
                <Button
                  key={c.id}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setQuery({ category: c.slug })}
                  className="shrink-0 rounded-full text-black"
                >
                  {c.name}
                </Button>
              );
            })}
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border bg-background p-10 text-center">
              <div className="text-base font-semibold">Products not found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                We couldn&apos;t find any products matching your criteria.
              </div>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" className="text-black" onClick={() => setQuery({ search: "" })}>
                  Reset search
                </Button>
                <Button variant="outline" className="text-black" onClick={() => setQuery({ category: "all" })}>
                  All Categories
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p, idx) => {
                const src = p.image_signed_url ?? "/placeholder-product.png";
                const out = p.stock <= 0;

                const isLoading = loadingId === p.id;
                const isAdded = addedId === p.id;

                return (
                  <div
                    key={p.id}
                    className="group rounded-2xl border bg-background overflow-hidden hover:shadow-sm transition"
                  >
                    {/* Clickable area */}
                    <Link href={`/product/${p.slug}`} className="block">
                      <div className="relative aspect-4/5 w-full bg-muted">
                        <Image
                          src={src}
                          alt={p.name}
                          fill
                          className={[
                            "object-cover transition-transform duration-300",
                            "group-hover:scale-[1.03]",
                            out ? "opacity-70" : "",
                          ].join(" ")}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          priority={idx < 4}
                        />

                        {/* Badges */}
                        <div className="absolute left-3 top-3 flex flex-col gap-2">
                          {out ? (
                            <Badge className="rounded-full" variant="destructive">
                              Sold out
                            </Badge>
                          ) : (
                            <Badge className="rounded-full" variant="secondary">
                              <Tag className="mr-1 h-3.5 w-3.5" />
                              Ready
                            </Badge>
                          )}
                        </div>

                        {/* Soft gradient bottom */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background/90 to-transparent" />
                      </div>

                      <div className="p-3">
                        <div className="text-[11px] text-muted-foreground">{p.brand}</div>
                        <div className="mt-1 line-clamp-2 text-sm font-medium leading-snug">
                          {p.name}
                        </div>
                        <div className="mt-3 text-base font-semibold">Rp {formatIDR(p.price)}</div>
                      </div>
                    </Link>

                    {/* Actions */}
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className={cn(
                            "rounded-xl transition-all duration-300",
                            isAdded
                              ? "bg-green-600 text-white hover:bg-green-600"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          )}
                          onClick={(e) => handleAddToCart(e, p)}
                          disabled={isLoading || out}
                        >
                          {isLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Adding...
                            </div>
                          ) : isAdded ? (
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              Add
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              {out ? "Out Of Stock" : "Add"}
                            </div>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-black"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/product/${p.slug}`);
                          }}
                        >
                          Detail
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-10 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              disabled={page <= 1}
              onClick={() => setQuery({ page: String(page - 1) })}
            >
              Prev
            </Button>
            <div className="text-sm text-muted-foreground">Page {page}</div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setQuery({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}