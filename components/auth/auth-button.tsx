"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, Settings, Package, Shield, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InitialUser =
  | { email: string | null; full_name: string | null; role: string | null }
  | null;

export default function AuthButtons({ initialUser }: { initialUser: InitialUser }) {
  const router = useRouter();
  const pathname = usePathname();

  const hide =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/complete-profile";

  const [open, setOpen] = useState(false);

  // ✅ start dari server value (anti hilang saat refresh)
  const [ready, setReady] = useState<boolean>(true);
  const [email, setEmail] = useState<string | null>(initialUser?.email ?? null);
  const [fullName, setFullName] = useState<string | null>(initialUser?.full_name ?? null);
  const [role, setRole] = useState<string | null>(initialUser?.role ?? null);

  const reqIdRef = useRef(0);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    const load = async () => {
      const reqId = ++reqIdRef.current;
      setReady(false);

      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (reqId !== reqIdRef.current) return;

        if (!user) {
          setEmail(null);
          setFullName(null);
          setRole(null);
          return;
        }

        // tampilkan email dulu supaya tidak “hilang”
        setEmail(user.email ?? null);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (reqId !== reqIdRef.current) return;

        setFullName(profile?.full_name ?? null);
        setRole(profile?.role ?? null);
      } finally {
        if (reqId === reqIdRef.current) setReady(true);
      }
    };

    // ✅ sync sekali setelah mount
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (hide) return null;

  // Optional: kalau lagi sync, jangan bikin blank.
  // Kalau sudah ada email dari server, kita tetap tampilkan UI normal.
  const effectiveEmail = email;
  const effectiveName = (fullName?.trim() || effectiveEmail || "").trim();
  const nameForUI = effectiveName || "Account";

  if (!effectiveEmail && !ready) {
    return <div className="h-10 w-[160px] rounded-full border bg-muted animate-pulse" />;
  }

  if (!effectiveEmail) {
    return (
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Link>
      </Button>
    );
  }

  const initials = nameForUI
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdmin = role === "admin";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full px-2 gap-2 hover:bg-primary/10 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {initials}
          </div>

          <span className="hidden sm:block min-w-0 max-w-[140px] truncate text-sm font-medium">
            {nameForUI}
          </span>

          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-semibold truncate">{nameForUI}</div>
          <div className="text-xs text-muted-foreground truncate">{effectiveEmail}</div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/edit-profile">
            <Settings className="mr-2 h-4 w-4" />
            Edit Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem disabled>
          <Package className="mr-2 h-4 w-4" />
          Orders (soon)
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive cursor-pointer"
          onSelect={async (e) => {
            e.preventDefault();
            const supabase = createSupabaseBrowser();
            await supabase.auth.signOut();
            setOpen(false);
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
