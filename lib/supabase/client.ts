import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components (uses the session cookie; RLS limits it to the user's own rows). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
