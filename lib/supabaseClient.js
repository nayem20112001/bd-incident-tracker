import { createClient } from "@supabase/supabase-js";

// Create the client at runtime in the browser.
// Do NOT create it at module load, so builds don't require the keys.
export function getBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
