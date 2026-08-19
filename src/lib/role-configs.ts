import type { Role } from "./roles";

export type RoleSpecificField =
  | {
      kind: "number";
      key: string;
      label: string;
      default: number;
      unit?: string;
      help?: string;
    }
  | {
      kind: "select";
      key: string;
      label: string;
      options: string[];
      default: string;
      help?: string;
    }
  | {
      kind: "multiSelect";
      key: string;
      label: string;
      options: string[];
      default: string[];
      help?: string;
    }
  | {
      kind: "textarea";
      key: string;
      label: string;
      placeholder: string;
      rows?: number;
      help?: string;
    }
  | {
      kind: "toggle";
      key: string;
      label: string;
      default: boolean;
      help?: string;
    };

export type RoleHireConfig = {
  slug: string;
  defaultName: string;
  intro: string;
  relevantChannels: string[];
  defaultChannels: string[];
  defaultSchedule: string;
  defaultApprovalMode: "Automatic" | "Approval required" | "Suggestion only";
  promptPlaceholder: string;
  taskExamples: string[];
  specifics: RoleSpecificField[];
  /** Render the generic Spending Limits card. Only true for roles that
   *  deploy money externally (ads, marketplaces, payouts). */
  showSpendingLimits?: boolean;
  /** Default daily / monthly caps (USD) when showSpendingLimits is true. */
  spendingDefaults?: { daily: number; monthly: number };
};

const SHORT_RESPONSE_OPTIONS = [
  "Under 1 minute",
  "Under 5 minutes",
  "Under 30 minutes",
  "Best effort",
];

const TONE_OPTIONS = [
  "Warm and conversational",
  "Professional",
  "Brief and direct",
  "Match the customer",
];

