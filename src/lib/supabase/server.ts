import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "./env";

export function createClient() {
  const cookieStore = (cookies() as unknown as UnsafeUnwrappedCookies);

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookie writes are safely
          // ignored here; middleware refreshes the session for us.
        }
      },
    },
  });
}

/**
 * Service-role client for server-side privileged operations (admin user
 * provisioning, server-only writes). NEVER use this in code paths that
 * could be invoked by an untrusted user without authorization checks.
 */
export function createServiceClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
