"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Truck, XCircle } from "lucide-react";

import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import PaymentStatusBadge from "@/components/order/PaymentStatusBadge";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
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
  const [status, setStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const computedSubtotal = useMemo(() => {
    return (items ?? []).reduce((acc, it) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0), 0);
  }, [items]);

  async function updateStatus(next: NextStatus) {
    if (next === status) return;

    setLoading(true);
    const prev = status;
    setStatus(next); // optimistik biar terasa cepat

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // kalau bukan JSON
      }

      if (!res.ok) {
        throw new Error(json?.error ?? `Failed (${res.status})`);
      }

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
        <div>
          <h1 className="text-2xl font-bold">Order Detail</h1>
          <p className="text-sm text-muted-foreground">
            Manage order status & review items.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={status} />
          <PaymentStatusBadge status={order.payment_status} />
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
            <span className="font-medium">{formatIDR(Number(order.shipping_fee ?? 0))}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatIDR(Number(order.total ?? 0))}</span>
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
        <CardContent className="space-y-2">
          {(items ?? []).map((it) => (
            <div key={it.id} className="flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium line-clamp-1">{it.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatIDR(Number(it.price ?? 0))} × {Number(it.quantity ?? 0)}
                </div>
              </div>
              <div className="font-semibold whitespace-nowrap">
                {formatIDR(Number(it.price ?? 0) * Number(it.quantity ?? 0))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
          <CardDescription>
            Choose the next status for this order.
          </CardDescription>
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
              {/* hanya status yang boleh diubah (kamu bisa tambah pending/paid kalau perlu) */}
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