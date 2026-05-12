"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/admin-guard";
import { recordAdminAction } from "@/lib/observability/audit";
import { log } from "@/lib/observability/logger";
import { safeHttpUrl } from "@/lib/utils/safe-url";
import type {
  BillingPeriod,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  "vodafone_cash",
  "instapay",
  "bank_transfer",
  "cash",
  "other",
];

function asMethod(v: unknown): PaymentMethod | null {
  return typeof v === "string" && (PAYMENT_METHODS as string[]).includes(v)
    ? (v as PaymentMethod)
    : null;
}
function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}
function asNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
function asInt(v: unknown): number | null {
  const n = asNumber(v);
  return n === null ? null : Math.trunc(n);
}
function asDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}
function asIso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  // Accept either full ISO or yyyy-mm-dd (convert the latter to midnight UTC).
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00Z`;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Billing-period → duration (days)
// ---------------------------------------------------------------------------
export const BILLING_PERIOD_DAYS: Record<BillingPeriod, number | null> = {
  monthly: 30,
  quarterly: 90,
  biannual: 180,
  yearly: 365,
  one_time: null, // admin-picked duration
};

export interface CreatePaymentInput {
  client_id?: string | null;
  application_id?: string | null;
  package_id?: string | null;
  amount: string;
  currency?: string | null;
  method?: string | null;
  reference_number?: string | null;
  sender_phone?: string | null;
  receipt_url?: string | null;
  period_start?: string | null;
  duration_days?: string | null; // overrides the package's natural duration
  paid_at?: string | null;
  notes?: string | null;
  /** If true, mark as confirmed immediately and advance the subscription. */
  confirm_now?: boolean;
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<ActionResult<{ id: string }>> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const amount = asNumber(input.amount);
  if (amount === null || amount < 0) {
    return { ok: false, error: "Amount must be a non-negative number." };
  }

  const clientId = asText(input.client_id);
  const applicationId = asText(input.application_id);
  if (!clientId && !applicationId) {
    return {
      ok: false,
      error: "Attach the payment to either a client or an application.",
    };
  }

  const packageId = asText(input.package_id);
  const durationDays = asInt(input.duration_days);
  let effectiveDuration: number | null = durationDays;

  // Fall back to the package's natural billing period if no override.
  if (effectiveDuration === null && packageId) {
    const supabase = createClient();
    const { data: pkg } = (await supabase
      .from("packages")
      .select("billing_period")
      .eq("id", packageId)
      .maybeSingle()) as { data: { billing_period: BillingPeriod } | null };
    if (pkg?.billing_period) {
      effectiveDuration = BILLING_PERIOD_DAYS[pkg.billing_period] ?? null;
    }
  }

  const periodStart = asDate(input.period_start);
  let periodEnd: string | null = null;
  if (periodStart && effectiveDuration && effectiveDuration > 0) {
    const start = new Date(`${periodStart}T00:00:00Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + effectiveDuration);
    periodEnd = end.toISOString().slice(0, 10);
  }

  const method = asMethod(input.method) ?? "vodafone_cash";
  const willConfirm = input.confirm_now === true;

  const payload = {
    client_id: clientId ?? null,
    application_id: applicationId ?? null,
    package_id: packageId,
    amount,
    currency: asText(input.currency) ?? "EGP",
    method,
    reference_number: asText(input.reference_number),
    sender_phone: asText(input.sender_phone),
    // Reject anything that isn't a real http(s) URL so we never store
    // `javascript:` / `data:` schemes that would later be rendered in
    // the admin UI.
    receipt_url: safeHttpUrl(asText(input.receipt_url)),
    period_start: periodStart,
    period_end: periodEnd,
    duration_days: effectiveDuration,
    status: (willConfirm ? "confirmed" : "pending") as PaymentStatus,
    paid_at: asIso(input.paid_at) ?? new Date().toISOString(),
    confirmed_at: willConfirm ? new Date().toISOString() : null,
    notes: asText(input.notes),
  };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert(payload)
    .select("id")
    .maybeSingle();
  if (error) {
    log.error("createPayment failed", { err: error });
    return { ok: false, error: error.message };
  }
  const id = (data as { id: string } | null)?.id;
  if (!id) return { ok: false, error: "Payment not created." };

  if (willConfirm && clientId) {
    await recomputeClientSubscription(supabase, clientId);
  }

  await recordAdminAction({
    actor_id: guard.userId,
    action: willConfirm ? "payment.create_and_confirm" : "payment.create",
    target_table: "payments",
    target_id: id,
    details: { amount, status: payload.status, client_id: clientId },
  });

  revalidatePath("/admin/payments");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: { id } };
}

