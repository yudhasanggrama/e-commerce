"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function RealtimeMyOrdersRefresh({ userId }: { userId: string }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  const refreshTimer = useRef<number | null>(null);
  const retryTimer = useRef<number | null>(null);
  const retryCount = useRef(0);
  const chRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 250);
    };

    const cleanup = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      refreshTimer.current = null;
      retryTimer.current = null;

      if (chRef.current) {
        supabase.removeChannel(chRef.current);
        chRef.current = null;
      }
    };

    const subscribe = () => {
      cleanup(); // buang channel lama dulu biar ga numpuk

      const ch = supabase
        .channel(`rt-my-orders-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            // event masuk = realtime jalan
            // reset retry karena koneksi berhasil
            retryCount.current = 0;

            console.log("[my-orders rt]", payload.eventType, payload.new);
            refresh();
          }
        )
        .subscribe((st) => {
          console.log("[my-orders rt] subscribe:", st);

          if (st === "SUBSCRIBED") {
            retryCount.current = 0;
            return;
          }

          // kadang bisa TIMED_OUT / CLOSED kalau jaringan/proxy lagi drop
          if (st === "TIMED_OUT" || st === "CLOSED") {
            retryCount.current = Math.min(retryCount.current + 1, 6);

            // backoff: 1s, 2s, 4s, 8s, 8s...
            const delay = Math.min(1000 * 2 ** (retryCount.current - 1), 8000);

            if (retryTimer.current) window.clearTimeout(retryTimer.current);
            retryTimer.current = window.setTimeout(() => {
              subscribe();
            }, delay);
          }
        });

      chRef.current = ch;
    };

    subscribe();

    return () => {
      cleanup();
    };
  }, [supabase, router, userId]);

  return null;
}