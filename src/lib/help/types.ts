/**
 * Shared types for the in-panel help center. The center serves both the
 * user panel (`/app/[lang]/app/help/...`) and the admin panel
 * (`/admin/help/...`). Content authoring is locale-keyed: every topic
 * carries a `Record<Locale, LocalizedTopic>` so we can ship native-
 * quality EN + TR plus LLM-translated fallbacks across the other 21
 * locales with a transparent "machine-translated" banner.
 */

import type { Locale } from "@/lib/i18n/config";

export type HelpAudience = "user" | "admin" | "both";

export interface HelpSection {
  /** Section heading. Optional — body-only sections render without one. */
  heading?: string;
  /** Paragraph text. Each entry renders as its own <p>. */
  paragraphs?: string[];
  /** Bulleted list. Each entry is one bullet. */
  bullets?: string[];
  /** Ordered numbered steps. Each entry is one step. */
  steps?: string[];
  /** Inline call-out box, rendered in muted card style. */
  callout?: string;
}

export interface LocalizedTopic {
  title: string;
  tagline?: string;
  body: HelpSection[];
}

export interface HelpTopic {
  /** URL slug. Used at `/app/help/<slug>` and `/admin/help/<slug>`. */
  slug: string;
  /** Which panel(s) the topic appears in. */
  audience: HelpAudience;
  /** Sort weight in the index (lower first). */
  order: number;
  /** Single-character or short label rendered as the topic icon. */
  iconGlyph: string;
  /** Locale-keyed content. EN is the source of truth. */
  content: Partial<Record<Locale, LocalizedTopic>>;
}

/**
 * Per-AI-agent enrichment that wraps the role-catalog row with the
 * step-by-step + integration guide. The role catalog itself stores the
 * title / summary / channels; this module supplies the "how to
 * activate" + "what to wire up" prose.
 */
export interface LocalizedAgent {
  /** Re-stated role title in the target locale (the DB title is EN). */
  title: string;
  /** 1-sentence elevator pitch in the target locale. */
  tagline: string;
  /** What the agent does, narrative. 2-3 short paragraphs. */
  whatItDoes: string[];
  /** Required integrations to wire up before activation. */
  integrationsRequired: string[];
  /** Ordered activation steps. */
  steps: string[];
  /** 3-5 concrete example tasks the agent handles. */
  exampleTasks: string[];
  /** Default approval / autonomy guidance. */
  approvalNote: string;
  /** Tips + gotchas. */
  tips: string[];
}

export interface AgentEnrichment {
  /** Role catalog slug — must match `role_catalog.slug` on the DB. */
  slug: string;
  content: Partial<Record<Locale, LocalizedAgent>>;
}

/**
 * Locales where the content authored by the team is considered
 * native-quality. Every other locale gets a "machine-translated"
 * banner at the top of the page so readers know to flag mistakes.
 */
export const NATIVE_LOCALES: ReadonlyArray<Locale> = ["en", "tr"];
