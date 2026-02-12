"use client";

import {
  Menu,
  Search,
  ShoppingCart,
  X,
  ChevronDown,
  Phone,
  Sparkles,
  ShieldCheck,
  Package,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import AuthButtons from "../auth/auth-button";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

type Category = {
  label: string;
  href: string;
  icon?: React.ElementType;
};

export default function Header({
  initialUser,
}: {
  initialUser: { email: string | null; full_name: string | null; role: string | null } | null;
}) {

  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const cartCount = useCartStore((s) =>
    s.cart.reduce((total, item) => total + item.quantity, 0)
  );



  const pathname = usePathname();
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catOpen, setCatOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/complete-profile";

  // Tokopedia-ish categories, tapi tetap clean. Nanti bisa ganti jadi dinamis dari DB.
  const categories: Category[] = useMemo(
    () => [
      { label: "Smartphone", href: "/products", icon: Phone },
      { label: "Flagship", href: "/products?sort=price_desc", icon: Sparkles },
      { label: "Garansi Resmi", href: "/products", icon: ShieldCheck },
      { label: "Aksesoris", href: "/products", icon: Package },
    ],
    []
  );

  const navItems = useMemo(() => [{ href: "/contact", label: "Contact" }], []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setCatOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleMobileMenu = useCallback(() => setIsMobileOpen((p) => !p), []);
  const closeMobileMenu = useCallback(() => setIsMobileOpen(false), []);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
    setCatOpen(false);
    setIsMobileOpen(false);
  };

  

  // =========================
  // AUTH PAGES (simple)
  // =========================
  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-foreground">
              Phone<span className="text-primary">Commerce</span>
            </span>
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Contact
          </Link>
        </div>
      </header>
    );
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-background/80 backdrop-blur",
          "transition-shadow",
          isScrolled ? "shadow-sm" : "shadow-none"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6">
          {/* Single-row (Shopify style) */}
          <div className="h-16 flex items-center gap-3">
            {/* Left: logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
              <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                Phone<span className="text-primary">Commerce</span>
              </span>
            </Link>

            {/* Center: search (Tokopedia vibes, clean) */}
            <div className="hidden md:flex flex-1">
              <form onSubmit={onSubmitSearch} className="relative w-full max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  suppressHydrationWarning
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Looking for iPhone, Samsung, Xiaomi..."
                  className={cn(
                    "w-full h-10 rounded-full border bg-background pl-11 pr-10 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30"
                  )}
                />
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>
            </div>

            {/* Right: actions */}
            <div className="ml-auto flex items-center gap-2">
              {/* Desktop nav links (optional) */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "px-3 py-2 rounded-full text-sm font-medium transition",
                      pathname === it.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {it.label}
                  </Link>
                ))}
              </nav>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative rounded-full p-2 hover:bg-muted transition"
                aria-label={`Cart with ${cartCount} items`}
              >
                <ShoppingCart className="h-5 w-5 text-foreground" />
                {hasHydrated && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              <div className="hidden sm:flex items-center">
                <AuthButtons initialUser={initialUser} />
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
