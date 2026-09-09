// Server-only Supabase client — uses the service_role key, which bypasses
// RLS (see supabase/migrations/0001_init.sql). Never import from a "use
// client" file.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

type Result<T> = { data: T | null; error: { message: string } | null };

/** Throws on a PostgREST error; returns the (possibly null) data otherwise. */
export function check<T>(res: Result<T>): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Like check(), but the data must be present. */
export function unwrap<T>(res: Result<T>): T {
  const data = check(res);
  if (data === null) throw new Error("Supabase returned no data");
  return data;
}