const RICH_CONFIGS: Record<string, Omit<RoleHireConfig, "intro" | "relevantChannels">> = {
  "customer-support": {
    slug: "customer-support",
    defaultName: "Cyrus",
    defaultChannels: ["Web", "WhatsApp", "Email"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nBe warm but quick. If anger is detected, escalate to me immediately. Never offer discounts above 15%. Always check the shipping policy before promising delivery times.",
    taskExamples: [
      "Greet returning customers by name when their email matches a previous order.",
      "If a customer asks for a refund above $150, queue for my approval.",
      "On weekends, route all complaints to my email instead of attempting reply.",
      "When a question touches sizing, link to the size guide and offer a free exchange.",
    ],
    specifics: [
      {
        kind: "number",
        key: "refundAuth",
        label: "Max refund authority",
        default: 50,
        unit: "USD",
        help: "Worker can issue refunds up to this amount without approval.",
      },
      {
        kind: "select",
        key: "responseGoal",
        label: "Response time goal",
        options: SHORT_RESPONSE_OPTIONS,
        default: "Under 5 minutes",
      },
      {
        kind: "select",
        key: "tone",
        label: "Default tone",
        options: TONE_OPTIONS,
        default: "Match the customer",
      },
      {
        kind: "textarea",
        key: "escalationTriggers",
        label: "Escalation triggers",
        placeholder:
          "One per line.\nAnger detected\nThreats of legal action\nMentions a competitor by name\nOrder value above €500",
        rows: 4,
        help: "When any trigger fires, the worker escalates to a human instead of replying.",
      },
    ],
  },

  "inbound-sales": {
    slug: "inbound-sales",
    defaultName: "Iris",
    defaultChannels: ["Web", "Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nQualify by budget and timeline before pitching. Never quote prices above $5,000 without my approval. Offer a 15-minute call as the default next step.",
    taskExamples: [
      "Hand off to me when the deal size looks above $5,000 ARR.",
      "Always confirm decision-maker status before booking a demo.",
      "Send the case study PDF after the first reply on enterprise inquiries.",
    ],
    specifics: [
      {
        kind: "number",
        key: "leadScore",
        label: "Lead score threshold",
        default: 60,
        unit: "/ 100",
        help: "Below this score, the worker nurtures via email instead of booking calls.",
      },
      {
        kind: "number",
        key: "discountAuth",
        label: "Discount authority",
        default: 5,
        unit: "%",
        help: "Maximum discount the worker can offer without escalation.",
      },
      {
        kind: "select",
        key: "calendar",
        label: "Booking calendar",
        options: ["Google Calendar", "Microsoft Outlook", "Cal.com", "None"],
        default: "Google Calendar",
      },
      {
        kind: "textarea",
        key: "handoffRules",
        label: "Hand-off rules",
        placeholder:
          "When should I take over?\nDeal size above $5,000\nCompetitor explicitly mentioned\nLegal or compliance questions",
        rows: 4,
      },
    ],
  },

  "social-media": {
    slug: "social-media",
    defaultName: "Soren",
    defaultChannels: ["IG", "X", "FB", "LinkedIn"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nKeep posts under 150 characters on X. Always include a hook in the first line. Never post anything political. Use up to 5 hashtags on Instagram, none on LinkedIn.",
    taskExamples: [
      "Post 3 times per week on Instagram, focus on outdoor gear in use.",
      "Reply to every IG comment within 2 hours during business hours.",
      "Boost organic posts that hit 5% engagement automatically up to $40.",
      "Cross-post LinkedIn long-form to X as a thread.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "platforms",
        label: "Publishing platforms",
        options: ["IG", "X", "FB", "LinkedIn", "TikTok", "Pinterest", "YouTube"],
        default: ["IG", "X", "FB", "LinkedIn"],
      },
      {
        kind: "number",
        key: "postsPerWeek",
        label: "Posts per week",
        default: 5,
      },
      {
        kind: "multiSelect",
        key: "contentTypes",
        label: "Content types",
        options: ["Single image", "Carousel", "Reel / Short", "Story", "Long-form text"],
        default: ["Single image", "Carousel", "Reel / Short"],
      },
      {
        kind: "select",
        key: "hashtagStrategy",
        label: "Hashtag strategy",
        options: ["Minimal (0–3 per post)", "Balanced (3–8 per post)", "Aggressive (8–15 per post)"],
        default: "Balanced (3–8 per post)",
      },
    ],
  },

  "seo-specialist": {
    slug: "seo-specialist",
    defaultName: "Sage",
    defaultChannels: ["WordPress", "Shopify"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nNever change H1s or URL slugs without approval. Auto-apply meta titles and alt-text up to 100 pages per week. Aim for under 60-character meta titles.",
    taskExamples: [
      "Audit the top 50 product pages and propose meta improvements.",
      "Write a 1,500-word blog post on each priority keyword per week.",
      "Fix all images missing alt-text automatically.",
      "Build the FAQ schema for each policy page.",
    ],
    specifics: [
      {
        kind: "select",
        key: "platform",
        label: "Site platform",
        options: ["WordPress", "Shopify", "Webflow", "Headless CMS", "Embed widget"],
        default: "Shopify",
      },
      {
        kind: "textarea",
        key: "targetKeywords",
        label: "Priority keywords",
        placeholder:
          "One per line.\noutdoor tent two-person\nlightweight backpacking gear\ntrail running pack 30L",
        rows: 4,
      },
      {
        kind: "number",
        key: "postsPerMonth",
        label: "Blog posts per month",
        default: 8,
      },
      {
        kind: "toggle",
        key: "autoMeta",
        label: "Auto-apply safe on-page changes",
        default: true,
        help: "Meta titles, meta descriptions, alt-text, canonical tags. Reversible.",
      },
    ],
  },

  "content-writer": {
    slug: "content-writer",
    defaultName: "Cora",
    defaultChannels: ["CMS", "Email"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nFirst-person plural voice. Short paragraphs (max 3 sentences). Avoid corporate clichés like 'leverage' and 'synergy'. Always end with a single direct call to action.",
    taskExamples: [
      "Draft one long-form blog post per week on outdoor gear topics.",
      "Rewrite product descriptions to highlight one specific benefit.",
      "Repurpose blog posts into LinkedIn long-form weekly.",
    ],
    specifics: [
      {
        kind: "select",
        key: "cms",
        label: "Publish to",
        options: ["WordPress", "Shopify", "Webflow", "Notion", "Drafts only"],
        default: "Shopify",
      },
      {
        kind: "number",
        key: "minWords",
        label: "Min word count",
        default: 800,
      },
      {
        kind: "number",
        key: "maxWords",
        label: "Max word count",
        default: 1800,
      },
      {
        kind: "textarea",
        key: "topicBacklog",
        label: "Topic backlog",
        placeholder:
          "Topics to write about.\nHow to pick a 2-person tent\nThe trail packing checklist\nWhy ultralight isn't always better",
        rows: 4,
      },
    ],
  },

  "email-marketer": {
    slug: "email-marketer",
    defaultName: "Ezra",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon, Wed, Fri 08–17 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nNever email the same person twice in 48 hours. Always include a single CTA. Subject lines under 50 characters. Avoid emoji in subject lines.",
    taskExamples: [
      "Build a 5-step welcome sequence for new subscribers.",
      "Re-engage subscribers who haven't opened in 90 days with one email.",
      "Send abandoned-cart at 1h, 24h, 72h.",
      "Monthly newsletter from blog highlights.",
    ],
    specifics: [
      {
        kind: "select",
        key: "provider",
        label: "Email provider",
        options: ["Resend", "Postmark", "SendGrid", "Mailgun", "Gmail SMTP"],
        default: "Resend",
      },
      {
        kind: "multiSelect",
        key: "sequences",
        label: "Active sequences",
        options: [
          "Welcome",
          "Abandoned cart",
          "Post-purchase",
          "Re-engagement",
          "Newsletter",
          "Win-back",
        ],
        default: ["Welcome", "Abandoned cart", "Newsletter"],
      },
      {
        kind: "number",
        key: "dailySendCap",
        label: "Daily send cap",
        default: 2000,
        unit: "recipients",
      },
      {
        kind: "toggle",
        key: "abTest",
        label: "A/B test subject lines",
        default: true,
        help: "Splits 10% of audience across two subject variants before sending to the rest.",
      },
    ],
  },

  "visual-designer": {
    slug: "visual-designer",
    defaultName: "Vera",
    defaultChannels: ["IG", "FB", "Email"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nUse our brand palette only. Never use AI-generated faces. Keep typography to our Inter + Fraunces combo. Outdoor photography style: golden hour, no studio shots.",
    taskExamples: [
      "Generate Instagram carousel templates for each new product.",
      "Make weekly email header images on a single product theme.",
      "Resize one hero image into the 8 required formats.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "outputs",
        label: "Output types",
        options: [
          "Ad creatives",
          "Social posts",
          "Email headers",
          "Web banners",
          "Product photo retouch",
        ],
        default: ["Ad creatives", "Social posts", "Email headers"],
      },
      {
        kind: "textarea",
        key: "palette",
        label: "Brand color palette (hex)",
        placeholder: "#0A0A0A\n#16A34A\n#E8EDF7\n#FAFAF9",
        rows: 4,
      },
      {
        kind: "select",
        key: "imageProvider",
        label: "Image generation provider",
        options: ["Studio default", "OpenAI Images", "Black Forest Labs", "Ideogram"],
        default: "Studio default",
      },
    ],
  },

  bookkeeping: {
    slug: "bookkeeping",
    defaultName: "Bea",
    defaultChannels: ["Stripe", "Bank"],
    defaultSchedule: "Daily 06–08 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nCategorize all Stripe payouts as Sales revenue. Flag anything above $2,000 for my review. Send monthly close to the accountant on the 5th of each month.",
    taskExamples: [
      "Reconcile Stripe payouts with the bank account daily.",
      "Tag every expense with the right category, flag the ambiguous ones.",
      "Send the monthly P&L summary to my accountant on the 5th.",
    ],
    specifics: [
      {
        kind: "select",
        key: "currency",
        label: "Reporting currency",
        options: ["USD", "EUR", "GBP", "TRY"],
        default: "USD",
      },
      {
        kind: "select",
        key: "taxRegion",
        label: "Tax region",
        options: ["United States", "United Kingdom", "European Union", "Türkiye", "Other"],
        default: "European Union",
      },
      {
        kind: "number",
        key: "flagThreshold",
        label: "Flag expenses above",
        default: 2000,
        unit: "USD",
      },
      {
        kind: "textarea",
        key: "accountantEmail",
        label: "Send monthly report to",
        placeholder: "accountant@northway.example",
        rows: 1,
      },
    ],
  },

  "exec-assistant": {
    slug: "exec-assistant",
    defaultName: "Eva",
    defaultChannels: ["Email", "Calendar"],
    defaultSchedule: "Mon–Fri 08–20 CET",
    defaultApprovalMode: "Automatic",
    promptPlaceholder:
      "Example:\nDefault meeting length is 30 minutes. Never book meetings before 10am. Block 12–13 for lunch. Triage inbox at 9am and 3pm only.",
    taskExamples: [
      "Triage my inbox twice daily into Now, Today, This Week.",
      "Block 90 minutes of deep work every morning at 9.",
      "Decline meetings without a clear agenda.",
    ],
    specifics: [
      {
        kind: "select",
        key: "calendar",
        label: "Primary calendar",
        options: ["Google Calendar", "Microsoft Outlook"],
        default: "Google Calendar",
      },
      {
        kind: "number",
        key: "defaultMeetingMin",
        label: "Default meeting length",
        default: 30,
        unit: "min",
      },
      {
        kind: "textarea",
        key: "triageRules",
        label: "Inbox triage rules",
        placeholder:
          "How to triage.\nClient names → Today\nVendors → This Week\nNewsletters → Skim later",
        rows: 4,
      },
    ],
  },

  "business-analyst": {
    slug: "business-analyst",
    defaultName: "Beck",
    defaultChannels: ["Internal"],
    defaultSchedule: "Daily 06–07 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder:
      "Example:\nMonday morning briefing in three sections: revenue, customer health, marketing. Highlight anomalies above 20% deviation from trailing 4-week average. Suggest one action per anomaly.",
    taskExamples: [
      "Daily 6am briefing with yesterday's wins and today's risks.",
      "Flag any KPI that drifts more than 20% from baseline.",
      "Compile a monthly retrospective on the 1st.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "sources",
        label: "Data sources to monitor",
        options: [
          "Stripe revenue",
          "Shopify orders",
          "Google Analytics",
          "Meta Ads",
          "Google Ads",
          "Support tickets",
          "Brand Bible activity",
        ],
        default: ["Stripe revenue", "Shopify orders", "Google Analytics"],
      },
      {
        kind: "select",
        key: "briefingFreq",
        label: "Briefing frequency",
        options: ["Daily", "Weekly", "Both daily and weekly"],
        default: "Daily",
      },
      {
        kind: "number",
        key: "anomalyThreshold",
        label: "Anomaly threshold",
        default: 20,
        unit: "%",
        help: "Deviation from trailing average that triggers a flag.",
      },
    ],
  },

  // ── Remaining available roles (8) ─────────────────────────────────

  "pr-manager": {
    slug: "pr-manager",
    defaultName: "Pia",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nNever quote me directly without approval. Always include a one-line company description in press kits. Avoid commenting on competitors.",
    taskExamples: [
      "Watch for journalist queries in our industry beat and draft pitches.",
      "Send embargoed releases 48 hours before product launches.",
      "Build a quarterly media list with editor contacts.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "beats",
        label: "Industry beats to monitor",
        placeholder: "One per line.\nOutdoor recreation\nSustainable manufacturing\nSolo entrepreneurship",
        rows: 4,
      },
      {
        kind: "number",
        key: "dailyPitchCap",
        label: "Daily pitch cap",
        default: 5,
        unit: "pitches",
      },
      {
        kind: "multiSelect",
        key: "pitchTypes",
        label: "Pitch types allowed",
        options: ["Product launch", "Founder interview", "Embargoed release", "Expert quote", "Trend commentary"],
        default: ["Product launch", "Founder interview"],
      },
    ],
  },

  translator: {
    slug: "translator",
    defaultName: "Tova",
    defaultChannels: ["Email", "Web", "CMS"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Automatic",
    promptPlaceholder:
      "Example:\nPreserve our brand voice across languages. Never translate product names or technical terms unless approved. Use formal German (Sie) and informal Turkish (sen).",
    taskExamples: [
      "Translate every blog post into 5 priority languages within 24 hours.",
      "Localize email sequences per market with cultural adaptation.",
      "Build a glossary of brand terms that must never be translated.",
    ],
    specifics: [
      {
        kind: "select",
        key: "sourceLang",
        label: "Primary source language",
        options: ["English", "Turkish", "German", "Spanish", "French"],
        default: "English",
      },
      {
        kind: "multiSelect",
        key: "targetLangs",
        label: "Target languages",
        options: ["TR", "DE", "FR", "ES", "IT", "PT", "AR", "ZH", "JA", "KO", "RU", "PL", "NL"],
        default: ["TR", "DE", "FR", "ES"],
      },
      {
        kind: "textarea",
        key: "glossary",
        label: "Glossary — terms never to translate",
        placeholder: "Product names, brand terms, technical jargon.\nNorthway · Aurora 2P · Trail Pack",
        rows: 3,
      },
      {
        kind: "toggle",
        key: "preserveFormality",
        label: "Preserve formality per market",
        default: true,
        help: "Auto-applies Sie/du, vous/tu, sen/siz based on language norms.",
      },
    ],
  },

  "strategic-advisor": {
    slug: "strategic-advisor",
    defaultName: "Sela",
    defaultChannels: ["Internal"],
    defaultSchedule: "Manual only",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder:
      "Example:\nWhen I share a decision, ask three sharp questions before suggesting anything. Reference past decisions in the log. Always offer a counter-position even if you agree.",
    taskExamples: [
      "Review every major decision I tag for advisor input within 24 hours.",
      "Surface contradictions with past decisions I've logged.",
      "Suggest one alternative path I haven't considered.",
    ],
    specifics: [
      {
        kind: "select",
        key: "cadence",
        label: "Decision review cadence",
        options: ["On demand", "Daily summary", "Weekly summary"],
        default: "On demand",
      },
      {
        kind: "multiSelect",
        key: "focusAreas",
        label: "Focus areas",
        options: ["Product", "Sales", "Hiring", "Finance", "Marketing", "Operations"],
        default: ["Product", "Sales", "Hiring", "Finance"],
      },
      {
        kind: "select",
        key: "pushback",
        label: "Pushback level",
        options: ["Gentle", "Balanced", "Blunt"],
        default: "Balanced",
        help: "How directly the advisor challenges your thinking.",
      },
    ],
  },

  "account-manager": {
    slug: "account-manager",
    defaultName: "Asha",
    defaultChannels: ["Email", "Web"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nCheck in monthly with active accounts. Flag any drop in usage above 30%. Never propose annual contracts without my approval.",
    taskExamples: [
      "QBR every quarter with our top 20 accounts.",
      "Detect churn signals: usage drop, late payments, support spikes.",
      "Propose expansion when account exceeds 80% of plan limits.",
    ],
    specifics: [
      {
        kind: "number",
        key: "healthThreshold",
        label: "Health score alert threshold",
        default: 65,
        unit: "/ 100",
      },
      {
        kind: "select",
        key: "qbrFreq",
        label: "QBR frequency",
        options: ["Monthly", "Quarterly", "Bi-annual", "Annual"],
        default: "Quarterly",
      },
      {
        kind: "number",
        key: "upsellThreshold",
        label: "Upsell trigger (usage)",
        default: 80,
        unit: "%",
      },
      {
        kind: "textarea",
        key: "churnTriggers",
        label: "Churn signal triggers",
        placeholder: "One per line.\nUsage drop above 30%\nLate payment two cycles in a row\nSupport tickets up 2× over baseline",
        rows: 3,
      },
    ],
  },

  "customer-onboarder": {
    slug: "customer-onboarder",
    defaultName: "Owen",
    defaultChannels: ["Email", "Web"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Automatic",
    promptPlaceholder:
      "Example:\nFollow up at day 1, 3, 7. Detect stuck users by usage signals. Offer onboarding call if stuck for 5+ days.",
    taskExamples: [
      "Walk new customers through the first 5 critical setup steps.",
      "Detect when a user is stuck at the same step for 48 hours.",
      "Book onboarding calls automatically for accounts above $100/mo.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "stages",
        label: "Onboarding stages",
        placeholder: "One per line, in order.\nAccount setup\nBrand Bible upload\nFirst worker hired\nFirst approval reviewed",
        rows: 5,
      },
      {
        kind: "number",
        key: "stuckDays",
        label: "Stuck user threshold",
        default: 3,
        unit: "days",
      },
      {
        kind: "toggle",
        key: "autoBookCall",
        label: "Auto-book onboarding calls",
        default: false,
        help: "Triggers for accounts above the configured plan threshold.",
      },
    ],
  },

  "it-helper": {
    slug: "it-helper",
    defaultName: "Ivo",
    defaultChannels: ["Slack", "Email"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Automatic",
    promptPlaceholder:
      "Example:\nReset passwords automatically for verified employee emails. For everything else, log a ticket and escalate. Never share licensing or admin credentials.",
    taskExamples: [
      "Answer 'how do I use X tool' questions from our internal tool list.",
      "Run password resets for known tools after identity check.",
      "Escalate hardware issues to our IT contractor.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "supportedTools",
        label: "Tools supported",
        placeholder: "One per line.\nGoogle Workspace · Slack · Notion · Figma · Linear · GitHub",
        rows: 4,
      },
      {
        kind: "textarea",
        key: "escalationContact",
        label: "Escalation contact",
        placeholder: "it-contractor@partner.example",
        rows: 1,
      },
      {
        kind: "select",
        key: "ticketPlatform",
        label: "Ticket platform",
        options: ["Linear", "Jira", "GitHub Issues", "Email queue"],
        default: "Linear",
      },
    ],
  },

  "legal-helper": {
    slug: "legal-helper",
    defaultName: "Lena",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder:
      "Example:\nDraft NDAs from our standard template. Flag any clause that diverges from our defaults. Never sign anything — that's me. Surface jurisdiction-specific risks clearly.",
    taskExamples: [
      "Draft NDAs and MSAs from our standard templates.",
      "Review supplier contracts and flag unusual clauses.",
      "Track expiry dates of all active contracts.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "docTypes",
        label: "Document types to draft",
        options: ["NDA", "MSA", "Supplier agreement", "Employment offer", "Contractor agreement", "DPA"],
        default: ["NDA", "MSA", "Supplier agreement"],
      },
      {
        kind: "multiSelect",
        key: "jurisdictions",
        label: "Jurisdictions covered",
        options: ["US (Delaware)", "EU (Germany)", "UK", "Türkiye", "Switzerland"],
        default: ["US (Delaware)", "EU (Germany)"],
      },
      {
        kind: "select",
        key: "riskThreshold",
        label: "Risk threshold",
        options: ["Flag only obvious risks", "Flag medium and above", "Flag everything unusual"],
        default: "Flag medium and above",
      },
    ],
  },

  "ceo-advisor": {
    slug: "ceo-advisor",
    defaultName: "Cassi",
    defaultChannels: ["Internal"],
    defaultSchedule: "Daily 06–07 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder:
      "Example:\nReads every report each week. Frames the three decisions I should make Monday morning. Pushes back hard when I'm hedging. Keep responses under 200 words.",
    taskExamples: [
      "Frame three decisions I need to make this week.",
      "Push back when I'm avoiding a hard conversation.",
      "Summarize the company in one paragraph each Friday.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "focusAreas",
        label: "Focus areas",
        options: ["Strategy", "Hiring", "Product", "Sales", "Fundraising", "Operations", "Personal"],
        default: ["Strategy", "Hiring", "Product", "Sales"],
      },
      {
        kind: "select",
        key: "briefingDay",
        label: "Weekly briefing day",
        options: ["Monday", "Friday", "Sunday evening"],
        default: "Monday",
      },
      {
        kind: "select",
        key: "pushback",
        label: "Pushback level",
        options: ["Gentle", "Balanced", "Blunt"],
        default: "Blunt",
        help: "How directly to challenge your thinking. Cassi defaults to blunt.",
      },
      {
        kind: "toggle",
        key: "decisionLog",
        label: "Keep a decision log",
        default: true,
        help: "Records your decisions, reasons, and outcomes for future reference.",
      },
    ],
  },

  // ── Q3 2026 roles (46) — config preview shown on \"coming soon\" page ──

  "voice-agent": {
    slug: "voice-agent",
    defaultName: "Vega",
    defaultChannels: ["Phone"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nAnswer within 2 rings. Warm transfer to me for callers tagged VIP. Confirm callback time at end of every call.",
    taskExamples: [
      "Answer inbound calls in the caller's language.",
      "Offer to transfer to a human if frustration is detected.",
      "Send a transcript and summary to the owner after each call.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "spokenLangs",
        label: "Languages spoken",
        options: ["EN", "TR", "DE", "FR", "ES", "IT", "AR", "PT", "ZH", "JA"],
        default: ["EN", "TR"],
      },
      {
        kind: "toggle",
        key: "recordCalls",
        label: "Record all calls",
        default: true,
      },
      {
        kind: "number",
        key: "maxDuration",
        label: "Max call duration",
        default: 10,
        unit: "min",
      },
      {
        kind: "textarea",
        key: "warmTransferRules",
        label: "Warm transfer triggers",
        placeholder: "One per line.\nKeyword: cancel\nDetected anger\nVIP caller",
        rows: 3,
      },
    ],
  },

  "backlink-ai": {
    slug: "backlink-ai",
    defaultName: "Bruno",
    defaultChannels: ["Web"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nFocus on outdoor and sustainability publications. Avoid PBNs entirely. Diversify anchor text strictly.",
    taskExamples: [
      "Sign up to relevant Web 2.0 platforms with brand-aligned content.",
      "Pitch guest posts to outlets in our beat list.",
      "Respond to HARO queries on outdoor and SMB topics.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "targetSites",
        label: "Target site categories",
        placeholder: "Publications, directories, forums.\nOutdoor industry blogs\nSustainability magazines\nSolo founder communities",
        rows: 3,
      },
      {
        kind: "number",
        key: "dailyOutreachCap",
        label: "Daily outreach cap",
        default: 30,
        unit: "actions",
      },
      {
        kind: "number",
        key: "anchorDiversity",
        label: "Anchor text diversity floor",
        default: 70,
        unit: "%",
        help: "Forces variation in anchor text across acquired links.",
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 50, monthly: 1000 },
  },

  "marketplace-ops": {
    slug: "marketplace-ops",
    defaultName: "Mara",
    defaultChannels: ["Amazon", "eBay", "Etsy"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nReprice within 5% of competitor median, never below break-even. Respond to customer messages within 1 hour. Issue refunds up to $30 without approval.",
    taskExamples: [
      "Update listings with optimized titles and bullet points weekly.",
      "Reprice based on competitor monitoring and inventory levels.",
      "Reply to marketplace messages and handle returns under $30.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "marketplaces",
        label: "Active marketplaces",
        options: ["Amazon", "eBay", "Etsy", "Walmart", "Mercado Libre"],
        default: ["Amazon", "eBay", "Etsy"],
      },
      {
        kind: "select",
        key: "repricingStrategy",
        label: "Repricing strategy",
        options: ["Match competitor median", "Beat by 2%", "Hold price, optimize listing", "Manual only"],
        default: "Match competitor median",
      },
      {
        kind: "number",
        key: "refundAuth",
        label: "Refund authority",
        default: 30,
        unit: "USD",
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 300, monthly: 6000 },
  },

  "outbound-sdr": {
    slug: "outbound-sdr",
    defaultName: "Otis",
    defaultChannels: ["Email", "LinkedIn"],
    defaultSchedule: "Mon–Fri 09–17 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nResearch each lead before outreach. Reference one specific detail from their company in opener. Never mass-blast.",
    taskExamples: [
      "Personalize outreach with one fact from prospect's company.",
      "Follow up 3 times with 5-day gaps, then drop.",
      "Book discovery calls with leads scored above 70.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "leadListSource",
        label: "Lead list source",
        placeholder: "Upload CSV · Apollo segment · LinkedIn Sales Navigator",
        rows: 2,
      },
      {
        kind: "number",
        key: "dailyOutreach",
        label: "Daily outreach cap",
        default: 25,
        unit: "leads",
      },
      {
        kind: "number",
        key: "handoffScore",
        label: "Hand-off score threshold",
        default: 70,
        unit: "/ 100",
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 30, monthly: 600 },
  },

  "ad-manager": {
    slug: "ad-manager",
    defaultName: "Adi",
    defaultChannels: ["Meta", "Google", "TikTok"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nDaily budget cap $200 total across platforms. Pause anything below 1.5× ROAS after 48 hours. Always A/B test creatives.",
    taskExamples: [
      "Launch and iterate ad campaigns weekly.",
      "Pause underperforming ads automatically within configured threshold.",
      "Generate 3 creative variants per campaign for testing.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "platforms",
        label: "Ad platforms",
        options: ["Meta Ads", "Google Ads", "TikTok Ads", "LinkedIn Ads", "X Ads", "Pinterest Ads"],
        default: ["Meta Ads", "Google Ads"],
      },
      {
        kind: "number",
        key: "dailyBudget",
        label: "Daily budget cap (total)",
        default: 200,
        unit: "USD",
      },
      {
        kind: "number",
        key: "roasTarget",
        label: "ROAS target",
        default: 2,
        unit: "×",
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 200, monthly: 4000 },
  },

  "hr-assistant": {
    slug: "hr-assistant",
    defaultName: "Hana",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nNever discuss compensation in writing. Always book screening calls before sharing salary. Auto-decline incomplete applications.",
    taskExamples: [
      "Screen incoming resumes against our criteria.",
      "Schedule interview rounds with the hiring manager.",
      "Draft offer letters from our standard template.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "jobBoards",
        label: "Job boards to monitor",
        options: ["LinkedIn", "WeWorkRemotely", "Wellfound", "Indeed", "Otta"],
        default: ["LinkedIn", "WeWorkRemotely"],
      },
      {
        kind: "textarea",
        key: "screening",
        label: "Screening criteria",
        placeholder: "What to require / look for.\nLocation in EU/TR timezones\nProduct experience > 3 years\nPortfolio or GitHub link",
        rows: 4,
      },
      {
        kind: "number",
        key: "rounds",
        label: "Interview rounds",
        default: 3,
      },
    ],
  },

  "general-manager": {
    slug: "general-manager",
    defaultName: "Gaia",
    defaultChannels: ["Internal"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\nMonday plan in 5 bullets. Friday review in 3. Always tie actions to one of our four north-star KPIs.",
    taskExamples: [
      "Run the Monday plan and Friday review cadence.",
      "Flag any role that misses its weekly outcome.",
      "Coordinate cross-functional handoffs.",
    ],
    specifics: [
      {
        kind: "select",
        key: "cadence",
        label: "Operating cadence",
        options: ["Weekly", "Bi-weekly", "Monthly"],
        default: "Weekly",
      },
      {
        kind: "multiSelect",
        key: "kpis",
        label: "North-star KPIs to track",
        options: ["Revenue", "Active customers", "NPS", "Churn", "Approval throughput", "Voice match"],
        default: ["Revenue", "Active customers", "NPS"],
      },
    ],
  },

  "ops-lead": {
    slug: "ops-lead",
    defaultName: "Otto",
    defaultChannels: ["Internal"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nWatch worker load every hour. Redistribute when any worker exceeds 80%. Pause and alert me if average exceeds 90%.",
    taskExamples: [
      "Watch worker load and redistribute as needed.",
      "Surface bottlenecks before they affect customer-facing flows.",
      "Maintain operational documentation as systems change.",
    ],
    specifics: [
      {
        kind: "number",
        key: "loadThreshold",
        label: "Load redistribution threshold",
        default: 80,
        unit: "%",
      },
      {
        kind: "number",
        key: "alertThreshold",
        label: "Critical alert threshold",
        default: 90,
        unit: "%",
      },
    ],
  },

  "product-manager": {
    slug: "product-manager",
    defaultName: "Pax",
    defaultChannels: ["Internal"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\n6-week roadmap horizon. Spec depth: short paragraph + bullets. Release notes plain English.",
    taskExamples: [
      "Maintain the rolling 6-week roadmap.",
      "Draft specs from customer feedback themes.",
      "Write release notes when changes ship.",
    ],
    specifics: [
      {
        kind: "number",
        key: "horizon",
        label: "Roadmap horizon",
        default: 6,
        unit: "weeks",
      },
      {
        kind: "select",
        key: "releaseCadence",
        label: "Release cadence",
        options: ["Continuous", "Weekly", "Bi-weekly", "Monthly"],
        default: "Weekly",
      },
      {
        kind: "select",
        key: "specDepth",
        label: "Spec depth",
        options: ["One paragraph", "Paragraph + bullets", "Full spec with acceptance criteria"],
        default: "Paragraph + bullets",
      },
    ],
  },

  "marketing-director": {
    slug: "marketing-director",
    defaultName: "Mira",
    defaultChannels: ["Internal"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\nMonthly channel mix review. Reallocate budget away from anything below 1.5× ROAS for 30 days. Surface the one experiment we should run.",
    taskExamples: [
      "Set the strategy for Social, SEO, Ads, Email each quarter.",
      "Reallocate budget away from low-ROAS channels.",
      "Propose one growth experiment per month.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "channels",
        label: "Channels managed",
        options: ["Paid social", "SEO", "Email", "Affiliate", "PR", "Events", "Influencer"],
        default: ["Paid social", "SEO", "Email"],
      },
      {
        kind: "select",
        key: "reviewCadence",
        label: "Review cadence",
        options: ["Weekly", "Bi-weekly", "Monthly", "Quarterly"],
        default: "Monthly",
      },
    ],
  },

  "sales-director": {
    slug: "sales-director",
    defaultName: "Dax",
    defaultChannels: ["Internal"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\nWeekly forecast confidence ≥ 75%. Pipeline review every Tuesday. Coach SDR on tone for inbound replies.",
    taskExamples: [
      "Maintain pipeline health and forecast.",
      "Conduct weekly deal reviews.",
      "Coach the SDR on a specific skill each week.",
    ],
    specifics: [
      {
        kind: "number",
        key: "forecastConfidence",
        label: "Forecast confidence floor",
        default: 75,
        unit: "%",
      },
      {
        kind: "select",
        key: "reviewCadence",
        label: "Deal review cadence",
        options: ["Daily", "Weekly", "Bi-weekly"],
        default: "Weekly",
      },
    ],
  },

  "video-editor": {
    slug: "video-editor",
    defaultName: "Velda",
    defaultChannels: ["TikTok", "YouTube", "IG"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\n3 short-form videos per week. Hook in first 2 seconds. Always include captions. Music from our licensed library only.",
    taskExamples: [
      "Cut long-form content into Reels and Shorts.",
      "Add captions automatically in the brand font.",
      "Repurpose podcast episodes into 5 video clips each.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "formats",
        label: "Output formats",
        options: ["Reel (9:16)", "TikTok (9:16)", "YouTube Short (9:16)", "Square (1:1)", "Landscape (16:9)"],
        default: ["Reel (9:16)", "TikTok (9:16)", "YouTube Short (9:16)"],
      },
      {
        kind: "select",
        key: "musicLibrary",
        label: "Music library",
        options: ["Brand-licensed only", "Platform native (Instagram, TikTok)", "No music"],
        default: "Brand-licensed only",
      },
      {
        kind: "number",
        key: "weeklyOutput",
        label: "Videos per week",
        default: 3,
      },
    ],
  },

  "brand-manager": {
    slug: "brand-manager",
    defaultName: "Bram",
    defaultChannels: ["Internal"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\nFlag any output that drifts below 90% voice match. Review one piece of every worker's output daily.",
    taskExamples: [
      "Audit a daily sample of every worker's output.",
      "Flag voice or visual drift before it ships.",
      "Update the Brand Bible when patterns shift.",
    ],
    specifics: [
      {
        kind: "number",
        key: "voiceMatchFloor",
        label: "Voice match floor",
        default: 90,
        unit: "%",
      },
      {
        kind: "toggle",
        key: "driftAlerts",
        label: "Real-time drift alerts",
        default: true,
      },
    ],
  },

  "community-manager": {
    slug: "community-manager",
    defaultName: "Coen",
    defaultChannels: ["Discord", "Slack"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nWelcome new members within 5 minutes. Summarize weekly highlights on Friday. Never ban — escalate to me for any conflict.",
    taskExamples: [
      "Welcome new members with personalized intros.",
      "Surface helpful threads in a Friday digest.",
      "Escalate conflicts to me — never moderate without approval.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "platforms",
        label: "Community platforms",
        options: ["Discord", "Slack", "Circle", "Discourse", "Reddit"],
        default: ["Discord", "Slack"],
      },
      {
        kind: "select",
        key: "responseSLA",
        label: "Response SLA",
        options: ["Under 5 minutes", "Under 30 minutes", "Under 2 hours"],
        default: "Under 30 minutes",
      },
    ],
  },

  "affiliate-manager": {
    slug: "affiliate-manager",
    defaultName: "Anya",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nDefault commission 15%. Pay out monthly. Audit clicks for fraud signals.",
    taskExamples: [
      "Onboard new affiliates with welcome kit.",
      "Run monthly payouts after fraud audit.",
      "Surface top affiliates for tiered commission.",
    ],
    specifics: [
      {
        kind: "number",
        key: "commission",
        label: "Default commission",
        default: 15,
        unit: "%",
      },
      {
        kind: "select",
        key: "payoutCadence",
        label: "Payout cadence",
        options: ["Weekly", "Bi-weekly", "Monthly", "Quarterly"],
        default: "Monthly",
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 500, monthly: 10000 },
  },

  "event-marketer": {
    slug: "event-marketer",
    defaultName: "Eli",
    defaultChannels: ["Email", "Calendar"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nWeekly webinar series. Invite sequence at 14, 7, 1 days before. Replay distributed across 3 channels.",
    taskExamples: [
      "Run the weekly webinar invite sequence.",
      "Track attendance and follow up with no-shows.",
      "Repurpose recorded events into 5 content pieces.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "eventTypes",
        label: "Event types",
        options: ["Webinar", "Product launch", "Conference", "Workshop", "AMA"],
        default: ["Webinar", "Product launch"],
      },
      {
        kind: "textarea",
        key: "inviteCadence",
        label: "Invite cadence (days before)",
        placeholder: "Example: 14, 7, 3, 1",
        rows: 1,
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 400, monthly: 8000 },
  },

  "influencer-outreach": {
    slug: "influencer-outreach",
    defaultName: "Ines",
    defaultChannels: ["Email", "IG"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nMicro and mid-tier only. Comp range $100–$500 per post or free product up to $200. Skip anyone with engagement under 2%.",
    taskExamples: [
      "Source 10 new creators per week in our niche.",
      "Negotiate rates within configured range.",
      "Track deliverables and request reposts when due.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "tiers",
        label: "Creator tiers",
        options: ["Nano (<10k)", "Micro (10–50k)", "Mid (50–500k)", "Macro (500k+)"],
        default: ["Micro (10–50k)", "Mid (50–500k)"],
      },
      {
        kind: "textarea",
        key: "compRange",
        label: "Compensation range",
        placeholder: "Example: $100–$500 cash, or free product up to $200",
        rows: 2,
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 300, monthly: 6000 },
  },

  "podcast-producer": {
    slug: "podcast-producer",
    defaultName: "Pavel",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nBi-weekly cadence. 30–45 min episodes. Founder guests only. Repurpose into 3 short clips + LinkedIn post each.",
    taskExamples: [
      "Source guests from our beat list.",
      "Draft show notes within 24 hours of recording.",
      "Cut episodes into clips for social distribution.",
    ],
    specifics: [
      {
        kind: "select",
        key: "frequency",
        label: "Episode frequency",
        options: ["Weekly", "Bi-weekly", "Monthly"],
        default: "Bi-weekly",
      },
      {
        kind: "number",
        key: "length",
        label: "Target episode length",
        default: 35,
        unit: "min",
      },
    ],
  },

  "webinar-host": {
    slug: "webinar-host",
    defaultName: "Wren",
    defaultChannels: ["Email", "Zoom"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nReply to live Q&A within 10 seconds. Funnel registrants into a post-event drip. Send replay within 24 hours.",
    taskExamples: [
      "Pre-event prep with speakers and reminders to registrants.",
      "Triage live Q&A during the session.",
      "Replay drip campaign for no-shows.",
    ],
    specifics: [
      {
        kind: "select",
        key: "qaHandling",
        label: "Live Q&A handling",
        options: ["AI replies in chat", "AI surfaces top 5 for host", "Manual only"],
        default: "AI surfaces top 5 for host",
      },
      {
        kind: "multiSelect",
        key: "replayChannels",
        label: "Replay distribution",
        options: ["Email", "YouTube", "LinkedIn", "Podcast"],
        default: ["Email", "YouTube"],
      },
    ],
  },

  bdr: {
    slug: "bdr",
    defaultName: "Boris",
    defaultChannels: ["Email", "LinkedIn"],
    defaultSchedule: "Mon–Fri 09–17 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nFocus on outdoor retail and SMB e-commerce. 30 contacts per day max. Always reference one specific thing from their company.",
    taskExamples: [
      "Build target account list weekly.",
      "Personalize first-touch with research.",
      "Book discovery calls for the closer.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "industries",
        label: "Target industries",
        options: ["E-commerce", "SaaS", "Hospitality", "Healthcare", "Education", "Manufacturing"],
        default: ["E-commerce", "SaaS"],
      },
      {
        kind: "number",
        key: "dailyContacts",
        label: "Daily contact cap",
        default: 30,
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 30, monthly: 600 },
  },

  "sales-engineer": {
    slug: "sales-engineer",
    defaultName: "Sam",
    defaultChannels: ["Email", "Web"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\n30-minute demos. Always include integration architecture diagram for technical audiences. Defer pricing to AM.",
    taskExamples: [
      "Run technical demos.",
      "Answer integration and architecture questions.",
      "Draft custom proposals for technical buyers.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "techStack",
        label: "Tech stack to support",
        options: ["AWS", "GCP", "Azure", "Vercel", "Cloudflare", "Kubernetes"],
        default: ["AWS", "GCP", "Vercel"],
      },
      {
        kind: "number",
        key: "demoLength",
        label: "Default demo length",
        default: 30,
        unit: "min",
      },
    ],
  },

  "proposal-writer": {
    slug: "proposal-writer",
    defaultName: "Petra",
    defaultChannels: ["Email", "Docs"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nMatch the prospect's tone. Always include 3 case studies. Defer pricing decisions to AM.",
    taskExamples: [
      "Draft RFP responses.",
      "Create custom SOWs from templates.",
      "Tailor pitches to industry vertical.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "docTypes",
        label: "Document types",
        options: ["RFP response", "SOW", "Custom pitch deck", "Pricing proposal"],
        default: ["RFP response", "SOW"],
      },
      {
        kind: "select",
        key: "tone",
        label: "Default tone",
        options: ["Formal", "Conversational", "Match the prospect"],
        default: "Match the prospect",
      },
    ],
  },

  "renewal-specialist": {
    slug: "renewal-specialist",
    defaultName: "Rina",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nReach out 60 days before renewal. Offer 15% discount for 2-year commit. Escalate any churn risk to AM.",
    taskExamples: [
      "Identify renewal opportunities 60 days out.",
      "Surface churn risk early.",
      "Run targeted save plays.",
    ],
    specifics: [
      {
        kind: "number",
        key: "renewalWindow",
        label: "Renewal outreach window",
        default: 60,
        unit: "days before",
      },
      {
        kind: "number",
        key: "churnRiskThreshold",
        label: "Churn risk alert",
        default: 50,
        unit: "score",
      },
    ],
  },

  "partnership-manager": {
    slug: "partnership-manager",
    defaultName: "Phil",
    defaultChannels: ["Email", "LinkedIn"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nIntegration partners only — no resellers. Minimum partner ARR $1M. Co-marketing reciprocal.",
    taskExamples: [
      "Source integration partners in our ecosystem.",
      "Manage joint go-to-market efforts.",
      "Track partner-sourced pipeline.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "partnerTypes",
        label: "Partner types",
        options: ["Integration", "Reseller", "Agency", "Affiliate", "Strategic"],
        default: ["Integration", "Strategic"],
      },
      {
        kind: "number",
        key: "minARR",
        label: "Minimum partner ARR",
        default: 1000000,
        unit: "USD",
      },
    ],
  },

  "listing-manager": {
    slug: "listing-manager",
    defaultName: "Lila",
    defaultChannels: ["Web", "Email"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nReply to inquiries within 30 minutes. Schedule viewings into my calendar with 24h buffer. Never disclose final price in writing.",
    taskExamples: [
      "Create and optimize property listings.",
      "Schedule viewings from inbound inquiries.",
      "Generate virtual tour copy.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "platforms",
        label: "Listing platforms",
        options: ["MLS", "Zillow", "Sahibinden", "Rightmove", "Idealista", "ImmoScout24"],
        default: ["MLS", "Zillow"],
      },
      {
        kind: "number",
        key: "responseTime",
        label: "Inquiry response time",
        default: 30,
        unit: "min",
      },
    ],
  },

  "purchasing-agent": {
    slug: "purchasing-agent",
    defaultName: "Pia",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nRequest 3 quotes for any purchase above $500. Approved suppliers only. Track delivery dates.",
    taskExamples: [
      "Source suppliers for new categories.",
      "Request and compare quotes.",
      "Track outstanding purchase orders.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "approvedSuppliers",
        label: "Approved supplier list",
        placeholder: "One per line.\nNorthside Mills · supplies@northside.example",
        rows: 4,
      },
      {
        kind: "number",
        key: "quoteThreshold",
        label: "Quote-required threshold",
        default: 500,
        unit: "USD",
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 1000, monthly: 25000 },
  },

  "logistics-coordinator": {
    slug: "logistics-coordinator",
    defaultName: "Lior",
    defaultChannels: ["Email", "Web"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nNotify customer if tracking is stale for 48 hours. Escalate any package lost in transit over $200.",
    taskExamples: [
      "Update customers with shipping milestones.",
      "Handle carrier issues automatically.",
      "Trigger claims for lost packages.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "carriers",
        label: "Carriers",
        options: ["DHL", "UPS", "FedEx", "USPS", "Yurtici", "Aras", "Royal Mail"],
        default: ["DHL", "UPS"],
      },
      {
        kind: "number",
        key: "staleThreshold",
        label: "Stale tracking threshold",
        default: 48,
        unit: "hours",
      },
    ],
  },

  "inventory-manager": {
    slug: "inventory-manager",
    defaultName: "Indra",
    defaultChannels: ["Internal"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nReorder at 30% stock. Flag deadstock after 90 days. Forecast based on 8-week rolling average.",
    taskExamples: [
      "Trigger reorders at configured threshold.",
      "Surface deadstock for clearance.",
      "Forecast demand for next quarter.",
    ],
    specifics: [
      {
        kind: "number",
        key: "reorderThreshold",
        label: "Reorder threshold",
        default: 30,
        unit: "%",
      },
      {
        kind: "number",
        key: "deadstockDays",
        label: "Deadstock flag",
        default: 90,
        unit: "days",
      },
    ],
  },

  "vendor-manager": {
    slug: "vendor-manager",
    defaultName: "Vinh",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nReview every vendor contract 60 days before expiry. Renegotiate if rates rose more than 10%.",
    taskExamples: [
      "Track vendor contract expiries.",
      "Conduct quarterly performance reviews.",
      "Renegotiate when terms drift.",
    ],
    specifics: [
      {
        kind: "select",
        key: "reviewCadence",
        label: "Performance review cadence",
        options: ["Monthly", "Quarterly", "Bi-annual"],
        default: "Quarterly",
      },
      {
        kind: "number",
        key: "renewalLead",
        label: "Renewal review lead time",
        default: 60,
        unit: "days",
      },
    ],
  },

  "quality-assurance": {
    slug: "quality-assurance",
    defaultName: "Quinn",
    defaultChannels: ["Internal"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nFull regression suite before every release. Block release if any P0 fails. Post-release watch for 24 hours.",
    taskExamples: [
      "Run regression tests on every release candidate.",
      "Triage incoming bugs into priority buckets.",
      "Sign off on releases or block them.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "testTypes",
        label: "Test types",
        options: ["Unit", "Integration", "E2E", "Visual regression", "Performance", "Security"],
        default: ["Unit", "Integration", "E2E"],
      },
      {
        kind: "toggle",
        key: "blockOnP0",
        label: "Block release on P0 failure",
        default: true,
      },
    ],
  },

  "project-coordinator": {
    slug: "project-coordinator",
    defaultName: "Pace",
    defaultChannels: ["Email", "Slack"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nDaily status update at 5pm. Escalate any blocker that lasts more than 24 hours. Track milestones in Linear.",
    taskExamples: [
      "Daily status updates for active projects.",
      "Escalate blockers above threshold.",
      "Maintain milestone tracking.",
    ],
    specifics: [
      {
        kind: "select",
        key: "pmTool",
        label: "Project management tool",
        options: ["Linear", "Jira", "Asana", "Notion", "Height"],
        default: "Linear",
      },
      {
        kind: "number",
        key: "blockerEscalation",
        label: "Blocker escalation threshold",
        default: 24,
        unit: "hours",
      },
    ],
  },

  "data-analyst": {
    slug: "data-analyst",
    defaultName: "Dana",
    defaultChannels: ["Internal"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\nWeekly KPI dashboard email. Investigate any anomaly above 15% deviation. Always recommend ONE specific action per anomaly.",
    taskExamples: [
      "Build and maintain dashboards.",
      "Run ad-hoc queries on demand.",
      "Investigate anomalies and propose fixes.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "dashboards",
        label: "Dashboards to maintain",
        placeholder: "One per line.\nRevenue summary · Customer health · Marketing funnel",
        rows: 3,
      },
      {
        kind: "number",
        key: "anomalyThreshold",
        label: "Anomaly threshold",
        default: 15,
        unit: "%",
      },
    ],
  },

  "tier2-support": {
    slug: "tier2-support",
    defaultName: "Theo",
    defaultChannels: ["Web", "Email"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nHandle escalations from tier 1. Refund authority up to $300. Bring me in for anything legal-adjacent.",
    taskExamples: [
      "Resolve escalations from tier 1 support.",
      "Handle retention saves with discounts up to 25%.",
      "Document recurring issues for product team.",
    ],
    specifics: [
      {
        kind: "number",
        key: "refundAuth",
        label: "Refund authority",
        default: 300,
        unit: "USD",
      },
      {
        kind: "number",
        key: "saveDiscount",
        label: "Max retention discount",
        default: 25,
        unit: "%",
      },
    ],
  },

  "customer-success": {
    slug: "customer-success",
    defaultName: "Cleo",
    defaultChannels: ["Email", "Web"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nReach out when usage drops 20% from baseline. Run QBR for top 20% accounts. Surface expansion opportunities monthly.",
    taskExamples: [
      "Detect usage drops and proactively reach out.",
      "Run QBRs for key accounts.",
      "Surface expansion plays.",
    ],
    specifics: [
      {
        kind: "number",
        key: "healthThreshold",
        label: "Health score alert",
        default: 70,
        unit: "/ 100",
      },
      {
        kind: "select",
        key: "qbrCadence",
        label: "QBR cadence",
        options: ["Monthly", "Quarterly", "Bi-annual"],
        default: "Quarterly",
      },
    ],
  },

  "live-chat": {
    slug: "live-chat",
    defaultName: "Liv",
    defaultChannels: ["Web"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nGreet visitors after 30 seconds on page. Qualify with 3 questions max. Book demo if they have budget and timeline.",
    taskExamples: [
      "Greet visitors with personalized message.",
      "Qualify intent with smart questions.",
      "Book demos for qualified leads.",
    ],
    specifics: [
      {
        kind: "number",
        key: "greetDelay",
        label: "Greet delay",
        default: 30,
        unit: "seconds",
      },
      {
        kind: "textarea",
        key: "qualifyingQuestions",
        label: "Qualifying questions",
        placeholder: "One per line.\nWhat's your team size?\nWhen do you need to solve this?\nWhat's your budget range?",
        rows: 3,
      },
    ],
  },

  "feedback-analyst": {
    slug: "feedback-analyst",
    defaultName: "Fia",
    defaultChannels: ["Internal"],
    defaultSchedule: "Daily 06–08 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\nDaily digest of feedback themes. Highlight any new theme that appears more than 5 times in a week.",
    taskExamples: [
      "Mine reviews, tickets, and NPS for themes.",
      "Build a weekly feedback digest.",
      "Tag insights to product or operational owners.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "sources",
        label: "Data sources",
        options: ["Support tickets", "App store reviews", "Trustpilot", "NPS surveys", "Social mentions"],
        default: ["Support tickets", "NPS surveys", "Social mentions"],
      },
      {
        kind: "number",
        key: "themeThreshold",
        label: "Theme threshold",
        default: 5,
        unit: "mentions / week",
      },
    ],
  },

  "kb-editor": {
    slug: "kb-editor",
    defaultName: "Ken",
    defaultChannels: ["CMS"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nMine 5 new help articles per week from support tickets. Update outdated articles when product ships.",
    taskExamples: [
      "Write help articles from common tickets.",
      "Update existing articles when product changes.",
      "Surface gaps in our docs.",
    ],
    specifics: [
      {
        kind: "select",
        key: "cms",
        label: "Help center CMS",
        options: ["Intercom Articles", "HelpScout Docs", "Zendesk Guide", "Notion", "Custom"],
        default: "Notion",
      },
      {
        kind: "number",
        key: "weeklyArticles",
        label: "Articles per week",
        default: 5,
      },
    ],
  },

  concierge: {
    slug: "concierge",
    defaultName: "Cleo",
    defaultChannels: ["Web", "WhatsApp"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nKnow our property inside out. Recommend nearby restaurants we have arrangements with first. Book transfers up to $80 without approval.",
    taskExamples: [
      "Answer guest questions about the property.",
      "Recommend local activities and restaurants.",
      "Book transfers and reservations.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "languages",
        label: "Languages",
        options: ["EN", "TR", "DE", "FR", "ES", "AR", "RU", "IT"],
        default: ["EN", "TR", "DE"],
      },
      {
        kind: "number",
        key: "bookingAuth",
        label: "Booking authority",
        default: 80,
        unit: "USD",
      },
    ],
  },

  tutor: {
    slug: "tutor",
    defaultName: "Tara",
    defaultChannels: ["Email", "Web"],
    defaultSchedule: "Mon–Sun 14–22 CET",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nNever give answers, only hints. Adapt complexity to student level. Weekly parent update on progress.",
    taskExamples: [
      "Guide students through problems with hints.",
      "Track progress and adapt difficulty.",
      "Send weekly parent updates.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "subjects",
        label: "Subjects taught",
        options: ["Math", "English", "Science", "History", "Coding", "Languages"],
        default: ["Math", "English"],
      },
      {
        kind: "select",
        key: "ageRange",
        label: "Age range",
        options: ["6–10", "11–14", "15–18", "Adult learners"],
        default: "11–14",
      },
    ],
  },

  receptionist: {
    slug: "receptionist",
    defaultName: "Reya",
    defaultChannels: ["Phone", "WhatsApp"],
    defaultSchedule: "Mon–Sat 09–19 CET",
    defaultApprovalMode: "Automatic",
    promptPlaceholder: "Example:\nBook within available slots only. Send confirmation immediately and reminder 24h before. Reschedule no-shows automatically.",
    taskExamples: [
      "Book appointments for inbound calls.",
      "Send reminders before appointments.",
      "Recover no-shows with a reschedule offer.",
    ],
    specifics: [
      {
        kind: "select",
        key: "industry",
        label: "Industry",
        options: ["Dental clinic", "Salon / Spa", "Medical practice", "Veterinary", "Auto service"],
        default: "Dental clinic",
      },
      {
        kind: "number",
        key: "reminderHours",
        label: "Reminder lead time",
        default: 24,
        unit: "hours",
      },
    ],
  },

  "invoice-specialist": {
    slug: "invoice-specialist",
    defaultName: "Inka",
    defaultChannels: ["Email", "Stripe"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nIssue invoices within 24 hours of delivery. Dunning sequence at day 7, 14, 30. Escalate past 45 days.",
    taskExamples: [
      "Issue invoices on time.",
      "Run dunning sequences on overdue.",
      "Apply payments and reconcile.",
    ],
    specifics: [
      {
        kind: "number",
        key: "agingThreshold",
        label: "Past-due alert",
        default: 30,
        unit: "days",
      },
      {
        kind: "textarea",
        key: "dunningSequence",
        label: "Dunning days",
        placeholder: "Example: 7, 14, 30, 45",
        rows: 1,
      },
    ],
  },

  "tax-prep": {
    slug: "tax-prep",
    defaultName: "Tobi",
    defaultChannels: ["Email", "Bank"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nCategorize expenses against our chart of accounts. Flag anything ambiguous. Monthly export to accountant on the 5th.",
    taskExamples: [
      "Categorize expenses monthly.",
      "Reconcile bank statements.",
      "Prepare quarterly tax packages.",
    ],
    specifics: [
      {
        kind: "select",
        key: "region",
        label: "Filing region",
        options: ["United States", "United Kingdom", "European Union", "Türkiye", "Other"],
        default: "European Union",
      },
      {
        kind: "select",
        key: "exportFormat",
        label: "Accountant export format",
        options: ["CSV", "Xero", "QuickBooks", "Pre-filled tax form"],
        default: "CSV",
      },
    ],
  },

  "cash-flow": {
    slug: "cash-flow",
    defaultName: "Coen",
    defaultChannels: ["Internal"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Suggestion only",
    promptPlaceholder: "Example:\nWeekly cash flow forecast 12 weeks out. Flag any variance above 15%. Model 3 scenarios.",
    taskExamples: [
      "Weekly cash flow forecast.",
      "Scenario modeling.",
      "Runway and burn tracking.",
    ],
    specifics: [
      {
        kind: "number",
        key: "horizonWeeks",
        label: "Forecast horizon",
        default: 12,
        unit: "weeks",
      },
      {
        kind: "number",
        key: "varianceThreshold",
        label: "Variance flag",
        default: 15,
        unit: "%",
      },
    ],
  },

  procurement: {
    slug: "procurement",
    defaultName: "Prim",
    defaultChannels: ["Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nReview every SaaS subscription quarterly. Negotiate renewals 30 days before. Flag any unused tool.",
    taskExamples: [
      "Audit SaaS spend quarterly.",
      "Negotiate vendor renewals.",
      "Cancel unused subscriptions.",
    ],
    specifics: [
      {
        kind: "select",
        key: "auditCadence",
        label: "SaaS audit cadence",
        options: ["Monthly", "Quarterly", "Bi-annual"],
        default: "Quarterly",
      },
      {
        kind: "number",
        key: "renewalLead",
        label: "Renewal negotiation lead",
        default: 30,
        unit: "days",
      },
    ],
    showSpendingLimits: true,
    spendingDefaults: { daily: 1000, monthly: 20000 },
  },

  "chef-assistant": {
    slug: "chef-assistant",
    defaultName: "Chef",
    defaultChannels: ["CMS", "Web"],
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nUpdate seasonal menu every quarter. Always disclose allergens (gluten, dairy, nuts, shellfish). Photograph plating before publishing.",
    taskExamples: [
      "Write menu descriptions in our voice.",
      "Disclose allergens consistently.",
      "Update seasonal menus.",
    ],
    specifics: [
      {
        kind: "multiSelect",
        key: "cuisines",
        label: "Cuisine types",
        options: ["Mediterranean", "Italian", "Japanese", "Mexican", "Turkish", "Plant-based"],
        default: ["Mediterranean"],
      },
      {
        kind: "toggle",
        key: "allergenDisclosure",
        label: "Auto-disclose allergens",
        default: true,
      },
    ],
  },

  recruiter: {
    slug: "recruiter",
    defaultName: "Rae",
    defaultChannels: ["LinkedIn", "Email"],
    defaultSchedule: "Mon–Fri 09–18 CET",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: "Example:\nNever discuss compensation in writing. Sourcing focus: passive candidates. 20 outreach per day per open role.",
    taskExamples: [
      "Source passive candidates for open roles.",
      "Run initial screening calls.",
      "Schedule final-round interviews.",
    ],
    specifics: [
      {
        kind: "textarea",
        key: "openRoles",
        label: "Open roles",
        placeholder: "One per line.\nSenior product engineer · Remote EU\nProduct designer · Remote",
        rows: 4,
      },
      {
        kind: "multiSelect",
        key: "channels",
        label: "Sourcing channels",
        options: ["LinkedIn Sales Navigator", "GitHub", "Dribbble", "Communities", "Referrals"],
        default: ["LinkedIn Sales Navigator", "Referrals"],
      },
      {
        kind: "number",
        key: "dailyOutreach",
        label: "Daily outreach / role",
        default: 20,
      },
    ],
  },
};

const COMMON_PROMPT =
  "Describe how this worker should behave. The Brand Bible already knows your products and voice — add specific rules, exceptions, examples, or unusual cases.";

const COMMON_EXAMPLES = [
  "When in doubt, mirror our last 5 published messages in tone.",
  "Always defer to the policy in the Brand Bible if customer asks.",
  "Never invent product features that aren't listed in the catalog.",
];

// Channels the worker could plausibly use, by category. The form shows
// these as togglable options; only defaultChannels are pre-selected.
const CATEGORY_CHANNELS: Record<string, string[]> = {
  "Customer-facing": ["Web", "WhatsApp", "Telegram", "Email", "Phone", "IG", "FB"],
  Sales: ["Web", "Email", "LinkedIn", "Phone", "WhatsApp"],
  Marketing: ["IG", "X", "FB", "LinkedIn", "TikTok", "YouTube", "Pinterest", "Email", "CMS", "WordPress", "Shopify"],
  Operations: ["Email", "Slack", "Calendar", "Internal"],
  Finance: ["Stripe", "Bank", "Email", "Internal"],
  Leadership: ["Internal", "Email", "Slack"],
};

/**
 * Build the rich hire-form config for a role. The caller supplies the
 * Role row (loaded from the `role_catalog` DB table via
 * `loadCatalogRole(slug)`); this function adds the per-slug rich
 * defaults that aren't worth persisting in DB yet (prompt examples,
 * task examples, hire-form specifics) and widens the channel list with
 * category-level defaults.
 */
export function getRoleConfig(role: Role): RoleHireConfig {
  const widenChannels = (defaults: string[]): string[] => {
    const catChannels = CATEGORY_CHANNELS[role.category] ?? [];
    return Array.from(new Set([...defaults, ...role.channels, ...catChannels]));
  };

  const rich = RICH_CONFIGS[role.slug];
  if (rich) {
    return {
      ...rich,
      intro: role.summary,
      relevantChannels: widenChannels(rich.defaultChannels),
    };
  }

  // Fallback config for roles without rich specifics.
  return {
    slug: role.slug,
    defaultName: role.title.split(" ")[0],
    intro: role.summary,
    relevantChannels: widenChannels(role.channels),
    defaultChannels: role.channels,
    defaultSchedule: "Continuous (24/7)",
    defaultApprovalMode: "Approval required",
    promptPlaceholder: COMMON_PROMPT,
    taskExamples: COMMON_EXAMPLES,
    specifics: [],
  };
}
