// Inline `application/ld+json` script tag.
// Use sparingly — one or two structured-data blocks per page is enough.

import { escapeJsonForScript } from "./escape-script";

export { escapeJsonForScript };

export function JsonLd({ data }: { data: object }) {
  const json = escapeJsonForScript(JSON.stringify(data));
  return (
    <script
      type="application/ld+json"
      // dangerouslySetInnerHTML is the documented Next.js pattern for JSON-LD
      // because React escapes < and > inside text content otherwise. We
      // pre-escape the `<`/`>`/`&` sequences ourselves so a stray
      // `</script>` in any field cannot terminate the surrounding tag.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
