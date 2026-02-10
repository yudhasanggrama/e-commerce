"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      console.log("session role:", sessionRes ? "authenticated" : "anon/no-session");
      
      const user = sessionRes.session?.user;

      if (!user) return router.replace("/login?error=no_session");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) return router.replace("/complete-profile");
      if (!profile.full_name?.trim()) return router.replace("/complete-profile");

      return router.replace("/");
    })();
  }, [router, supabase]);

  return <div className="p-10 text-center">Signing you in...</div>;
}
