import "server-only";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Turnstile is enforced when both env vars are set:
 *   - NEXT_PUBLIC_TURNSTILE_SITE_KEY   (browser, for the widget)
 *   - TURNSTILE_SECRET_KEY             (server, for this verification call)
 *
 * Behaviour when env vars are missing:
 *   - In `production` we **fail closed** — a missing CAPTCHA config in
 *     prod is a deployment error, not a feature. Returning `ok: true`
 *     would let bots through silently.
 *   - In `development` / `test` we skip verification so the apply form is
 *     usable locally without provisioning a Cloudflare account.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

export interface TurnstileVerifyResult {
  ok: boolean;
  errorCodes?: string[];
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileVerifyResult> {
  if (!isTurnstileEnabled()) {
    if (isProductionRuntime()) {
      console.error(
        "Turnstile is not configured in production — refusing the request.",
      );
      return { ok: false, errorCodes: ["turnstile-not-configured"] };
    }
    return { ok: true };
  }
  if (!token) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY as string,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      // Turnstile should not be cached.
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, errorCodes: [`http-${res.status}`] };
    const json = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (json.success) return { ok: true };
    return { ok: false, errorCodes: json["error-codes"] ?? ["unknown"] };
  } catch (err) {
    console.error("Turnstile verify failed", err);
    return { ok: false, errorCodes: ["network-error"] };
  }
}
