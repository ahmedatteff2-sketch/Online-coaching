"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import type { WorkoutDoneStatus } from "@/types/database";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
function asBool(value: unknown): boolean {
  if (value === true || value === "true" || value === "on") return true;
  return false;
}
const STATUS: WorkoutDoneStatus[] = ["yes", "partial", "no"];
function asStatus(value: unknown): WorkoutDoneStatus | null {
  return typeof value === "string" && (STATUS as string[]).includes(value)
    ? (value as WorkoutDoneStatus)
    : null;
}

async function getCurrentClientId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = (await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: { id: string } | null };
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Weight log
// ---------------------------------------------------------------------------
export async function logWeight(input: {
  weight_kg: string;
  log_date?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const clientId = await getCurrentClientId();
  if (!clientId) return { ok: false, error: "Not authenticated." };
  const limit = await checkRateLimit({
    key: `logWeight:${clientId}`,
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) return { ok: false, error: rateLimitMessage(limit.retryAt) };
  const w = asNumber(input.weight_kg);
  if (w === null || w <= 0) return { ok: false, error: "Weight is required." };

  const today = input.log_date ?? new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("weight_logs")
    .upsert(
      { client_id: clientId, log_date: today, weight_kg: w },
      { onConflict: "client_id,log_date" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/client/progress");
  revalidatePath("/client/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Body measurements
// ---------------------------------------------------------------------------
export interface SaveBodyMeasurementInput {
  measured_on?: string;
  weight_kg?: string;
  waist_cm?: string;
  chest_cm?: string;
  shoulders_cm?: string;
  hips_cm?: string;
  left_arm_cm?: string;
  right_arm_cm?: string;
  left_thigh_cm?: string;
  right_thigh_cm?: string;
  body_fat_percent?: string;
}

export async function saveBodyMeasurement(
  input: SaveBodyMeasurementInput,
): Promise<ActionResult> {
  const supabase = createClient();
  const clientId = await getCurrentClientId();
  if (!clientId) return { ok: false, error: "Not authenticated." };
  const measured_on =
    input.measured_on?.trim() || new Date().toISOString().slice(0, 10);
  const payload = {
    client_id: clientId,
    measured_on,
    weight_kg: asNumber(input.weight_kg),
    waist_cm: asNumber(input.waist_cm),
    chest_cm: asNumber(input.chest_cm),
    shoulders_cm: asNumber(input.shoulders_cm),
    hips_cm: asNumber(input.hips_cm),
    left_arm_cm: asNumber(input.left_arm_cm),
    right_arm_cm: asNumber(input.right_arm_cm),
    left_thigh_cm: asNumber(input.left_thigh_cm),
    right_thigh_cm: asNumber(input.right_thigh_cm),
    body_fat_percent: asNumber(input.body_fat_percent),
  };
  const { error } = await supabase
    .from("body_measurements")
    .upsert(payload, { onConflict: "client_id,measured_on" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/client/progress");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Progress photos
// ---------------------------------------------------------------------------
/**
 * Strict allow-list for progress-photo `storage_path` values. Must match
 * the RLS-enforced bucket layout `<client_uuid>/<filename>` where the
 * filename is a UUID + small extension (we generate these client-side
 * and we don't want spam clients pushing arbitrary metadata into the
 * column).
 */
const PROGRESS_PHOTO_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._\-]{1,128}$/;

export async function addProgressPhoto(input: {
  storage_path: string;
  taken_on?: string;
  note?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  const clientId = await getCurrentClientId();
  if (!clientId) return { ok: false, error: "Not authenticated." };
  const limit = await checkRateLimit({
    key: `addProgressPhoto:${clientId}`,
    max: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) return { ok: false, error: rateLimitMessage(limit.retryAt) };

  // Defence in depth: confirm the path matches the expected shape *and*
  // belongs to the caller. RLS already enforces this at storage level,
  // but rejecting bad input here gives a clearer error and prevents
  // orphaned rows that point at someone else's bucket prefix.
  const path = input.storage_path?.trim() ?? "";
  if (!PROGRESS_PHOTO_PATH_RE.test(path)) {
    return { ok: false, error: "Invalid storage path." };
  }
  if (!path.startsWith(`${clientId}/`)) {
    return { ok: false, error: "Storage path does not belong to you." };
  }

  const { error } = await supabase.from("progress_photos").insert({
    client_id: clientId,
    storage_path: path,
    taken_on: input.taken_on ?? new Date().toISOString().slice(0, 10),
    note: asText(input.note ?? null),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/client/progress");
  return { ok: true };
}

export async function deleteProgressPhoto(
  photoId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const clientId = await getCurrentClientId();
  if (!clientId) return { ok: false, error: "Not authenticated." };
  // Attempt storage delete first (RLS will reject anything not owned)
  await supabase.storage.from("progress-photos").remove([storagePath]);
  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", photoId)
    .eq("client_id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/client/progress");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Daily check-in
// ---------------------------------------------------------------------------
export interface SaveCheckinInput {
  workout_done: string;
  workout_sets_done?: string;
  diet_compliance?: string;
  cardio_done?: string | boolean;
  cardio_minutes?: string;
  sleep_quality?: string;
  sleep_hours?: string;
  client_note?: string | null;
  checkin_date?: string;
}

export async function saveCheckin(
  input: SaveCheckinInput,
): Promise<ActionResult> {
  const supabase = createClient();
  const clientId = await getCurrentClientId();
  if (!clientId) return { ok: false, error: "Not authenticated." };
  const limit = await checkRateLimit({
    key: `saveCheckin:${clientId}`,
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) return { ok: false, error: rateLimitMessage(limit.retryAt) };
  const status = asStatus(input.workout_done);
  if (!status) return { ok: false, error: "Workout status is required." };
  const checkin_date =
    input.checkin_date?.trim() || new Date().toISOString().slice(0, 10);
  const payload = {
    client_id: clientId,
    checkin_date,
    workout_done: status,
    workout_sets_done:
      status === "partial" ? asNumber(input.workout_sets_done) : null,
    diet_compliance: asNumber(input.diet_compliance),
    cardio_done: asBool(input.cardio_done),
    cardio_minutes: asNumber(input.cardio_minutes),
    sleep_quality: asNumber(input.sleep_quality),
    sleep_hours: asNumber(input.sleep_hours),
    client_note: asText(input.client_note ?? null),
  };
  const { error } = await supabase
    .from("daily_checkins")
    .upsert(payload, { onConflict: "client_id,checkin_date" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/client/checkin");
  revalidatePath("/client/dashboard");
  return { ok: true };
}
