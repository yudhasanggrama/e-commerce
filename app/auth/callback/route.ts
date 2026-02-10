import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  // kalau ada error dari oauth, lempar balik ke /login biar kebaca
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(
        error_description ?? ""
      )}`
    );
  }

  if (!code) return NextResponse.redirect(`${origin}/login?error=no_code`);

  const supabase = await createSupabaseServer();
  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);

  if (exErr) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_exchange&message=${encodeURIComponent(exErr.message)}`
    );
  }

  // selesai exchange, arahkan ke halaman client
  return NextResponse.redirect(`${origin}/auth/callback-client`);
}
