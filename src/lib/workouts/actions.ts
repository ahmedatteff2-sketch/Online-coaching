"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/admin-guard";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";

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

function revalidatePlanPaths(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/admin/clients/${clientId}/workout`);
  revalidatePath(`/client/workouts`, "layout");
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export async function createPlan(
  clientId: string,
  name: string,
): Promise<ActionResult<{ planId: string }>> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Plan name is required." };

  const supabase = createClient();
  // Deactivate other plans first to keep "one active plan" invariant.
  const { error: deactErr } = await supabase
    .from("workout_plans")
    .update({ is_active: false })
    .eq("client_id", clientId);
  if (deactErr) return { ok: false, error: deactErr.message };

  const { data, error } = (await supabase
    .from("workout_plans")
    .insert({ client_id: clientId, name: trimmed, is_active: true })
    .select("id")
    .maybeSingle()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create plan." };
  }

  revalidatePlanPaths(clientId);
  return { ok: true, data: { planId: data.id } };
}

export async function renamePlan(
  planId: string,
  clientId: string,
  name: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Plan name is required." };
  const supabase = createClient();
  const { error } = await supabase
    .from("workout_plans")
    .update({ name: trimmed })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

export async function updatePlanNotes(
  planId: string,
  clientId: string,
  generalNotes: string,
  attentionNotes: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { error } = await supabase
    .from("workout_plans")
    .update({
      general_notes: asText(generalNotes),
      attention_notes: asText(attentionNotes),
    })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Day
// ---------------------------------------------------------------------------

export async function addDay(
  planId: string,
  clientId: string,
  dayName: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();

  const { data: existing } = (await supabase
    .from("workout_days")
    .select("day_number")
    .eq("plan_id", planId)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { day_number: number } | null };

  const nextNumber = (existing?.day_number ?? 0) + 1;
  const trimmed = asText(dayName) ?? `Day ${nextNumber}`;

  const { error } = await supabase.from("workout_days").insert({
    plan_id: planId,
    day_number: nextNumber,
    day_name: trimmed,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

export async function renameDay(
  dayId: string,
  clientId: string,
  dayName: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const trimmed = asText(dayName);
  if (!trimmed) return { ok: false, error: "Day name is required." };
  const supabase = createClient();
  const { error } = await supabase
    .from("workout_days")
    .update({ day_name: trimmed })
    .eq("id", dayId);
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

export async function deleteDay(
  dayId: string,
  clientId: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { error } = await supabase
    .from("workout_days")
    .delete()
    .eq("id", dayId);
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Exercise
// ---------------------------------------------------------------------------

export interface ExerciseInput {
  name: string;
  sets: string;
  reps: string;
  rest_seconds: string;
  notes?: string | null;
  video_url?: string | null;
}

export async function addExercise(
  dayId: string,
  clientId: string,
  input: ExerciseInput,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();

  const name = asText(input.name);
  const sets = asNumber(input.sets);
  const reps = asText(input.reps);
  const rest = asNumber(input.rest_seconds) ?? 90;
  if (!name) return { ok: false, error: "Exercise name is required." };
  if (!sets || sets < 1)
    return { ok: false, error: "Sets must be at least 1." };
  if (!reps) return { ok: false, error: "Reps is required (e.g. 8-12)." };

  const { data: existing } = (await supabase
    .from("exercises")
    .select("display_order")
    .eq("day_id", dayId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { display_order: number } | null };
  const nextOrder = (existing?.display_order ?? 0) + 1;

  const { error } = await supabase.from("exercises").insert({
    day_id: dayId,
    name,
    sets,
    reps,
    rest_seconds: rest,
    notes: asText(input.notes ?? null),
    video_url: asText(input.video_url ?? null),
    display_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

export async function updateExercise(
  exerciseId: string,
  clientId: string,
  input: ExerciseInput,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();

  const name = asText(input.name);
  const sets = asNumber(input.sets);
  const reps = asText(input.reps);
  const rest = asNumber(input.rest_seconds) ?? 90;
  if (!name) return { ok: false, error: "Exercise name is required." };
  if (!sets || sets < 1)
    return { ok: false, error: "Sets must be at least 1." };
  if (!reps) return { ok: false, error: "Reps is required (e.g. 8-12)." };

  const { error } = await supabase
    .from("exercises")
    .update({
      name,
      sets,
      reps,
      rest_seconds: rest,
      notes: asText(input.notes ?? null),
      video_url: asText(input.video_url ?? null),
    })
    .eq("id", exerciseId);
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

export async function deleteExercise(
  exerciseId: string,
  clientId: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId);
  if (error) return { ok: false, error: error.message };
  revalidatePlanPaths(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Workout logging (called by the client)
// ---------------------------------------------------------------------------

export interface LogSetInput {
  exercise_id: string;
  set_number: number;
  weight_kg: string;
  reps_done: string;
  log_date?: string; // yyyy-mm-dd; defaults to today
}

/**
 * Log one set. The current client (matched via profile.role=client) is
 * inferred via the `clients.user_id = auth.uid()` mapping. The action is
 * also valid for admins acting on behalf of a client (RLS allows it).
 */
export async function logSet(
  input: LogSetInput,
): Promise<ActionResult<{ logId: string }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: client } = (await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: { id: string } | null };
  if (!client) return { ok: false, error: "Client profile not found." };

  const limit = await checkRateLimit({
    key: `logSet:${client.id}`,
    max: 120,
    windowMs: 60_000,
  });
  if (!limit.ok) return { ok: false, error: rateLimitMessage(limit.retryAt) };

  const weight = asNumber(input.weight_kg);
  const reps = asNumber(input.reps_done);
  if (weight === null || weight < 0) {
    return { ok: false, error: "Weight is required." };
  }
  if (reps === null || reps < 0) {
    return { ok: false, error: "Reps is required." };
  }

  const today = input.log_date ?? new Date().toISOString().slice(0, 10);

  const { data, error } = (await supabase
    .from("workout_logs")
    .insert({
      client_id: client.id,
      exercise_id: input.exercise_id,
      log_date: today,
      set_number: input.set_number,
      weight_kg: weight,
      reps_done: reps,
    })
    .select("id")
    .maybeSingle()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not log set." };
  }

  revalidatePath(`/client/workouts`, "layout");
  return { ok: true, data: { logId: data.id } };
}
