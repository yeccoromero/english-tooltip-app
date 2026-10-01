import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Where Supabase sends the user after Google / email-link login: trade the one-time code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site paths, so a crafted link can't redirect elsewhere with a fresh session.
  const next = searchParams.get("next");
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${redirectTo}`);
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
