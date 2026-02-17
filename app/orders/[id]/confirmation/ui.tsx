"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import type { OrderRow } from "@/types/order";
import { useResilientRealtime } from "@/hooks/useResilientRealtime";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart.store";
import { cn } from "@/lib/utils";
import {
  Ban,
  RefreshCw,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

declare global {
  interface Window {
    snap?: { pay: (token: string, opt?: any) => void };
  }
}

function snapScriptUrl(isProd: boolean) {
  return isProd
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

async function ensureSnapLoaded() {
  if (window.snap) return;

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  if (!clientKey) throw new Error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY is missing");

  const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = snapScriptUrl(isProd);
    s.async = true;
    s.setAttribute("data-client-key", clientKey);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Midtrans Snap.js"));
    document.body.appendChild(s);
  });
}

function statusLower(o: OrderRow) {
  return String(o.status ?? "").toLowerCase();
}

function paymentLower(o: OrderRow) {
  return String(o.payment_status ?? "").toLowerCase();
}

function isPaid(order: OrderRow) {
  return paymentLower(order) === "paid";
}

function isTerminal(order: OrderRow) {
  const st = statusLower(order);
  // order sudah ditutup / selesai -> jangan boleh bayar/cancel
  return st === "cancelled" || st === "expired" || st === "completed";
}

function canCancel(order: OrderRow) {
  const st = statusLower(order);
  if (st === "shipped" || st === "completed" || st === "cancelled" || st === "expired") return false;
  return true;
}

