import type { Tool } from "../types";

/**
 * enrich_prospect — pull public-record info on a prospect (firmographic
 * + recent news + LinkedIn snapshot) so the SDR doesn't write a generic
 * "Hi $FirstName" cold email.
 *
 * Real providers (Sprint 24+):
 *   - Apollo.io for firmographics + work email guess
 *   - LinkedIn Sales Navigator (public side only — no scraping)
 *   - Crunchbase News for "recent funding / launches" signals
 *
 * The fixture mode (PROSPECT_FIXTURE=1) returns deterministic data so
 * the audit can assert on enrichment results without paying for live
 * API calls.
 *
 * Returned shape is deliberately structured so the model can address
 * SPECIFIC details ("congrats on the Series B", "saw your post about
 * NPS") rather than waffling.
 */

interface ProspectInfo {
  name: string;
  title: string;
  email: string;
  company: { name: string; industry: string; size: string; website: string };
  signals: string[]; // recent newsworthy moments
  linkedinUrl?: string;
}

export const enrichProspectTool: Tool = {
  name: "enrich_prospect",
  description:
    "Look up firmographic + recent-news context on a prospect before writing them a cold email. Pass either an email, a company domain, or a LinkedIn URL. Returns name, title, company info, and 'signals' (recent news / funding / launches) you can reference in the email.",
  parameters: {
    type: "object",
    properties: {
      identifier: {
        type: "string",
        description:
          "What you know about them — email ('jane@acme.com'), company domain ('acme.com'), or LinkedIn URL.",
      },
    },
    required: ["identifier"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const identifier = String(args.identifier).trim();
    if (!identifier) {
      return { ok: false, refused: true, reason: "identifier is empty." };
    }

    const provider = await pickProspectProvider();
    if (!provider) {
      return {
        ok: true,
        data: {
          found: false,
          identifier,
          reason:
            "No prospect-research integration is wired for this tenant yet — write a generic but respectful outreach, or escalate.",
        },
      };
    }

    try {
      const info = await provider.lookup(identifier);
      if (!info) {
        return {
          ok: true,
          data: {
            found: false,
            identifier,
            reason: `No match for '${identifier}' in the enrichment index. Ask for more context (LinkedIn URL, company name) or escalate.`,
          },
        };
      }
      return { ok: true, data: { found: true, prospect: info } };
    } catch (err) {
      return {
        ok: true,
        data: {
          found: false,
          identifier,
          reason: `Enrichment service errored: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    } finally {
      void ctx;
    }
  },
};

/* ── provider plumbing ──────────────────────────────────────── */

interface ProspectProvider {
  kind: string;
  lookup: (id: string) => Promise<ProspectInfo | null>;
}

async function pickProspectProvider(): Promise<ProspectProvider | null> {
  if (process.env.PROSPECT_FIXTURE === "1") return FIXTURE_PROVIDER;
  // Real Apollo / Clearbit (Sprint 24+) lives here. For now tenants
  // without the fixture get a graceful no-op.
  return null;
}

const FIXTURE_PROSPECTS: Record<string, ProspectInfo> = {
  "jane@acme-boots.com": {
    name: "Jane Doe",
    title: "COO",
    email: "jane@acme-boots.com",
    company: {
      name: "Acme Boots",
      industry: "Footwear · DTC e-commerce",
      size: "120-150 employees",
      website: "acme-boots.com",
    },
    signals: [
      "Just raised a $14M Series B led by Insight Partners (announced 2 weeks ago).",
      "Opened 3 new retail stores in the US Northeast last quarter.",
      "Jane posted on LinkedIn about wanting to cut customer-support SLA from 12h to 2h.",
    ],
    linkedinUrl: "https://www.linkedin.com/in/janedoe-coo-acmeboots",
  },
  "acme-boots.com": {
    name: "Jane Doe", // same — domain-only lookup resolves to the most senior
    title: "COO",
    email: "jane@acme-boots.com",
    company: {
      name: "Acme Boots",
      industry: "Footwear · DTC e-commerce",
      size: "120-150 employees",
      website: "acme-boots.com",
    },
    signals: [
      "Just raised a $14M Series B led by Insight Partners (announced 2 weeks ago).",
      "Opened 3 new retail stores in the US Northeast last quarter.",
    ],
  },
};

const FIXTURE_PROVIDER: ProspectProvider = {
  kind: "fixture",
  async lookup(id) {
    const norm = id.toLowerCase();
    if (FIXTURE_PROSPECTS[norm]) return FIXTURE_PROSPECTS[norm];
    // Resolve LinkedIn URL → fixture by suffix match
    for (const p of Object.values(FIXTURE_PROSPECTS)) {
      if (p.linkedinUrl && norm.includes(p.linkedinUrl.toLowerCase())) return p;
    }
    return null;
  },
};
