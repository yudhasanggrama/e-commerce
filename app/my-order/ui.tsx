"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function RealtimeMyOrdersClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  useEffect(() => {
    const ch = supabase
      .channel(`orders-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId, router]);

  return null;
}