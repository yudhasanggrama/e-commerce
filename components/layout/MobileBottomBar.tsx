"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, ShoppingCart, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cart.store";

export default function MobileBottomBar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createSupabaseBrowser();

    const hasHydrated = useCartStore((s) => s.hasHydrated);
    const cartCount = useCartStore((s) =>
    s.cart.reduce((total, item) => total + item.quantity, 0)
    );



    const [email, setEmail] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string | null>(null);

    // sembunyikan di halaman auth
    const hide =
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/complete-profile";

    useEffect(() => {
        let alive = true;

        async function load() {
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!alive) return;

        if (!user) {
            setEmail(null);
            setFullName(null);
            return;
        }

        setEmail(user.email ?? null);

        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

        setFullName(profile?.full_name ?? null);
        }

        load();

        const { data: sub } = supabase.auth.onAuthStateChange(() => load());

        return () => {
        alive = false;
        sub.subscription.unsubscribe();
        };
    }, [supabase]);

    if (hide) return null;

    const ItemLink = ({
        href,
        label,
        icon: Icon,
        active,
        badge,
    }: {
        href: string;
        label: string;
        icon: any;
        active?: boolean;
        badge?: number;
    }) => (
        <Link
        href={href}
        className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
            "text-xs font-medium transition",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
        aria-current={active ? "page" : undefined}
        >
        <div className="relative">
            <Icon className="h-5 w-5" />
            {!!badge && badge > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground flex items-center justify-center">
                {badge > 99 ? "99+" : badge}
            </span>
            )}
        </div>
        <span>{label}</span>
        </Link>
    );

    const ItemButton = ({
        onClick,
        label,
        icon: Icon,
    }: {
        onClick: () => void;
        label: string;
        icon: any;
    }) => (
        <button
        type="button"
        onClick={onClick}
        className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
            "text-xs font-medium transition text-muted-foreground hover:text-foreground"
        )}
        >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
        </button>
    );

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    }

    return (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50">
        <div className="border-t bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
            <div className="mx-auto max-w-md px-2">
            <div className="grid grid-cols-4">
                <ItemLink href="/" label="Home" icon={Home} active={pathname === "/"} />

                <ItemButton
                label="Search"
                icon={Search}
                onClick={() => router.push("/products")}
                />

                <ItemLink
                href="/cart"
                label="Cart"
                icon={ShoppingCart}
                active={pathname === "/cart"}
                badge={cartCount}
                />

                {/* ACCOUNT as Sheet (no 404) */}
                <Sheet>
                <SheetTrigger asChild>
                    <button
                    suppressHydrationWarning
                    type="button"
                    className={cn(
                        "relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
                        "text-xs font-medium transition",
                        "text-muted-foreground hover:text-foreground"
                    )}
                    >
                    <User className="h-5 w-5" />
                    <span>Account</span>
                    </button>
                </SheetTrigger>

                <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader>
                    <SheetTitle>Account</SheetTitle>
                    </SheetHeader>

                    <div className="mt-4 space-y-3">
                    {email ? (
                        <div className="rounded-xl border bg-card p-4">
                        <div className="text-sm font-semibold">
                            {fullName?.trim() || "User"}
                        </div>
                        <div className="text-xs text-muted-foreground">{email}</div>
                        </div>
                    ) : (
                        <div className="rounded-xl border bg-card p-4">
                        <div className="text-sm font-semibold">Kamu belum login</div>
                        <div className="text-xs text-muted-foreground">
                            Login untuk akses akun & checkout
                        </div>
                        </div>
                    )}

                    {email ? (
                        <>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/complete-profile">Edit Profile</Link>
                        </Button>

                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                        </>
                    ) : (
                        <Button asChild className="w-full">
                        <Link href="/login">Login</Link>
                        </Button>
                    )}
                    </div>
                </SheetContent>
                </Sheet>
            </div>
            </div>
        </div>
        </div>
    );
}
