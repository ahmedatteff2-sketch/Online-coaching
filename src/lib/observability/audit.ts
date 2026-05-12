import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { log } from "./logger";

/**
 * Append a row to the `admin_audit_log` table created in
 * `0011_security_hardening.sql`. The table is append-only at the RLS
 * level, so this helper writes via the service-role client.
 *
 * The function deliberately swallows errors after logging them so an
 * audit-write failure can never block the user-facing action that
 * triggered it. Critical paths should also call Sentry / a structured
 * logger so we don't lose visibility entirely.
 *
 * Usage:
 *   await recordAdminAction({
 *     actor_id: actorId,
 *     action: "client.create",
 *     target_table: "clients",
 *     target_id: clientId,
 *     details: { email: redactedEmail },
 *   });
 *
 * Fields like `email`, `phone`, etc. should be omitted from `details`
 * unless you've already redacted them — the table is queryable by
 * future admins and stays around forever.
 */
export interface AdminActionInput {
  actor_id: string;
  action: string;
  target_table?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
}

export async function recordAdminAction(input: AdminActionInput): Promise<void> {
  try {
    const service = createServiceClient();
    const { error } = await service.from("admin_audit_log").insert({
      actor_id: input.actor_id,
      action: input.action,
      target_table: input.target_table ?? null,
      target_id: input.target_id ?? null,
      details: input.details ?? null,
    });
    if (error) {
      log.warn("recordAdminAction insert failed", {
        err: error,
        action: input.action,
        target_table: input.target_table,
        target_id: input.target_id,
      });
    }
  } catch (err) {
    log.warn("recordAdminAction threw", {
      err,
      action: input.action,
      target_table: input.target_table,
      target_id: input.target_id,
    });
  }
}
