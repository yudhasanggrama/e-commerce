"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, ShoppingCart, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { clientLogout } from "@/lib/auth/logout";

export default function MobileBottomBar() {
  const pathname = usePathname();
  const router = useRouter();

  const hydratedCart = useCartStore((s) => s.hydrated);
  const cartCount = useCartStore((s) => s.itemCount());

  const authHydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  const hide =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/complete-profile";

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
        {!!badge && badge > 0 && hydratedCart && (
          <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground flex items-center justify-center">
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
      suppressHydrationWarning
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
    await clientLogout();
    router.replace("/");
    router.refresh();
  }

  const nameForUI = (user?.full_name?.trim() || user?.email || "User").trim();

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50">
      <div className="border-t bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/65">
        <div className="mx-auto max-w-md px-2">
          <div className="grid grid-cols-4">
            <ItemLink href="/" label="Home" icon={Home} active={pathname === "/"} />
            <ItemButton label="Search" icon={Search} onClick={() => router.push("/products")} />
            <ItemLink
              href="/cart"
              label="Cart"
              icon={ShoppingCart}
              active={pathname === "/cart"}
              badge={cartCount}
            />

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
                  {!authHydrated ? (
                    <div className="h-20 rounded-xl border bg-muted animate-pulse" />
                  ) : user?.email ? (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-sm font-semibold">{nameForUI}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-sm font-semibold">Not Login Yet</div>
                      <div className="text-xs text-muted-foreground">
                        Login to access account & checkout
                      </div>
                    </div>
                  )}

                  {user?.email ? (
                    <>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/complete-profile">Edit Profile</Link>
                      </Button>

                      <Button variant="destructive" className="w-full" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button asChild className="w-full text-black">
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