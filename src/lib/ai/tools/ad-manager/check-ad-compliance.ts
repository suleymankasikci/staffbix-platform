import type { Tool } from "../types";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * check_ad_compliance — pure rules-based linter for ad copy against
 * common platform policies. No LLM call — deterministic + fast so we
 * can run it before every queued ad.
 *
 * Checked patterns (selection — not exhaustive):
 *   - Personal attributes ("you" + sensitive trait pairing → Meta
 *     personal-attributes policy)
 *   - Before/after weight loss / financial outcomes
 *   - Superlatives requiring substantiation
 *   - Sensational punctuation (e.g., "!!!", "$$$" anchored)
 *   - Misleading countdown urgency ("ENDS TODAY" with no end)
 *   - Health / financial guarantees
 */

const PLATFORMS = ["meta_ads", "google_ads", "tiktok_ads"] as const;

type Rule = {
  id: string;
  description: string;
  severity: "low" | "medium" | "high";
  pattern: RegExp;
  platforms: ReadonlyArray<(typeof PLATFORMS)[number]>;
};

const RULES: Rule[] = [
  {
    id: "personal_attribute",
    description:
      "Meta forbids 'you' + sensitive personal-attribute pairings (race, religion, health, sexual orientation).",
    severity: "high",
    pattern:
      /\byou(?:'re| are)\b.*\b(diabetic|depressed|hiv|gay|muslim|jewish|christian|cancer survivor|addict|disabled)\b/i,
    platforms: ["meta_ads"],
  },
  {
    id: "before_after_weight",
    description: "Before/after weight-loss imagery is restricted on Meta + TikTok.",
    severity: "high",
    pattern: /\bbefore\b[\s\S]{0,40}\bafter\b[\s\S]{0,80}\b(weight|lbs|kg|pounds)\b/i,
    platforms: ["meta_ads", "tiktok_ads"],
  },
  {
    id: "weight_loss_specific_claim",
    description:
      "Specific weight-loss numbers ('lose 10 lbs in 7 days') are forbidden across major platforms.",
    severity: "high",
    pattern: /\blose\s+\d+\s*(lbs?|pounds|kg|kilos)\b/i,
    platforms: ["meta_ads", "google_ads", "tiktok_ads"],
  },
  {
    id: "income_guarantee",
    description:
      "'Make $X per day/week guaranteed' is forbidden — Meta + Google financial-product policy.",
    severity: "high",
    pattern: /\b(make|earn)\s+\$?\d[\d,]*\s+(?:per|a)\s+(day|week|month)\b.*\b(guaranteed|guarantee)\b/i,
    platforms: ["meta_ads", "google_ads", "tiktok_ads"],
  },
  {
    id: "miracle_cure",
    description: "Miracle / cure language is forbidden across all major ad platforms.",
    severity: "high",
    pattern: /\b(miracle|cure|cures|cures cancer|secret remedy)\b/i,
    platforms: ["meta_ads", "google_ads", "tiktok_ads"],
  },
  {
    id: "sensational_punctuation",
    description: "Sensational punctuation strings (!!!, $$$) flagged on Meta + Google.",
    severity: "medium",
    pattern: /(!{3,}|\${3,}|\?{3,})/,
    platforms: ["meta_ads", "google_ads"],
  },
  {
    id: "all_caps_word",
    description: "Long ALL-CAPS strings (≥5 chars) are flagged by Google policies.",
    severity: "low",
    pattern: /\b[A-Z]{5,}\b/,
    platforms: ["google_ads"],
  },
  {
    id: "fake_countdown",
    description: "'Ends today' / 'last chance' phrasing without a specific end time is misleading.",
    severity: "medium",
    pattern: /\b(ends today|last chance|today only|limited time)\b/i,
    platforms: ["meta_ads", "google_ads", "tiktok_ads"],
  },
  {
    id: "absolute_superlative",
    description:
      "Unsubstantiated absolutes ('the best', 'world's #1') need a citation on Google + Meta.",
    severity: "low",
    pattern: /\b(the best|world'?s? (?:#?1|number one)|world'?s? leading)\b/i,
    platforms: ["meta_ads", "google_ads"],
  },
];

const MIN_COPY_LEN = 5;
const MAX_COPY_LEN = 4000;

export const checkAdComplianceTool: Tool = {
  name: "check_ad_compliance",
  description:
    "Lint ad copy for common platform-policy violations (Meta, Google, TikTok). Pure rules — no LLM. Run BEFORE queueing any ad for launch.",
  parameters: {
    type: "object",
    properties: {
      copy: {
        type: "string",
        description: "Ad copy to check (headline + body concatenated is fine).",
      },
      platforms: {
        type: "array",
        description: "Platforms to lint against. Default: all supported.",
        items: { type: "string", enum: PLATFORMS },
      },
    },
    required: ["copy"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const copy = String(args.copy);
    const platformsArg = Array.isArray(args.platforms)
      ? (args.platforms as string[]).filter((p) =>
          (PLATFORMS as readonly string[]).includes(p),
        )
      : [];
    const platforms =
      platformsArg.length > 0
        ? (platformsArg as Array<(typeof PLATFORMS)[number]>)
        : (PLATFORMS as readonly (typeof PLATFORMS)[number][]);

    if (copy.trim().length < MIN_COPY_LEN) {
      return { ok: false, refused: true, reason: "copy too short." };
    }
    if (copy.length > MAX_COPY_LEN) {
      return {
        ok: false,
        refused: true,
        reason: `copy too long (max ${MAX_COPY_LEN} chars).`,
      };
    }

    const findings: Array<{
      ruleId: string;
      description: string;
      severity: Rule["severity"];
      affectedPlatforms: string[];
      matchedSnippet: string;
    }> = [];

    for (const rule of RULES) {
      const overlap = rule.platforms.filter((p) => platforms.includes(p));
      if (overlap.length === 0) continue;
      const m = copy.match(rule.pattern);
      if (m) {
        findings.push({
          ruleId: rule.id,
          description: rule.description,
          severity: rule.severity,
          affectedPlatforms: overlap,
          matchedSnippet: m[0].slice(0, 120),
        });
      }
    }

    const hasHigh = findings.some((f) => f.severity === "high");
    const hasMedium = findings.some((f) => f.severity === "medium");
    const overallSeverity = hasHigh ? "high" : hasMedium ? "medium" : findings.length > 0 ? "low" : "none";
    const wouldReject = hasHigh;

    await logSecurityEvent({
      kind: "ad.compliance.checked",
      tenantId: ctx.tenantId,
      payload: {
        subject: "ad.compliance.checked",
        platforms,
        findingsCount: findings.length,
        overallSeverity,
        wouldReject,
        workerId: ctx.workerId,
      },
    });

    return {
      ok: true,
      data: {
        platforms,
        copyLength: copy.length,
        findings,
        findingsCount: findings.length,
        overallSeverity,
        wouldReject,
        recommendation: wouldReject
          ? "Do NOT submit — rewrite to clear all high-severity findings first."
          : findings.length > 0
            ? "Submittable, but review medium/low findings before launch."
            : "Clear of common-policy patterns. Final approval still lies with the platform.",
      },
    };
  },
};
