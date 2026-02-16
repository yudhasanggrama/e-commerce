"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import type { OrderRow } from "@/types/order";

export default function RealtimeOrderClient({
  orderId,
  initialOrder,
}: {
  orderId: string;
  initialOrder: OrderRow;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [order, setOrder] = useState<OrderRow>(initialOrder);

  useEffect(() => {
    if (!orderId) return;

    const ch = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const next = payload.new as Partial<OrderRow> | null;
          if (!next) return;
          setOrder((prev) => ({ ...prev, ...next } as OrderRow));
        }
      )
      .subscribe((st) => console.log("[order realtime] subscribe:", st));

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, orderId]);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          Live payment: <b>{order.payment_status}</b>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="text-xs text-muted-foreground">Realtime updates active.</div>
    </div>
  );
}