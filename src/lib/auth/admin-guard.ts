import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Returns ok=true with the current user's id when the caller is an
 * authenticated admin. The id is useful for audit logging.
 */
export async function assertAdmin(): Promise<AdminGuardResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()) as { data: { role: "admin" | "client" } | null };

  if (data?.role !== "admin") {
    return { ok: false, error: "Forbidden — admin access required." };
  }
  return { ok: true, userId: user.id };
}
