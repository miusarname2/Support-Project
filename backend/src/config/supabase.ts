import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Admin client using service role key - bypasses RLS
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Create a client scoped to a specific user's JWT
export function createUserClient(token: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
