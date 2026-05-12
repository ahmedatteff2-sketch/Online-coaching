"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/admin-guard";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { readClientIp } from "@/lib/security/client-ip";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { log } from "@/lib/observability/logger";
import {
  sendApplicationAcceptedEmail,
  sendApplicationReceivedEmail,
} from "@/lib/email";
import type {
  ActivityLevel,
  ApplicationStatus,
  ContactMethod,
  ExperienceLevel,
  Gender,
  TrainingGoal,
  TrainingLocation,
} from "@/types/database";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

const TRAINING_GOALS: TrainingGoal[] = [
  "fat_loss",
  "muscle_gain",
  "recomposition",
  "athletic_performance",
];
const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];
const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];
const TRAINING_LOCATIONS: TrainingLocation[] = ["home", "gym", "both"];
const CONTACT_METHODS: ContactMethod[] = ["whatsapp", "phone", "email"];
const GENDERS: Gender[] = ["male", "female", "other"];
const APPLICATION_STATUSES: ApplicationStatus[] = [
  "new",
  "contacted",
  "in_review",
  "accepted",
  "rejected",
  "archived",
];

const inSet =
  <T extends string>(values: readonly T[]) =>
  (raw: unknown): T | null =>
    typeof raw === "string" && (values as readonly string[]).includes(raw)
      ? (raw as T)
      : null;

const asGoal = inSet(TRAINING_GOALS);
const asExperience = inSet(EXPERIENCE_LEVELS);
const asActivity = inSet(ACTIVITY_LEVELS);
const asLocation = inSet(TRAINING_LOCATIONS);
const asContact = inSet(CONTACT_METHODS);
const asGender = inSet(GENDERS);
const asStatus = inSet(APPLICATION_STATUSES);

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
function asTextRequired(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}
function asNumber(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
function asInt(value: unknown): number | null {
  const n = asNumber(value);
  return n === null ? null : Math.trunc(n);
}
function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}
function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const v = value.trim().toLowerCase();
  return v === "on" || v === "true" || v === "1" || v === "yes";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 320;
const MAX_PHONE_LEN = 32;
const MAX_LONG_TEXT = 2000;
const MAX_SHORT_TEXT = 1000;

/**
 * Cap each free-text field at a sane upper bound so a spammer can't
 * push multi-megabyte payloads through the public intake form. The
 * server-side bounds are mirrored as `check` constraints in
 * `0011_security_hardening.sql` to keep the DB safe against direct API
 * abuse.
 */
