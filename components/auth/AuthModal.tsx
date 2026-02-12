"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthModalStore } from "@/stores/auth-modal.store";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AuthModal() {
  const supabase = createSupabaseBrowser();

  const open = useAuthModalStore((s) => s.open);
  const closeModal = useAuthModalStore((s) => s.closeModal);
  const consumeNextAction = useAuthModalStore((s) => s.consumeNextAction);

  const { isAuthed } = useAuthUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ kalau user sudah authed, tutup modal & jalankan next action
  useEffect(() => {
    if (!open) return;
    if (!isAuthed) return;

    (async () => {
      await consumeNextAction();
      closeModal();
      toast.success("Login berhasil");
    })();
  }, [isAuthed, open, consumeNextAction, closeModal]);

  const loginEmail = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) toast.error(error.message);
  };

  const loginGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // kalau kamu sudah set redirect url, biarkan default juga ok.
        // redirectTo: `${location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) toast.error(error.message);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? closeModal() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login untuk lanjut</DialogTitle>
          <DialogDescription>
            Kamu perlu login dulu untuk menambahkan produk ke keranjang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={loginGoogle} disabled={loading}>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">atau</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
          />

          <Button className="w-full" onClick={loginEmail} disabled={loading || !email || !password}>
            {loading ? "Loading..." : "Login"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
