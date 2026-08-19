import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo/site";

/**
 * /robots.txt — Next.js convention. Two rules:
 *   1. Public-facing crawlers (Googlebot, Bingbot, etc. — `*`) may
 *      index everything except the auth-gated app + admin shells, the
 *      ephemeral invitation/reset tokens, and the API surface.
 *   2. The sitemap URL points at our generated sitemap.xml so crawlers
 *      pick it up without manual submission.
 *
 * Search engines treat the disallowed paths as "don't crawl" — they may
 * still appear in results if linked externally, but they won't be
 * indexed. For sensitive routes we ALSO emit `robots: noindex` in the
 * page's <head> (via buildPageMetadata({ noIndex: true })) as a
 * defense-in-depth signal.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app/",
          "/admin/",
          "/accept/",
          "/verify",
          "/reset",
          // Block known infra paths
          "/_next/",
          "/static/",
        ],
      },
      // Block aggressive AI scrapers from crawling the marketing site
      // (they hammer your origin for training data and never click a
      // CTA). The Brand Bible IS the moat — we publish marketing
      // content but reserve product output. Remove specific UAs if
      // you want to be indexed by an AI search engine.
      //
      // List spans the major 2025/2026 LLM training crawlers + AI
      // search bots; sources: openai.com/gptbot, anthropic.com/bots,
      // perplexity.ai/bots, Bytespider docs, support.google.com.
      {
        userAgent: [
          // OpenAI: training + ChatGPT browsing + new ChatGPT search
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          // Anthropic: training + Claude in-product browsing
          "ClaudeBot",
          "anthropic-ai",
          "Claude-Web",
          // Common Crawl (used by many LLMs as training source)
          "CCBot",
          // Perplexity: training + answer-engine browsing
          "PerplexityBot",
          "Perplexity-User",
          // Google's Vertex / Gemini training opt-out (kept separate
          // from regular Googlebot so search SEO is unaffected)
          "Google-Extended",
          // ByteDance/TikTok training crawler — extremely aggressive
          "Bytespider",
          // Amazon's general-purpose AI training crawler
          "Amazonbot",
          // Meta's AI training crawler
          "FacebookBot",
          "Meta-ExternalAgent",
          // Apple Intelligence training
          "Applebot-Extended",
          // DuckAssist (DuckDuckGo's AI assistant)
          "DuckAssistBot",
          // Cohere training
          "cohere-ai",
          // Mistral training
          "MistralAI-User",
          // YouBot (You.com)
          "YouBot",
          // Diffbot (data extraction for AI)
          "Diffbot",
          // Omgilibot / webz.io (sells news data to LLM trainers)
          "Omgilibot",
          // Timpibot (Timpi search index)
          "Timpibot",
          // ImagesiftBot (CDN-scale image scraper, training fodder)
          "ImagesiftBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
