"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/admin-guard";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import type { MealFoodItem, NutritionMode } from "@/types/database";

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

const MODES: NutritionMode[] = ["fixed", "flexible"];
function asMode(value: unknown): NutritionMode | null {
  return typeof value === "string" && (MODES as string[]).includes(value)
    ? (value as NutritionMode)
    : null;
}

function revalidateNutritionPaths(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/admin/clients/${clientId}/nutrition`);
  revalidatePath(`/client/nutrition`, "layout");
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface UpsertPlanInput {
  client_id: string;
  mode: string; // 'fixed' | 'flexible'
  calories_target?: string | null;
  protein_target?: string | null;
  carbs_target?: string | null;
  fat_target?: string | null;
}

/** Create or update the active nutrition plan for a client (admin only). */
export async function upsertNutritionPlan(
  input: UpsertPlanInput,
): Promise<ActionResult<{ planId: string }>> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const mode = asMode(input.mode);
  if (!mode) return { ok: false, error: "Invalid mode." };

  const supabase = createClient();
  const { data: existing } = (await supabase
    .from("nutrition_plans")
    .select("id")
    .eq("client_id", input.client_id)
    .eq("is_active", true)
    .maybeSingle()) as { data: { id: string } | null };

  const payload = {
    mode,
    calories_target: asNumber(input.calories_target),
    protein_target: asNumber(input.protein_target),
    carbs_target: asNumber(input.carbs_target),
    fat_target: asNumber(input.fat_target),
  };

  if (existing) {
    const { error } = await supabase
      .from("nutrition_plans")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidateNutritionPaths(input.client_id);
    return { ok: true, data: { planId: existing.id } };
  }

  const { data, error } = (await supabase
    .from("nutrition_plans")
    .insert({ client_id: input.client_id, is_active: true, ...payload })
    .select("id")
    .maybeSingle()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save plan." };
  }
  revalidateNutritionPaths(input.client_id);
  return { ok: true, data: { planId: data.id } };
}

// ---------------------------------------------------------------------------
// Meals (fixed mode)
// ---------------------------------------------------------------------------

export interface UpsertMealInput {
  meal_id?: string;
  plan_id: string;
  client_id: string;
  meal_type: string;
  food_items: MealFoodItem[];
}

export async function upsertMeal(
  input: UpsertMealInput,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const meal_type = asText(input.meal_type);
  if (!meal_type) return { ok: false, error: "Meal type is required." };
  const supabase = createClient();

  if (input.meal_id) {
    const { error } = await supabase
      .from("meals")
      .update({ meal_type, food_items: input.food_items })
      .eq("id", input.meal_id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: existing } = (await supabase
      .from("meals")
      .select("display_order")
      .eq("plan_id", input.plan_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: { display_order: number } | null };
    const nextOrder = (existing?.display_order ?? 0) + 1;
    const { error } = await supabase.from("meals").insert({
      plan_id: input.plan_id,
      meal_type,
      food_items: input.food_items,
      display_order: nextOrder,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidateNutritionPaths(input.client_id);
  return { ok: true };
}

export async function deleteMeal(
  mealId: string,
  clientId: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) return { ok: false, error: error.message };
  revalidateNutritionPaths(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Food database (admin)
// ---------------------------------------------------------------------------

export interface UpsertFoodInput {
  food_id?: string;
  name: string;
  name_ar?: string | null;
  calories_per_100g: string;
  protein_per_100g: string;
  carbs_per_100g: string;
  fat_per_100g: string;
}

export async function upsertFood(
  input: UpsertFoodInput,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const name = asText(input.name);
  if (!name) return { ok: false, error: "Name is required." };
  const calories = asNumber(input.calories_per_100g);
  const protein = asNumber(input.protein_per_100g);
  const carbs = asNumber(input.carbs_per_100g);
  const fat = asNumber(input.fat_per_100g);
  if (calories === null || protein === null || carbs === null || fat === null) {
    return { ok: false, error: "All macros per 100g are required." };
  }

  const payload = {
    name,
    name_ar: asText(input.name_ar ?? null),
    calories_per_100g: calories,
    protein_per_100g: protein,
    carbs_per_100g: carbs,
    fat_per_100g: fat,
    is_custom: true,
  };

  if (input.food_id) {
    const { error } = await supabase
      .from("food_database")
      .update(payload)
      .eq("id", input.food_id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("food_database").insert(payload);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/nutrition");
  revalidatePath("/admin/nutrition/foods");
  revalidatePath(`/client/nutrition`, "layout");
  return { ok: true };
}

export async function deleteFood(foodId: string): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { error } = await supabase
    .from("food_database")
    .delete()
    .eq("id", foodId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/nutrition/foods");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Client food logging (flexible IIFYM)
// ---------------------------------------------------------------------------

export interface LogFoodInput {
  food_id: string;
  weight_grams: string;
  meal_type?: string | null;
  log_date?: string;
}

export async function logFood(input: LogFoodInput): Promise<ActionResult> {
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
    key: `logFood:${client.id}`,
    max: 120,
    windowMs: 60_000,
  });
  if (!limit.ok) return { ok: false, error: rateLimitMessage(limit.retryAt) };

  const grams = asNumber(input.weight_grams);
  if (grams === null || grams <= 0) {
    return { ok: false, error: "Weight in grams is required." };
  }

  const { data: food } = (await supabase
    .from("food_database")
    .select("*")
    .eq("id", input.food_id)
    .maybeSingle()) as {
    data: {
      calories_per_100g: number;
      protein_per_100g: number;
      carbs_per_100g: number;
      fat_per_100g: number;
    } | null;
  };
  if (!food) return { ok: false, error: "Food not found." };

  const factor = grams / 100;
  const round = (n: number) => Math.round(n * 100) / 100;

  const today = input.log_date ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("food_logs").insert({
    client_id: client.id,
    food_id: input.food_id,
    log_date: today,
    weight_grams: grams,
    calculated_calories: round(food.calories_per_100g * factor),
    calculated_protein: round(food.protein_per_100g * factor),
    calculated_carbs: round(food.carbs_per_100g * factor),
    calculated_fat: round(food.fat_per_100g * factor),
    meal_type: asText(input.meal_type ?? null),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/client/nutrition");
  revalidatePath("/client/dashboard");
  return { ok: true };
}

export async function deleteFoodLog(logId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("food_logs").delete().eq("id", logId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/client/nutrition");
  return { ok: true };
}
