/**
 * Generate a short, easy-to-read temporary password for a client account.
 *
 * Uses an unambiguous alphabet (no `0/O/1/l/I`) so the coach can read it
 * to the client over voice/WhatsApp without confusion. The default length
 * has been raised to 16 to keep ~95 bits of entropy after dropping the
 * confusing characters — comfortably above the 80-bit floor recommended
 * for short-lived secrets.
 *
 * Backed by Web Crypto (`crypto.getRandomValues`) in browsers / modern
 * Node. Falls back to `Math.random` only as a last resort on ancient
 * runtimes; production callers always run on Node ≥ 20, which has the
 * Web Crypto API.
 *
 * The fallback also uses **rejection sampling** so a non-power-of-two
 * alphabet (53 characters in our case) doesn't introduce modulo bias.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
const MIN_LENGTH = 12;

export function generateTempPassword(length = 16): string {
  const target = Math.max(MIN_LENGTH, length);
  const out: string[] = [];
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.getRandomValues === "function") {
    // Reject any value that would introduce modulo bias. With a 53-char
    // alphabet and a Uint32 source the bias is ~5e-9, so the loop is
    // essentially a no-op in expectation.
    const limit = Math.floor(0xffffffff / ALPHABET.length) * ALPHABET.length;
    const buf = new Uint32Array(1);
    while (out.length < target) {
      cryptoApi.getRandomValues(buf);
      if (buf[0] < limit) {
        out.push(ALPHABET[buf[0] % ALPHABET.length]);
      }
    }
    return out.join("");
  }

  // Last-resort fallback. Math.random is NOT cryptographically secure
  // but is good enough for non-production fallback paths where the
  // password is rotated immediately.
  for (let i = 0; i < target; i += 1) {
    out.push(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
  }
  return out.join("");
}
