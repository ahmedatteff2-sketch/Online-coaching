import { describe, expect, it } from "vitest";
import { escapeJsonForScript } from "./escape-script";

describe("escapeJsonForScript", () => {
  it("escapes < and > so a stray </script> cannot terminate the tag", () => {
    const out = escapeJsonForScript(
      `{"name":"</script><img onerror=alert(1)>"}`,
    );
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<img");
    expect(out).toContain("\\u003C");
    expect(out).toContain("\\u003E");
  });

  it("escapes ampersand so HTML entity references don't slip through", () => {
    const out = escapeJsonForScript(`{"text":"a & b"}`);
    expect(out).not.toContain("&");
    expect(out).toContain("\\u0026");
  });

  it("escapes U+2028 and U+2029 line/paragraph separators", () => {
    const out = escapeJsonForScript(`{"text":"a\u2028b\u2029c"}`);
    expect(out).not.toContain("\u2028");
    expect(out).not.toContain("\u2029");
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
  });

  it("leaves benign characters unchanged", () => {
    expect(escapeJsonForScript(`{"a":"hello world","n":42}`)).toBe(
      `{"a":"hello world","n":42}`,
    );
  });

  it("escapes nested tag breakouts that JSON.stringify alone would emit verbatim", () => {
    const payload = { bio: 'Coach <strong>"the best"</strong> & friends' };
    const out = escapeJsonForScript(JSON.stringify(payload));
    expect(out).not.toMatch(/[<>&]/);
    // Round-trip through JSON.parse so we can confirm the original data
    // survives the un-escaping that browsers perform when reading the
    // <script> tag back as text.
    const decoded = out
      .replace(/\\u003C/g, "<")
      .replace(/\\u003E/g, ">")
      .replace(/\\u0026/g, "&");
    expect(JSON.parse(decoded)).toEqual(payload);
  });
});