export async function confirmPayment(id: string): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = createClient();
  const { data: current } = (await supabase
    .from("payments")
    .select("id, client_id, status")
    .eq("id", id)
    .maybeSingle()) as {
    data: { id: string; client_id: string | null; status: PaymentStatus } | null;
  };
  if (!current) return { ok: false, error: "Payment not found." };
  if (current.status === "confirmed") return { ok: true };

  const { error } = await supabase
    .from("payments")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (current.client_id) {
    await recomputeClientSubscription(supabase, current.client_id);
  }

  await recordAdminAction({
    actor_id: guard.userId,
    action: "payment.confirm",
    target_table: "payments",
    target_id: id,
    details: { client_id: current.client_id },
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${id}`);
  if (current.client_id) revalidatePath(`/admin/clients/${current.client_id}`);
  return { ok: true };
}

export async function rejectPayment(
  id: string,
  reason?: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = createClient();
  const { data: current } = (await supabase
    .from("payments")
    .select("id, client_id, notes")
    .eq("id", id)
    .maybeSingle()) as {
    data: { id: string; client_id: string | null; notes: string | null } | null;
  };
  if (!current) return { ok: false, error: "Payment not found." };

  const newNotes = reason?.trim()
    ? [current.notes, `Rejected: ${reason.trim()}`]
        .filter((s): s is string => !!s)
        .join("\n")
    : current.notes;

  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected", notes: newNotes })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (current.client_id) {
    await recomputeClientSubscription(supabase, current.client_id);
  }

  await recordAdminAction({
    actor_id: guard.userId,
    action: "payment.reject",
    target_table: "payments",
    target_id: id,
    details: { client_id: current.client_id, reason: reason?.slice(0, 200) },
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${id}`);
  return { ok: true };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { data: current } = (await supabase
    .from("payments")
    .select("client_id")
    .eq("id", id)
    .maybeSingle()) as { data: { client_id: string | null } | null };

  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (current?.client_id) {
    await recomputeClientSubscription(supabase, current.client_id);
  }

  await recordAdminAction({
    actor_id: guard.userId,
    action: "payment.delete",
    target_table: "payments",
    target_id: id,
    details: { client_id: current?.client_id },
  });

  revalidatePath("/admin/payments");
  return { ok: true };
}

/**
 * Attach a still-unlinked payment to a newly-created client. Called from the
 * "convert application → client" flow when a payment was logged under an
 * application before the client account existed.
 */
export async function attachPaymentToClient(input: {
  payment_id: string;
  client_id: string;
}): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = createClient();
  const { error } = await supabase
    .from("payments")
    .update({ client_id: input.client_id })
    .eq("id", input.payment_id);
  if (error) return { ok: false, error: error.message };
  await recomputeClientSubscription(supabase, input.client_id);
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/clients/${input.client_id}`);
  return { ok: true };
}

/**
 * Run the SQL helper `recompute_client_subscription(target_client)` that
 * updates `clients.subscription_*` from the client's most recent
 * confirmed payment.
 */
async function recomputeClientSubscription(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
) {
  const { error } = await supabase.rpc("recompute_client_subscription", {
    target_client: clientId,
  });
  if (error) {
    log.error("recompute_client_subscription failed", {
      err: error,
      client_id: clientId,
    });
  }
}
