"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function RealtimeOrdersRefresh() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 300);
    };

    const channel = supabase
      .channel("admin-orders-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        refresh
      )
      .subscribe((st) => console.log("[rt] subscribe:", st));

      

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null;
}