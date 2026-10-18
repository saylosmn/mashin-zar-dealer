import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const base = process.env.NODE_ENV === "development" || !forwardedHost ? origin : `https://${forwardedHost}`;
      // Админ нэвтэрмэгц шууд удирдлагын самбар руу орно
      let to = next;
      if (next === "/" && data.user) {
        const { data: me } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        if (me?.role === "admin") to = "/admin";
      }
      return NextResponse.redirect(`${base}${to}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
