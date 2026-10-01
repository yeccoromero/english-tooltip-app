"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Site origin of the current request (works on localhost, previews and production without config). */
async function origin(): Promise<string> {
  const h = await headers();
  const o = h.get("origin");
  if (o) return o;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=1");
  redirect(data.url);
}

/** Passwordless: Supabase emails a one-time link that lands on the same /auth/callback. */
export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/login?error=1");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) redirect("/login?error=1");
  redirect("/login?sent=1");
}
