/**
 * Escape characters that would otherwise let an attacker break out of the
 * surrounding `<script>` tag if the data ever contains them. JSON.stringify
 * does NOT escape `<`, `>`, `&`, U+2028, or U+2029 by default — all of
 * which are valid inside JSON strings but unsafe inside an HTML script
 * context. The data on this site is admin-controlled today, but the cost
 * of defense-in-depth is tiny.
 *
 * Kept in its own .ts module (instead of inline in the .tsx component)
 * so unit tests can import it without dragging the JSX parser in.
 */
export function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
