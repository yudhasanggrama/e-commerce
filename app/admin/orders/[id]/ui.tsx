"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Truck,
  XCircle,
} from "lucide-react";

import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import PaymentStatusBadge from "@/components/order/PaymentStatusBadge";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createSupabaseBrowser } from "@/lib/supabase/client";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(n);
}

const allowedNext = ["shipped", "completed", "cancelled"] as const;
type NextStatus = (typeof allowedNext)[number];

export default function AdminOrderClient({
  order,
  items,
}: {
  order: any;
  items: any[];
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!order?.id) return;

    const ch = supabase
      .channel(`rt-admin-order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const next = payload.new as any;
          if (!next) return;

          if (typeof next.status === "string") setStatus(next.status);
          if (typeof next.payment_status === "string")
            setPaymentStatus(next.payment_status);
        }
      )
      .subscribe((st) => console.log("[admin order realtime] status:", st));

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, order?.id]);

  const computedSubtotal = useMemo(() => {
    return (items ?? []).reduce(
      (acc, it) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0),
      0
    );
  }, [items]);

  async function updateStatus(next: NextStatus) {
    if (next === status) return;

    setLoading(true);
    const prev = status;
    setStatus(next); // optimistik

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {}

      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);

      setStatus(json.status ?? next);
      toast.success("Order status updated");
    } catch (e: any) {
      setStatus(prev);
      toast.error(e?.message ?? "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {/* BACK BUTTON: mobile + tablet */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/admin/orders");
            }}
            className="lg:hidden mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold">Order Detail</h1>
            <p className="text-sm text-muted-foreground">
              Manage order status & review items.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={status} />
          <PaymentStatusBadge status={paymentStatus} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription className="font-mono text-xs break-all">
            {order.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatIDR(computedSubtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">
              {formatIDR(Number(order.shipping_fee ?? 0))}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">
              {formatIDR(Number(order.total ?? 0))}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {new Date(order.created_at).toLocaleString("id-ID")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {(items ?? []).map((it) => {
            const name = it?.product?.name ?? it?.name ?? "Item";
            const img = it?.image_signed_url || "/placeholder.png";

            return (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden border bg-muted shrink-0">
                    <Image
                      src={img}
                      alt={name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium line-clamp-1">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatIDR(Number(it.price ?? 0))} ×{" "}
                      {Number(it.quantity ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="font-semibold whitespace-nowrap">
                  {formatIDR(Number(it.price ?? 0) * Number(it.quantity ?? 0))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
          <CardDescription>Choose the next status for this order.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Select
            value={status}
            onValueChange={(v) => updateStatus(v as NextStatus)}
            disabled={loading}
          >
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipped">
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4" /> shipped
                </span>
              </SelectItem>
              <SelectItem value="completed">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> completed
                </span>
              </SelectItem>
              <SelectItem value="cancelled">
                <span className="inline-flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> cancelled
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button disabled className="hidden" />

          <div className="text-xs text-muted-foreground">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
              </span>
            ) : (
              "Updates are saved immediately."
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}