"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import GoogleIcon from "@/components/icons/google-icon";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const supabase = createSupabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  async function loginWithGoogle() {
  try {
    setLoadingGoogle(true);

    const origin = window.location.origin;
    const redirectTo = `${window.location.origin}/auth/callback`;


    console.log("redirectTo:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    console.log("oauth data:", data);
    if (error) {
      console.error("oauth error:", error);
      toast.error(error.message);
    }
  } catch (e: any) {
    console.error("loginWithGoogle catch:", e);
    toast.error(e?.message ?? "Unexpected error");
  } finally {
    setLoadingGoogle(false);
  }
  }


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingEmail(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoadingEmail(false);
    if (error) return toast.error(error.message);

    // ambil user
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    if (!user) return;

    // cek profile di DB
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    toast.success("Login sukses");

    // 🚨 kalau belum ada full name → complete profile
    if (!profile?.full_name) {
      router.push("/complete-profile");
      router.refresh();
      return;
    }

    // kalau sudah punya profile
    router.push(next ?? "/");
    router.refresh();
  }


  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Sign in to start shopping</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 hover:bg-primary/10"
            onClick={loginWithGoogle}
            disabled={loadingEmail || loadingGoogle}
          >
            <GoogleIcon size={18} />
            {loadingGoogle ? "Redirect to Google..." : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">atau</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button className="w-full text-black" disabled={loadingEmail || loadingGoogle}>
              {loadingEmail ? "Loading..." : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link className="underline text-foreground" href="/signup">
              Signup
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
