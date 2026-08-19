import type { Tool } from "../types";
import { db } from "@/lib/db/client";
import { seoAudits } from "@/lib/db/schema";
import { runSeoAudit } from "@/lib/seo/audit";
import { logSecurityEvent } from "@/lib/audit/log";

/**
 * audit_url — fetch a page, parse its on-page SEO, score it against
 * the tenant's Brand Bible, and return concrete fixes.
 *
 * Wraps Sprint 8's `runSeoAudit` runtime which:
 *
 *   1. Inserts a `seo_audits` row in `status='fetching'`
 *   2. Pulls the URL with a 5s timeout + 200KB max body
 *   3. Strips boilerplate, extracts title / metas / headings / body text
 *   4. Calls the model to score against the Brand Bible + propose
 *      title, meta description, voice critique, top fixes
 *   5. Persists the structured result in `seo_audits.result` jsonb
 *
 * SEO_AUDIT_FIXTURE_HTML env var lets the audit script pass in
 * deterministic HTML so we don't depend on a live URL during tests.
 */

export const auditUrlTool: Tool = {
  name: "audit_url",
  description:
    "Audit a public URL for SEO: fetch the page, evaluate title + meta + headings + content against the Brand Bible, and return concrete fixes ranked high/medium/low priority. Returns a structured result including suggestedTitle and suggestedMetaDescription.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Absolute HTTPS URL to audit (must start with https://).",
      },
      focusKeyword: {
        type: "string",
        description: "Optional primary keyword the page should rank for. Helps target the suggestions.",
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const url = String(args.url).trim();
    const focusKeyword = args.focusKeyword ? String(args.focusKeyword).trim() : null;

    if (!/^https?:\/\//i.test(url)) {
      return {
        ok: false,
        refused: true,
        reason: "url must start with http:// or https://",
      };
    }

    try {
      const [audit] = await db
        .insert(seoAudits)
        .values({
          tenantId: ctx.tenantId,
          workerId: ctx.workerId,
          url,
          status: "fetching",
        })
        .returning({ id: seoAudits.id });

      // Optional fixture: if SEO_AUDIT_FIXTURE_HTML is set the audit
      // script feeds deterministic HTML instead of hitting the network.
      const fixtureHtml = process.env.SEO_AUDIT_FIXTURE_HTML;
      const fetchImpl: typeof fetch | undefined = fixtureHtml
        ? (async () =>
            new Response(fixtureHtml, {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            })) as typeof fetch
        : undefined;

      const result = await runSeoAudit({
        auditId: audit.id,
        tenantId: ctx.tenantId,
        fetchImpl,
      });

      await logSecurityEvent({
        kind: "seo.audit.completed",
        tenantId: ctx.tenantId,
        payload: {
          subject: "seo.audit.completed",
          auditId: audit.id,
          url,
          focusKeyword,
          workerId: ctx.workerId,
        },
      });

      return {
        ok: true,
        data: {
          auditId: audit.id,
          url,
          summary: result.summary,
          suggestedTitle: result.suggestedTitle,
          suggestedMetaDescription: result.suggestedMetaDescription,
          topFixes: result.topFixes,
          brandBibleAlignmentScore: result.brandBibleAlignment.score,
          brandBibleNotes: result.brandBibleAlignment.notes,
        },
      };
    } catch (err) {
      return {
        ok: false,
        refused: true,
        reason: `Couldn't audit ${url}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
