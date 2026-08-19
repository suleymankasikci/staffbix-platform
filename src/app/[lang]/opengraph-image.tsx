import { ImageResponse } from "next/og";
import { isLocale } from "@/lib/i18n/config";
import { getCommonCopy } from "@/lib/i18n/translations";
import { BRAND_NAME, BRAND_VERSION } from "@/lib/brand";

/**
 * Dynamic OG image for `/[lang]` (homepage). Next.js auto-wires this
 * file as the og:image for every variant of the home route — Twitter
 * Card + LinkedIn + Slack unfurls all consume it.
 *
 * Per-page OG images (pricing, docs, etc.) live as sibling files
 * (`<route>/opengraph-image.tsx`). They share the layout below by
 * importing the renderer — see `src/lib/seo/og.tsx`.
 *
 * Designed to mirror the Hero showcase aesthetic:
 *   - lavender → mint background gradient
 *   - mark + wordmark top-left
 *   - tagline (locale-aware) as the headline
 *   - 3 staggered bars on the right echoing the brand glyph
 */

export const runtime = "edge";
export const alt = `${BRAND_NAME} — AI Workforce Platform`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: { lang: string };
}) {
  const locale = isLocale(params.lang) ? params.lang : "en";
  const copy = getCommonCopy(locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #F1EEFB 0%, #FFFFFF 50%, #B5F0D7 100%)",
          padding: "72px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Brand mark + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 14 14" fill="none">
            <rect x="0" y="2" width="9" height="1.5" fill="#0A0A0A" rx="0.2" />
            <rect x="2.5" y="6.25" width="9" height="1.5" fill="#0A0A0A" rx="0.2" />
            <rect x="0" y="10.5" width="9" height="1.5" fill="#0A0A0A" rx="0.2" />
          </svg>
          <div
            style={{
              fontSize: 48,
              fontWeight: 600,
              color: "#0A0A0A",
              letterSpacing: "-0.025em",
            }}
          >
            {BRAND_NAME}
          </div>
        </div>

        {/* Status pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "32px",
            padding: "8px 16px",
            border: "1px solid #ECECEC",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.7)",
            fontSize: 16,
            color: "#6B6B6B",
            width: "fit-content",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#34D399",
              display: "block",
            }}
          />
          {BRAND_VERSION} · {copy.labels["AI Workforce Platform"]}
        </div>

        {/* Headline (the tagline) */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 500,
            color: "#0A0A0A",
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            marginTop: "auto",
            marginBottom: "24px",
            maxWidth: "920px",
          }}
        >
          {copy.tagline}
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: 26,
            color: "#6B6B6B",
            lineHeight: 1.4,
            maxWidth: "820px",
          }}
        >
          {copy.subtagline}
        </div>

        {/* Decorative concentric arc bottom-right */}
        <svg
          width="520"
          height="520"
          viewBox="0 0 520 520"
          fill="none"
          style={{ position: "absolute", right: -120, bottom: -120 }}
        >
          {[180, 220, 260, 300, 340].map((r, i) => (
            <circle
              key={r}
              cx={260}
              cy={260}
              r={r}
              stroke="#C9C1ED"
              strokeOpacity={0.4 - i * 0.05}
              strokeWidth={1.5}
              strokeDasharray="4 10"
            />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