function clampText(
  value: string | null,
  max: number,
): string | null {
  if (value === null) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export type CoachingApplicationFormData = Record<
  string,
  string | string[] | undefined
>;

/**
 * Public-facing action — accepts a flat FormData-like payload (already
 * passed through `Object.fromEntries`) from the intake form. Validates
 * required fields and rate-limits by IP to slow down spam.
 */
export async function submitCoachingApplication(
  raw: CoachingApplicationFormData,
): Promise<ActionResult<{ id: string }>> {
  const ip = readClientIp();
  const rl = await checkRateLimit({
    key: `application:${ip}`,
    max: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    const locale = asText(raw.locale) === "ar" ? "ar" : "en";
    return { ok: false, error: rateLimitMessage(rl.retryAt, locale) };
  }

  // Verify Turnstile CAPTCHA if configured. Locale-aware error messages
  // make failures explicable to Arabic speakers.
  const captchaToken = asText(raw.captcha_token);
  const captcha = await verifyTurnstileToken(captchaToken, ip);
  if (!captcha.ok) {
    const locale = asText(raw.locale) === "ar" ? "ar" : "en";
    return {
      ok: false,
      error:
        locale === "ar"
          ? "فشل التحقق من أنك لست روبوت. حاول تاني."
          : "CAPTCHA verification failed. Please try again.",
    };
  }

  const fullName = asTextRequired(raw.full_name);
  const email = asTextRequired(raw.email).toLowerCase();
  const phone = asTextRequired(raw.phone);

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Invalid email." };
  if (phone.length < 5) return { ok: false, error: "Invalid phone." };
  if (fullName.length > MAX_NAME_LEN)
    return { ok: false, error: "Full name is too long." };
  if (email.length > MAX_EMAIL_LEN)
    return { ok: false, error: "Email is too long." };
  if (phone.length > MAX_PHONE_LEN)
    return { ok: false, error: "Phone is too long." };

  const payload = {
    full_name: fullName,
    email,
    phone,
    country: asText(raw.country),
    city: asText(raw.city),
    preferred_contact: asContact(raw.preferred_contact) ?? "whatsapp",
    best_contact_time: asText(raw.best_contact_time),

    age: asInt(raw.age),
    gender: asGender(raw.gender),
    height_cm: asNumber(raw.height_cm),
    weight_kg: asNumber(raw.weight_kg),
    body_fat_percent: asNumber(raw.body_fat_percent),

    goal: asGoal(raw.goal),
    target_weight_kg: asNumber(raw.target_weight_kg),
    target_date: asDate(raw.target_date),
    motivation_text: clampText(asText(raw.motivation_text), MAX_LONG_TEXT),

    experience_level: asExperience(raw.experience_level),
    previous_coaching: asBool(raw.previous_coaching),
    previous_results_text: clampText(
      asText(raw.previous_results_text),
      MAX_LONG_TEXT,
    ),

    training_days_per_week: asInt(raw.training_days_per_week),
    training_location: asLocation(raw.training_location),
    available_equipment_text: clampText(
      asText(raw.available_equipment_text),
      MAX_LONG_TEXT,
    ),
    preferred_training_time: clampText(
      asText(raw.preferred_training_time),
      MAX_SHORT_TEXT,
    ),

    injuries_or_conditions: clampText(
      asText(raw.injuries_or_conditions),
      MAX_LONG_TEXT,
    ),
    medications: clampText(asText(raw.medications), MAX_SHORT_TEXT),
    allergies: clampText(asText(raw.allergies), MAX_SHORT_TEXT),
    surgeries_text: clampText(asText(raw.surgeries_text), MAX_LONG_TEXT),

    dietary_restrictions: clampText(
      asText(raw.dietary_restrictions),
      MAX_SHORT_TEXT,
    ),
    foods_disliked: clampText(asText(raw.foods_disliked), MAX_SHORT_TEXT),
    current_diet_summary: clampText(
      asText(raw.current_diet_summary),
      MAX_LONG_TEXT,
    ),
    water_intake_liters: asNumber(raw.water_intake_liters),

    occupation: asText(raw.occupation),
    daily_activity_level: asActivity(raw.daily_activity_level),
    sleep_hours_avg: asNumber(raw.sleep_hours_avg),
    stress_level: asInt(raw.stress_level),
    smokes: asBool(raw.smokes),

    package_id: asText(raw.package_id),
    notes: clampText(asText(raw.notes), MAX_LONG_TEXT),
    locale: asText(raw.locale) === "ar" ? "ar" : "en",
    status: "new" as ApplicationStatus,
  };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("coaching_applications")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("submitCoachingApplication failed", { err: error });
    return { ok: false, error: "Could not submit your application." };
  }

  revalidatePath("/admin/applications");

  // Best-effort confirmation email. Failure here must not block the
  // submission — the row is already saved and the admin will follow up.
  void sendApplicationReceivedEmail({
    to: payload.email,
    fullName: payload.full_name,
    locale: payload.locale === "ar" ? "ar" : "en",
  }).catch((err) => {
    log.error("sendApplicationReceivedEmail failed", { err });
  });

  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!asStatus(status)) return { ok: false, error: "Invalid status." };

  const supabase = createClient();
  const update: Record<string, unknown> = { status };
  if (status === "contacted") {
    update.contacted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("coaching_applications")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // When an admin moves an application to "accepted", trigger the welcome
  // email. Read back the row first to get the applicant's name + locale.
  if (status === "accepted") {
    const { data: row } = await supabase
      .from("coaching_applications")
      .select("full_name, email, locale")
      .eq("id", id)
      .maybeSingle();
    if (row?.email) {
      void sendApplicationAcceptedEmail({
        to: row.email,
        fullName: row.full_name ?? "",
        locale: row.locale === "ar" ? "ar" : "en",
      }).catch((err) => {
        log.error("sendApplicationAcceptedEmail failed", { err });
      });
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
  return { ok: true };
}

export async function updateApplicationNotes(
  id: string,
  adminNotes: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("coaching_applications")
    .update({ admin_notes: adminNotes.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/applications/${id}`);
  return { ok: true };
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("coaching_applications")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/applications");
  return { ok: true };
}
