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
    const ch = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new as OrderRow)
      )
      .subscribe();

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
      <div className="text-xs text-muted-foreground">
        Realtime updates aktif.
      </div>
    </div>
  );
}