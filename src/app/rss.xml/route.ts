import { NextResponse } from "next/server";
import { SITE_NAME, SITE_ORIGIN, localeUrl } from "@/lib/seo/site";
import { getChangelogPageCopy } from "@/lib/i18n/page-copy";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h — changelog rarely changes

/**
 * /rss.xml — Atom 1.0 feed of the changelog (English locale).
 *
 * Search engines, feed readers (NetNewsWire, Feedly), and developer
 * communities discover product news through RSS/Atom. This route emits
 * the changelog entries in Atom 1.0 — well-formed, modern, with
 * `<updated>` timestamps + per-entry GUIDs so subscribers de-dupe
 * correctly across updates.
 *
 * Per-locale feeds would be nice (`/rss.<lang>.xml`) but the changelog
 * payload is already 22-locale-aware via the i18n system — for now we
 * emit the English version which matches what 80%+ of feed-reader
 * audiences expect. Localized feeds can be added later as separate
 * route handlers (`/[lang]/rss.xml`) without breaking this one.
 */
export async function GET(): Promise<NextResponse> {
  const copy = getChangelogPageCopy("en");
  const entries = copy.entries;

  // Pick the most recent entry's date as feed-level <updated>. The
  // changelog uses human-readable "Feb 12, 2026" strings — parse them
  // back into ISO. Fall back to "now" when parsing fails.
  function isoFromHuman(d: string): string {
    const ms = Date.parse(d);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date().toISOString();
  }

  const feedUpdated = entries.length > 0 ? isoFromHuman(entries[0].date) : new Date().toISOString();
  const feedId = `${SITE_ORIGIN}/rss.xml`;
  const changelogUrl = localeUrl("en", "changelog");

  function xmlEscape(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  const entryBlocks = entries
    .map((entry) => {
      const updated = isoFromHuman(entry.date);
      const url = `${changelogUrl}#${entry.version}`;
      const html =
        `<p>${xmlEscape(entry.summary)}</p>` +
        `<ul>` +
        entry.changes
          .map(
            (c) =>
              `<li><strong>${xmlEscape(c.tag)}:</strong> ${xmlEscape(c.text)}</li>`,
          )
          .join("") +
        `</ul>`;
      return `  <entry>
    <id>${xmlEscape(`${SITE_ORIGIN}/changelog/${entry.version}`)}</id>
    <title>${xmlEscape(`${entry.version} — ${entry.title}`)}</title>
    <link rel="alternate" href="${xmlEscape(url)}" />
    <updated>${updated}</updated>
    <published>${updated}</published>
    <author><name>${xmlEscape(SITE_NAME)}</name></author>
    <summary type="text">${xmlEscape(entry.summary)}</summary>
    <content type="html">${xmlEscape(html)}</content>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${xmlEscape(feedId)}</id>
  <title>${xmlEscape(`${SITE_NAME} — changelog`)}</title>
  <subtitle>${xmlEscape(copy.header.sub)}</subtitle>
  <updated>${feedUpdated}</updated>
  <link rel="self" href="${xmlEscape(feedId)}" />
  <link rel="alternate" type="text/html" href="${xmlEscape(changelogUrl)}" />
  <icon>${xmlEscape(`${SITE_ORIGIN}/icon.png`)}</icon>
  <logo>${xmlEscape(`${SITE_ORIGIN}/icon.png`)}</logo>
  <rights>© ${new Date().getUTCFullYear()} ${xmlEscape(SITE_NAME)}</rights>
${entryBlocks}
</feed>
`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
