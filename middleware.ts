import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  const pathname = req.nextUrl.pathname;

  res.headers.set("x-pathname", pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[MW] path:", pathname, "user:", !!user, "id:", user?.id);

  // not logged in
  if (!user) {
    if (pathname.startsWith("/admin")) {
      const redirectRes = NextResponse.redirect(new URL("/", req.url));
      redirectRes.headers.set("x-pathname", "/");
      return redirectRes;
    }
    return res;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("[MW] profile:", profile, "error:", error);

  const role = profile?.role;
  if (pathname === "/" && role === "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/products";

    const redirectRes = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    redirectRes.headers.set("x-pathname", "/admin/products");

    return redirectRes;
  }


  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";

    const redirectRes = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    redirectRes.headers.set("x-pathname", "/");

    return redirectRes;
  }

  return res;
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
