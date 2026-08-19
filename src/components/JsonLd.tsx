/**
 * Escape the characters that could terminate the enclosing <script>
 * element or open an HTML comment. JSON.stringify happily emits a
 * literal `</script>` if a string value contains one, which ends the
 * block early and turns the rest of the payload into live markup. The
 * escaped forms are still valid JSON string escapes, so parsers read
 * the identical value back.
 */
function escapeForScriptTag(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Drop one or more JSON-LD schema objects into the HTML head as
 * <script type="application/ld+json"> tags. Pass an array — each
 * element renders as its own script tag (Google parses them
 * independently, simpler than one combined @graph object).
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          dangerouslySetInnerHTML={{
            __html: escapeForScriptTag(JSON.stringify(item)),
          }}
          // The key is the @id when present, fall back to index. Each
          // JSON-LD block is independent; React just needs a stable key.
          key={(item as { "@id"?: string })["@id"] ?? i}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
