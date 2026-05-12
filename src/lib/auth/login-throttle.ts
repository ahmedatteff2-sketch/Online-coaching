"use server";

import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { readClientIp } from "@/lib/security/client-ip";

/**
 * Throttle attempts against the public login form. Supabase Auth has
 * its own per-account back-off for password attempts, but it does not
 * cap **per-IP** floods that try a different email every time. This
 * action plugs that hole and is intended to be called from the login
 * form *before* `signInWithPassword`.
 *
 * Limits:
 *   - 10 attempts per IP per 5 minutes (covers an enthusiastic typo
 *     storm but stops credential-stuffing).
 *   - 5 attempts per (IP, email) per 5 minutes (per-account back-off
 *     scoped to the requesting IP, so we don't lock a real user out
 *     across the world).
 */
export interface LoginThrottleResult {
  ok: boolean;
  /** Localised error message when blocked. */
  error?: string;
  /** When the soonest retry would be allowed. */
  retryAt?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function locale(rawLocale: string | undefined): "en" | "ar" {
  return rawLocale === "ar" ? "ar" : "en";
}

export async function checkLoginThrottle(
  email: string,
  rawLocale?: string,
): Promise<LoginThrottleResult> {
  const ip = readClientIp();
  const safeEmail =
    typeof email === "string" && EMAIL_RE.test(email.trim().toLowerCase())
      ? email.trim().toLowerCase()
      : null;

  // Per-IP burst guard.
  const ipBucket = await checkRateLimit({
    key: `login:ip:${ip}`,
    max: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (!ipBucket.ok) {
    return {
      ok: false,
      error: rateLimitMessage(ipBucket.retryAt, locale(rawLocale)),
      retryAt: ipBucket.retryAt,
    };
  }

  // Per-(IP, email) back-off — only if we got a syntactically valid
  // email, otherwise just rely on the per-IP guard above.
  if (safeEmail) {
    const emailBucket = await checkRateLimit({
      key: `login:email:${ip}:${safeEmail}`,
      max: 5,
      windowMs: 5 * 60 * 1000,
    });
    if (!emailBucket.ok) {
      return {
        ok: false,
        error: rateLimitMessage(emailBucket.retryAt, locale(rawLocale)),
        retryAt: emailBucket.retryAt,
      };
    }
  }

  return { ok: true };
}
