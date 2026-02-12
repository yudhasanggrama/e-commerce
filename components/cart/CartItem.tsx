"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCartStore, type CartItem as CartItemType } from "@/stores/cart.store";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

interface CartItemProps {
  item: CartItemType;
  isLast: boolean;
}

export default function CartItem({ item, isLast }: CartItemProps) {
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const outOfStock = item.stock <= 0;
  const disablePlus = outOfStock || item.quantity >= item.stock;

  return (
    <div>
      <div className="flex items-start gap-4">
        <div className="relative w-[100px] h-[100px]">
          <Image
            src={item.image || "/placeholder.png"}
            alt={item.name}
            fill
            sizes="100px"
            className="rounded-lg object-cover bg-muted"
            unoptimized
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="font-semibold text-foreground line-clamp-2">
                {item.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formatIDR(item.price)} each • Stock:{" "}
                <span className={outOfStock ? "text-destructive font-semibold" : "font-semibold"}>
                  {item.stock}
                </span>
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFromCart(item.id)}
              className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center border border-border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                disabled={item.quantity <= 1}
                className="h-8 w-8 rounded-r-none"
              >
                <Minus className="h-3 w-3" />
              </Button>

              <span className="px-4 py-2 min-w-[50px] text-center text-sm font-medium">
                {item.quantity}
              </span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={disablePlus}
                className="h-8 w-8 rounded-l-none"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                {formatIDR(item.price * item.quantity)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!isLast && <Separator className="mt-4" />}
    </div>
  );
}
