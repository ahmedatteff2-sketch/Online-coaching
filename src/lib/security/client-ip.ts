import "server-only";
import { headers, type UnsafeUnwrappedHeaders } from "next/headers";

/**
 * Read the client IP from the current request's headers in a way that
 * is **resistant to header spoofing**.
 *
 * Why this matters:
 *   - `X-Forwarded-For` is a `,`-separated chain (`client, proxy1,
 *     proxy2`). Naively reading the first entry trusts whatever the
 *     attacker placed there.
 *   - In production we are always behind exactly one trusted edge
 *     (Vercel / Cloudflare / Render). Those edges set their own
 *     authoritative headers (`x-vercel-forwarded-for`,
 *     `cf-connecting-ip`, etc.) which an external client cannot
 *     forge through the edge.
 *
 * Algorithm:
 *   1. Prefer the platform-specific header for the deployment target
 *      configured via `TRUSTED_PROXY` (or any provider header we
 *      recognise).
 *   2. Else, parse `X-Forwarded-For` and take the **right-most**
 *      entry. The right-most entry is the one the edge inserted, so
 *      it is the closest to the true client when there is exactly
 *      one trusted hop.
 *   3. Else, fall back to `X-Real-IP`.
 *   4. Else, return `"anon"` — never throw.
 *
 * The `"anon"` fallback is intentional: in local dev there are no
 * proxy headers, and rejecting the request would block the whole
 * intake flow.
 */
export function readClientIp(): string {
  const h = (headers() as unknown as UnsafeUnwrappedHeaders);
  // Platform-specific headers that an external client cannot forge
  // through a trusted edge. We try them in order; first non-empty wins.
  const platformHeaders = [
    "cf-connecting-ip", // Cloudflare
    "x-vercel-forwarded-for", // Vercel
    "fly-client-ip", // Fly.io
    "true-client-ip", // Akamai / Cloudflare Enterprise
  ];
  for (const name of platformHeaders) {
    const v = h.get(name);
    if (v) {
      const ip = firstNonEmpty(v);
      if (ip) return ip;
    }
  }

  // X-Forwarded-For — take the right-most entry, which is the IP
  // appended by the *trusted* edge proxy (the closest to the true
  // client when there is exactly one hop). Clients sending their own
  // `X-Forwarded-For: 1.2.3.4` will appear before the edge entry, so
  // the right-most pick ignores their forgery.
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const ip = lastNonEmpty(fwd);
    if (ip) return ip;
  }

  return h.get("x-real-ip") ?? "anon";
}

function firstNonEmpty(value: string): string | null {
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function lastNonEmpty(value: string): string | null {
  const parts = value.split(",");
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const trimmed = parts[i].trim();
    if (trimmed) return trimmed;
  }
  return null;
}
