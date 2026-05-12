/**
 * Thin structured-logging helper.
 *
 * Goals:
 * 1. **No PII in production logs.** We strip well-known fields
 *    (`email`, `password`, `phone`, `token`, `secret`, `authorization`,
 *    `cookie`, etc.) and replace them with `[redacted]`. Sentry tags
 *    are added separately and never include free-form user data.
 * 2. **Stable JSON shape** so the log can be parsed by Render's log
 *    drain, Datadog, or `jq` without a babel grammar.
 * 3. **Cheap, framework-agnostic, no external deps.** Sentry is still
 *    the primary error sink; this is for breadcrumb-style operational
 *    events that surface in the platform's log stream.
 *
 * Usage:
 *   import { log } from "@/lib/observability/logger";
 *   log.error("submitCoachingApplication failed", { err, applicationId });
 *
 * In development the entries are pretty-printed to make them readable;
 * in production they're emitted as single-line JSON.
 */

const REDACTED = "[redacted]";

// Fields whose *values* should never appear in the log. Match is
// case-insensitive on the field name.
const SENSITIVE_KEYS = new Set([
  "password",
  "tempPassword",
  "temp_password",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "auth",
  "cookie",
  "set-cookie",
  "api_key",
  "apikey",
  "service_role_key",
  "turnstile_secret_key",
  "upstash_redis_rest_token",
  "sentry_auth_token",
  "stripe_secret_key",
  // Personally identifying — we keep them out of operational logs
  // because Render's drain has weaker controls than Supabase Auth.
  "email",
  "phone",
  "phone_number",
  "full_name",
  "address",
  "ip",
  "client_ip",
]);

type Level = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: Level;
  msg: string;
  [extra: string]: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      // `stack` is fine to log — it doesn't generally include user
      // data, and helps debugging.
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = REDACTED;
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (fields) {
    for (const [k, v] of Object.entries(fields)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        entry[k] = REDACTED;
      } else {
        entry[k] = redact(v);
      }
    }
  }
  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify(entry)
      : `[${entry.level}] ${entry.msg} ${
          fields ? JSON.stringify(redact(fields), null, 2) : ""
        }`;
  // We deliberately use console here — the platform's log drain
  // captures stdout/stderr. Sentry is wired separately via
  // `@sentry/nextjs`.
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug(msg: string, fields?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") emit("debug", msg, fields);
  },
  info(msg: string, fields?: Record<string, unknown>) {
    emit("info", msg, fields);
  },
  warn(msg: string, fields?: Record<string, unknown>) {
    emit("warn", msg, fields);
  },
  error(msg: string, fields?: Record<string, unknown>) {
    emit("error", msg, fields);
  },
};