export default function RealtimeOrderClient({
  orderId,
  initialOrder,
}: {
  orderId: string;
  initialOrder: OrderRow;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderRow>(initialOrder);

  const [payLoading, setPayLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const didClearCart = useRef(false);
  const waitingPaidRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realtimeEnabled = Boolean(orderId);

  const realtimeConfig = useMemo(
    () => ({
      event: "UPDATE" as const,
      schema: "public",
      table: "orders",
      filter: `id=eq.${orderId}`,
    }),
    [orderId]
  );

  useResilientRealtime(
    `order-live-detail-${orderId}`,
    realtimeConfig,
    (payload) => {
      const next = payload.new as OrderRow;
      if (!next?.id) return;
      if (next.id !== orderId) return;

      setOrder((prev) => ({
        ...prev,
        ...next,
        payment_status: next.payment_status,
        status: next.status,
      }));

      // ✅ stop waitingPaid + fallback kalau order sudah terminal / bukan paid flow
      const nextPay = String(next.payment_status ?? "").toLowerCase();
      const nextStatus = String(next.status ?? "").toLowerCase();

      const nextTerminal =
        nextStatus === "cancelled" ||
        nextStatus === "expired" ||
        nextStatus === "completed";

      if (nextPay === "paid" || nextTerminal) {
        waitingPaidRef.current = false;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
      }
    },
    {
      enabled: realtimeEnabled,
      resubscribeIntervalMs: 60_000,
      syncAuthToRealtime: true,
    }
  );

  // ✅ if paid -> clear cart once
  useEffect(() => {
    if (didClearCart.current) return;
    if (!isPaid(order)) return;

    didClearCart.current = true;

    useCartStore
      .getState()
      .clearCart()
      .catch(() => {})
      .finally(() => {
        router.refresh();
      });
  }, [order.payment_status, router]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const unpaid = !isPaid(order);
  const terminal = isTerminal(order);
  const cancellable = canCancel(order);

  const cancelLabel = unpaid ? "Cancel order" : "Request cancel";
  const cancelHelp = unpaid
    ? "You can cancel before payment is completed."
    : "Paid orders require admin approval before cancellation.";

  async function checkStatus() {
    // ✅ jangan cek status kalau terminal
    if (terminal) return;

    setCheckLoading(true);
    try {
      const res = await fetch(`/api/payment/status?order_id=${orderId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to check status");

      toast.success(`Payment status: ${data?.mapped?.payment_status ?? "ok"}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setCheckLoading(false);
    }
  }

  async function continuePayment(force = false) {
    // ✅ jangan bisa bayar kalau sudah cancelled/expired/completed
    if (terminal) {
      toast.error("Order sudah ditutup, tidak bisa lanjut pembayaran.");
      return;
    }

    setPayLoading(true);
    try {
      await ensureSnapLoaded();

      const res = await fetch("/api/payment/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, force }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to continue payment");

      if (data.paid) {
        toast.success("Order already paid");
        router.refresh();
        return;
      }

      const token = String(data.snap_token ?? "");
      if (!token) throw new Error("snap_token is missing");

      window.snap?.pay(token, {
        onSuccess: () => {
          toast.success("Payment successful. Waiting for confirmation...");
          waitingPaidRef.current = true;

          if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = setTimeout(() => {
            if (waitingPaidRef.current && !isPaid(order) && !isTerminal(order)) checkStatus();
          }, 8000);
        },
        onPending: () => {
          toast.message("Waiting for payment");
          router.refresh();
        },
        onClose: () => {
          toast.message("Payment not completed. You can continue later.");
        },
        onError: async () => {
          if (!force) {
            toast.message("Token may be expired. Generating a new token...");
            await continuePayment(true);
          } else {
            toast.error("Unable to open payment.");
          }
        },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setPayLoading(false);
    }
  }

  async function cancelOrRequestCancel() {
    if (!cancellable) {
      toast.error("Order tidak bisa dibatalkan.");
      return;
    }

    if (terminal) {
      toast.error("Order sudah ditutup.");
      return;
    }

    const paid = isPaid(order);

    const ok = window.confirm(
      paid
        ? "Order sudah dibayar. Ini akan mengirim permintaan pembatalan ke admin. Lanjut?"
        : "Batalkan order ini?"
    );
    if (!ok) return;

    setCancelLoading(true);
    try {
      const res = await fetch(paid ? "/api/orders/cancel-request" : "/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);

      toast.success(paid ? "Permintaan cancel dikirim ke admin." : "Order berhasil dibatalkan.");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setCancelLoading(false);
    }
  }

  const terminalMsg =
    statusLower(order) === "cancelled"
      ? "Order telah dibatalkan. Pembayaran tidak dapat dilanjutkan."
      : statusLower(order) === "expired"
      ? "Order telah expired. Pembayaran tidak dapat dilanjutkan."
      : statusLower(order) === "completed"
      ? "Order telah selesai."
      : null;

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Live payment</div>
          <div className="text-sm">
            <span className="font-semibold capitalize">{String(order.payment_status ?? "")}</span>
          </div>
        </div>

        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        Monitoring order in realtime...
      </div>

      {/* ✅ Terminal info */}
      {terminal ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5" />
          <div>
            <div className="font-medium text-foreground/90">Order closed</div>
            <div>{terminalMsg}</div>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      {!terminal ? (
        <div className="pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unpaid ? (
              <>
                <Button
                  onClick={() => continuePayment(false)}
                  disabled={payLoading}
                  className="text-black w-full"
                >
                  <CreditCard className={cn("h-4 w-4 mr-2", payLoading && "animate-pulse")} />
                  {payLoading ? "Opening payment..." : "Continue payment"}
                </Button>

                <Button
                  variant="outline"
                  onClick={checkStatus}
                  disabled={checkLoading}
                  className="w-full"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", checkLoading && "animate-spin")} />
                  {checkLoading ? "Checking..." : "Check status"}
                </Button>
              </>
            ) : (
              <div className="sm:col-span-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground/90">Paid order</div>
                  <div>Cancellation requires admin approval.</div>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={cancelOrRequestCancel}
              disabled={cancelLoading || !cancellable}
              className={cn("w-full", unpaid ? "" : "sm:col-span-2")}
            >
              <Ban className={cn("h-4 w-4 mr-2", cancelLoading && "animate-pulse")} />
              {cancelLoading ? "Processing..." : cancelLabel}
            </Button>
          </div>

          <div className="mt-2 text-[11px] text-muted-foreground">
            {!cancellable ? (
              <span>
                <b>Cancel unavailable:</b> Unavailable after {String(order.status)}.
              </span>
            ) : (
              <span>{cancelHelp}</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}