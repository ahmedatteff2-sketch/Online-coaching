/**
 * Sliding-window rate limiter.
 *
 * Backends:
 *   - **Upstash Redis** (default in production) when
 *     `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.
 *     A single process restart or fan-out across instances does not
 *     reset the limits, so this is the correct choice for any
 *     multi-instance / serverless deployment.
 *   - **In-memory Map** fallback for local dev, tests, and any
 *     deployment that hasn't configured Upstash yet. The contract
 *     of `checkRateLimit` is identical, but the limits are per-process
 *     and reset on restart.
 *
 * Both backends share a sliding-window algorithm: each key tracks the
 * timestamps of recent attempts inside `windowMs` and rejects the
 * call once `max` is reached.
 */

export interface RateLimitOptions {
  /** Identifier for the bucket (e.g. user id, IP, email). */
  key: string;
  /** Max attempts allowed inside `windowMs`. */
  max: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Optional clock — defaults to `Date.now`. Used by tests. */
  now?: () => number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Attempts remaining inside the current window after this call. */
  remaining: number;
  /** Earliest timestamp (ms epoch) at which a new attempt would succeed. */
  retryAt: number;
}

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------
const buckets = new Map<string, number[]>();

function checkInMemory(opts: RateLimitOptions): RateLimitResult {
  const now = opts.now ? opts.now() : Date.now();
  const cutoff = now - opts.windowMs;
  const existing = buckets.get(opts.key) ?? [];
  const fresh = existing.filter((t) => t > cutoff);

  if (fresh.length >= opts.max) {
    buckets.set(opts.key, fresh);
    const retryAt = fresh[0] + opts.windowMs;
    return { ok: false, remaining: 0, retryAt };
  }

  fresh.push(now);
  buckets.set(opts.key, fresh);
  return {
    ok: true,
    remaining: opts.max - fresh.length,
    retryAt: now,
  };
}

/** Test helper — drop all in-memory state. */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}

// ---------------------------------------------------------------------------
// Upstash Redis backend (optional)
// ---------------------------------------------------------------------------
function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * Execute an atomic Lua-like script via Upstash's REST pipeline. The
 * REST API doesn't expose Lua, so we instead issue a small pipeline of
 * primitive commands. Race conditions across pipeline calls would
 * occasionally let one extra request through, but for the rate-limit
 * use case (small `max`, soft block) this is acceptable.
 */
async function callUpstash(commands: (string | number)[][]): Promise<unknown[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL as string;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(commands),
    // Limits must not be cached.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash pipeline failed: ${res.status}`);
  }
  const json = (await res.json()) as { result: unknown }[];
  return json.map((r) => r.result);
}

async function checkUpstash(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = opts.now ? opts.now() : Date.now();
  const cutoff = now - opts.windowMs;
  const key = `rl:${opts.key}`;

  // Trim expired entries, add the new one, fetch the latest window,
  // then bump the TTL. This is a small pipeline; the overhead is one
  // round-trip per check.
  //
  // `member` only needs to be unique inside the ZSET, not unguessable.
  // A short random suffix is plenty; we use Web Crypto when available
  // because it's the same speed and avoids `Math.random` in any
  // security-adjacent file.
  const buf = new Uint8Array(4);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  const suffix = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  const member = `${now}:${suffix}`;
  const expireSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  let raw: unknown[];
  try {
    raw = await callUpstash([
      ["ZREMRANGEBYSCORE", key, 0, cutoff],
      ["ZADD", key, now, member],
      ["ZRANGE", key, 0, -1, "WITHSCORES"],
      ["EXPIRE", key, expireSec],
    ]);
  } catch (err) {
    // Network blip — fall back to in-memory rather than fail open.
    console.error("Upstash rate-limit fallback:", err);
    return checkInMemory(opts);
  }

  const entries = (raw[2] as string[] | null) ?? [];
  // ZRANGE WITHSCORES returns ["member","score","member","score",...]
  const scores: number[] = [];
  for (let i = 1; i < entries.length; i += 2) {
    const s = Number(entries[i]);
    if (Number.isFinite(s)) scores.push(s);
  }
  scores.sort((a, b) => a - b);

  if (scores.length > opts.max) {
    // Roll back the addition we just made so it doesn't count against
    // the user repeatedly when they retry.
    try {
      await callUpstash([["ZREM", key, member]]);
    } catch {
      // best effort
    }
    const retryAt = (scores[0] ?? now) + opts.windowMs;
    return { ok: false, remaining: 0, retryAt };
  }

  return {
    ok: true,
    remaining: opts.max - scores.length,
    retryAt: now,
  };
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------

/**
 * Returns `{ok: true}` if the bucket has room for another attempt, or
 * `{ok: false}` with the earliest retry timestamp otherwise.
 *
 * Backend is selected at call time: Upstash when configured, otherwise
 * the per-process Map. Tests can override the clock via `opts.now`.
 *
 * NOTE: This is `async` so a future Upstash-only deployment can be
 * fully consistent. Callers should always `await`.
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  if (upstashConfigured()) {
    return checkUpstash(opts);
  }
  return checkInMemory(opts);
}

/**
 * Synchronous helper for tests / call sites that can't easily switch
 * to async. Always uses the in-memory backend.
 *
 * @deprecated Prefer `checkRateLimit` (async) which respects Upstash.
 */
export function checkRateLimitSync(opts: RateLimitOptions): RateLimitResult {
  return checkInMemory(opts);
}

/**
 * Format a human-readable "try again in N seconds" message based on the
 * `retryAt` timestamp returned by `checkRateLimit`.
 */
export function rateLimitMessage(
  retryAt: number,
  locale: "en" | "ar" = "en",
  now: number = Date.now(),
): string {
  const seconds = Math.max(1, Math.ceil((retryAt - now) / 1000));
  if (locale === "ar") {
    return `كثرة محاولات. حاول تاني بعد ${seconds} ثانية.`;
  }
  return `Too many attempts. Try again in ${seconds}s.`;
}
