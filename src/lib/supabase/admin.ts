import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

// Holds the service-role key, which bypasses Row Level Security. This module
// is guarded by "server-only" (throws a build error if ever imported from a
// client component) and must only be called from server-side code: route
// handlers, server actions, and other server-only modules.
let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const env = getServerEnv();
  cachedClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedClient;
}
