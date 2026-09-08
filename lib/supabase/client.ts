// Browser-safe Supabase client — anon/publishable key only. Every table
// currently has RLS enabled with no anon policies (see
// supabase/migrations/0001_init.sql), so this client can't read/write
// anything yet until specific policies are added.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
