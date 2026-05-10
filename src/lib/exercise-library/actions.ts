"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/admin-guard";
import type { MuscleGroup } from "@/types/database";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

const GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "glutes",
  "core",
  "cardio",
  "full_body",
  "other",
];

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
function asGroup(value: unknown): MuscleGroup {
  if (typeof value === "string" && (GROUPS as string[]).includes(value)) {
    return value as MuscleGroup;
  }
  return "other";
}

export interface ExerciseLibraryInput {
  id?: string;
  name: string;
  name_ar?: string | null;
  muscle_group: string;
  default_sets: string;
  default_reps: string;
  default_rest_seconds: string;
  default_notes?: string | null;
  video_url?: string | null;
  image_url?: string | null;
  gif_url?: string | null;
}

export async function upsertExerciseLibraryItem(
  input: ExerciseLibraryInput,
): Promise<ActionResult<{ id: string }>> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const name = asText(input.name);
  const reps = asText(input.default_reps);
  const sets = asNumber(input.default_sets);
  const rest = asNumber(input.default_rest_seconds);

  if (!name) return { ok: false, error: "Name is required." };
  if (!reps) return { ok: false, error: "Default reps is required." };
  if (!sets || sets < 1) {
    return { ok: false, error: "Default sets must be at least 1." };
  }
  if (rest === null || rest < 0) {
    return { ok: false, error: "Default rest seconds is required." };
  }

  const payload = {
    name,
    name_ar: asText(input.name_ar ?? null),
    muscle_group: asGroup(input.muscle_group),
    default_sets: sets,
    default_reps: reps,
    default_rest_seconds: rest,
    default_notes: asText(input.default_notes ?? null),
    video_url: asText(input.video_url ?? null),
    image_url: asText(input.image_url ?? null),
    gif_url: asText(input.gif_url ?? null),
  };

  const supabase = createClient();
  if (input.id) {
    const { error } = await supabase
      .from("exercise_library")
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/exercise-library");
    return { ok: true, data: { id: input.id } };
  }

  const { data, error } = (await supabase
    .from("exercise_library")
    .insert(payload)
    .select("id")
    .maybeSingle()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save exercise." };
  }
  revalidatePath("/admin/exercise-library");
  return { ok: true, data: { id: data.id } };
}

export async function deleteExerciseLibraryItem(
  id: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { error } = await supabase
    .from("exercise_library")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/exercise-library");
  return { ok: true };
}

/**
 * Insert a per-day exercise row that copies its defaults from a library
 * item. Used by the day builder's "Add from library" action.
 */
export async function addExerciseFromLibrary(input: {
  day_id: string;
  client_id: string;
  library_id: string;
}): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = createClient();
  const { data: lib } = (await supabase
    .from("exercise_library")
    .select("*")
    .eq("id", input.library_id)
    .maybeSingle()) as {
    data: {
      name: string;
      default_sets: number;
      default_reps: string;
      default_rest_seconds: number;
      default_notes: string | null;
      video_url: string | null;
    } | null;
  };
  if (!lib) return { ok: false, error: "Library item not found." };

  const { data: existing } = (await supabase
    .from("exercises")
    .select("display_order")
    .eq("day_id", input.day_id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { display_order: number } | null };
  const nextOrder = (existing?.display_order ?? 0) + 1;

  const { error } = await supabase.from("exercises").insert({
    day_id: input.day_id,
    name: lib.name,
    sets: lib.default_sets,
    reps: lib.default_reps,
    rest_seconds: lib.default_rest_seconds,
    notes: lib.default_notes,
    video_url: lib.video_url,
    display_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/clients/${input.client_id}`);
  revalidatePath(`/admin/clients/${input.client_id}/workout`);
  revalidatePath(`/client/workouts`, "layout");
  return { ok: true };
}
