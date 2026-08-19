import type { Tool } from "./types";
import { lookupOrderTool } from "./customer-support/lookup-order";
import { processRefundTool } from "./customer-support/process-refund";
import { escalateTool } from "./customer-support/escalate";
import { gdprRequestTool } from "./customer-support/gdpr-request";
import { qualifyLeadTool } from "./inbound-sales/qualify-lead";
import { bookMeetingTool } from "./inbound-sales/book-meeting";
import { sendFollowupEmailTool } from "./inbound-sales/send-followup";
import { enrichProspectTool } from "./sdr/enrich-prospect";
import { createOutreachLeadTool } from "./sdr/create-outreach-lead";
import { queueOutreachEmailTool } from "./sdr/queue-outreach-email";
import { createContentBriefTool } from "./content/create-content-brief";
import { produceDraftsTool } from "./content/produce-drafts";
import { auditUrlTool } from "./seo/audit-url";
import { researchKeywordsTool } from "./seo/research-keywords";
import { replyToSocialCommentTool } from "./social/reply-to-comment";
import { reportEngagementTool } from "./social/report-engagement";
import { welcomeNewMemberTool } from "./community/welcome-member";
import { flagForModerationTool } from "./community/flag-for-moderation";
import { draftSubjectLinesTool } from "./email-marketer/draft-subject-lines";
import { segmentAudienceTool } from "./email-marketer/segment-audience";
import { searchBrandBibleTool } from "./kb-editor/search-brand-bible";
import { proposeKbUpdateTool } from "./kb-editor/propose-kb-update";
import { findInfluencerTool } from "./influencer/find-influencer";
import { createAffiliateCodeTool } from "./affiliate/create-affiliate-code";
import { trackExpansionOpportunityTool } from "./account-manager/track-expansion";
import { recordOnboardingStepTool } from "./onboarder/record-onboarding-step";
import { recordBookkeepingEntryTool } from "./bookkeeping/record-entry";
import { monthlySummaryTool } from "./bookkeeping/monthly-summary";
import { createInvoiceTool } from "./invoice/create-invoice";
import { listOpenInvoicesTool } from "./invoice/list-open-invoices";
import { sendInvoiceReminderTool } from "./invoice/send-invoice-reminder";
import { computeCashflowProjectionTool } from "./cashflow/projection";
import { parseCvTool } from "./hr/parse-cv";
import { trackApplicantTool } from "./hr/track-applicant";
import { triageInboxTool } from "./exec-assistant/triage-inbox";
import { prepareMeetingBriefTool } from "./exec-assistant/prepare-meeting-brief";
import { createItTicketTool } from "./it-helper/create-it-ticket";
import { queryLeadsBreakdownTool } from "./data-analyst/query-leads-breakdown";
import { computeMetricTool } from "./data-analyst/compute-metric";
import { comparePeriodMetricTool } from "./business-analyst/compare-period-metric";
import { generateBusinessRecommendationTool } from "./business-analyst/generate-recommendation";
import { frameWeeklyDecisionsTool } from "./ceo-advisor/frame-weekly-decisions";
import { logDecisionTool } from "./ceo-advisor/log-decision";
import { reviewDecisionTool } from "./strategic-advisor/review-decision";
import { surfacePastDecisionsTool } from "./strategic-advisor/surface-past-decisions";
import { draftLegalDocumentTool } from "./legal-helper/draft-legal-document";
import { reviewContractClauseTool } from "./legal-helper/review-contract-clause";
import { translateTextTool } from "./translator/translate-text";
import { buildGlossaryTool } from "./translator/build-glossary";
import { draftPressReleaseTool } from "./pr-manager/draft-press-release";
import { draftJournalistPitchTool } from "./pr-manager/draft-journalist-pitch";
import { createDesignBriefTool } from "./visual-designer/create-design-brief";
import { specImageVariantsTool } from "./visual-designer/spec-image-variants";
import { summarizeCallTool } from "./voice-agent/summarize-call";
import { flagCallTransferTool } from "./voice-agent/flag-call-transfer";
import { scoreLinkProspectTool } from "./backlink-ai/score-link-prospect";
import { checkAnchorDiversityTool } from "./backlink-ai/check-anchor-diversity";
import { computeRepricingTool } from "./marketplace-ops/compute-repricing";
import { optimizeListingTool } from "./marketplace-ops/optimize-listing";
import { planAdCampaignTool } from "./ad-manager/plan-ad-campaign";
import { checkAdComplianceTool } from "./ad-manager/check-ad-compliance";
import { generateWeeklyPlanTool } from "./general-manager/generate-weekly-plan";
import { generateFridayReviewTool } from "./general-manager/generate-friday-review";
import { assessWorkerLoadTool } from "./ops-lead/assess-worker-load";
import { composeRunbookTool } from "./ops-lead/compose-runbook";
import { draftProductSpecTool } from "./product-manager/draft-product-spec";
import { draftReleaseNotesTool } from "./product-manager/draft-release-notes";
import { reviewChannelMixTool } from "./marketing-director/review-channel-mix";
import { proposeGrowthExperimentTool } from "./marketing-director/propose-growth-experiment";
import { forecastPipelineTool } from "./sales-director/forecast-pipeline";
import { coachSdrTool } from "./sales-director/coach-sdr";
import { planShortClipsTool } from "./video-editor/plan-short-clips";
import { generateCaptionsTool } from "./video-editor/generate-captions";
import { scoreVoiceMatchTool } from "./brand-manager/score-voice-match";
import { proposeBrandBibleUpdateTool } from "./brand-manager/propose-brand-update";
import { planEventInviteSequenceTool } from "./event-marketer/plan-invite-sequence";
import { repurposeEventRecordingTool } from "./event-marketer/repurpose-event-recording";
import { draftShowNotesTool } from "./podcast-producer/draft-show-notes";
import { draftGuestInvitationTool } from "./podcast-producer/draft-guest-invitation";
import { triageLiveQaTool } from "./webinar-host/triage-live-qa";
import { draftWebinarFollowupDripTool } from "./webinar-host/draft-followup-drip";
import { answerTechnicalQuestionTool } from "./sales-engineer/answer-technical-question";
import { draftIntegrationOutlineTool } from "./sales-engineer/draft-integration-outline";
import { draftRfpResponseTool } from "./proposal-writer/draft-rfp-response";
import { draftSowTool } from "./proposal-writer/draft-sow";
import { scoreChurnRiskTool } from "./renewal-specialist/score-churn-risk";
import { draftRenewalPlayTool } from "./renewal-specialist/draft-renewal-play";
import { scorePartnerFitTool } from "./partnership-manager/score-partner-fit";
import { draftPartnershipProposalTool } from "./partnership-manager/draft-partnership-proposal";
import { draftPropertyListingTool } from "./listing-manager/draft-property-listing";
import { scoreInquiryIntentTool } from "./listing-manager/score-inquiry-intent";
import { requestSupplierQuotesTool } from "./purchasing-agent/request-supplier-quotes";
import { compareQuotesTool } from "./purchasing-agent/compare-quotes";
import { triageShipmentStatusTool } from "./logistics-coordinator/triage-shipment-status";
import { draftShippingUpdateEmailTool } from "./logistics-coordinator/draft-shipping-update-email";
import { evaluateReorderTool } from "./inventory-manager/evaluate-reorder";
import { forecastDemandTool } from "./inventory-manager/forecast-demand";
import { scoreVendorPerformanceTool } from "./vendor-manager/score-vendor-performance";
import { draftRenegotiationBriefTool } from "./vendor-manager/draft-renegotiation-brief";
import { triageBugReportTool } from "./quality-assurance/triage-bug-report";
import { evaluateReleaseReadinessTool } from "./quality-assurance/evaluate-release-readiness";
import { detectProjectBlockersTool } from "./project-coordinator/detect-blockers";
import { compileStatusUpdateTool } from "./project-coordinator/compile-status-update";
import { evaluateEscalationTool } from "./tier2-support/evaluate-escalation";
import { documentRecurringIssueTool } from "./tier2-support/document-recurring-issue";
import { composeGreetingTool } from "./live-chat/compose-greeting";
import { scoreChatLeadIntentTool } from "./live-chat/score-chat-lead";
import { clusterFeedbackThemesTool } from "./feedback-analyst/cluster-feedback-themes";
import { compileFeedbackDigestTool } from "./feedback-analyst/compile-feedback-digest";
import { recommendLocalOptionsTool } from "./concierge/recommend-local-options";
import { evaluateBookingRequestTool } from "./concierge/evaluate-booking-request";
import { generateSocraticHintTool } from "./tutor/generate-socratic-hint";
import { compileParentUpdateTool } from "./tutor/compile-parent-update";
import { bookAppointmentSlotTool } from "./receptionist/book-appointment-slot";
import { composeAppointmentReminderTool } from "./receptionist/compose-appointment-reminder";
import { categorizeExpenseTool } from "./tax-prep/categorize-expense";
import { compileTaxPackageSummaryTool } from "./tax-prep/compile-tax-package";
import { auditSaasSubscriptionTool } from "./procurement/audit-saas-subscription";
import { draftVendorOutreachTool } from "./procurement/draft-vendor-outreach";
import { writeMenuDescriptionTool } from "./chef-assistant/write-menu-description";
import { checkAllergenDisclosureTool } from "./chef-assistant/check-allergen-disclosure";
import { scoreCandidateFitTool } from "./recruiter/score-candidate-fit";
import { draftSourcingOutreachTool } from "./recruiter/draft-sourcing-outreach";

/**
 * Role → tool set registry. The model only sees the tools enabled for
 * the role it's playing — preventing a Content Writer from issuing
 * refunds, an SDR from triggering GDPR flows, etc.
 *
 * Coverage today:
 *   Sprint 21 — customer-support, customer-success     (4 tools)
 *   Sprint 22 — inbound-sales                          (5 tools)
 *   Sprints 23-26 will add SDR, Content Writer, SEO, Social Media.
 *   Roles with no entry fall through to chat-only (Sprint 5 baseline).
 *
 * Adding a new role's tools is a 2-line change: add the import + a map
 * entry. No core runtime edits.
 */
export const ROLE_TOOLS: Record<string, Tool[]> = {
  // Customer-facing
  "customer-support": [
    lookupOrderTool,
    processRefundTool,
    escalateTool,
    gdprRequestTool,
  ],
  "customer-success": [
    lookupOrderTool, // CSMs check accounts the same way
    escalateTool,
    gdprRequestTool,
  ],
  // Sales
  "inbound-sales": [
    qualifyLeadTool,
    bookMeetingTool,
    sendFollowupEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Outbound SDR / BDR — outbound prospecting (Sprint 23). Two slugs
  // share the same toolset: BDR (business development rep) and the
  // outbound-sdr role; the bdr/sdr distinction is org-chart not tool
  // capability.
  "outbound-sdr": [
    enrichProspectTool,
    createOutreachLeadTool,
    queueOutreachEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  bdr: [
    enrichProspectTool,
    createOutreachLeadTool,
    queueOutreachEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Content Writer (Sprint 24)
  "content-writer": [
    createContentBriefTool,
    produceDraftsTool,
    // Content writers benefit from keyword research too — same tool
    // surface as the SEO Specialist, just different system prompts.
    researchKeywordsTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — SEO Specialist (Sprint 25)
  "seo-specialist": [
    auditUrlTool,
    researchKeywordsTool,
    createContentBriefTool,
    produceDraftsTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Social Media Manager (Sprint 26)
  // Pulls in the content tools (multi-channel drafting is the bread
  // and butter) plus social-specific comment reply + post-performance
  // analytics.
  "social-media": [
    createContentBriefTool,
    produceDraftsTool,
    replyToSocialCommentTool,
    reportEngagementTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Customer-facing — Community Manager (Sprint 27)
  // Welcomes new members, drafts community digests (via content
  // tools), flags conflicts for the operator. NEVER moderates
  // unilaterally — role config + tool description enforce that
  // invariant; `flag_for_moderation` records the flag but never bans.
  "community-manager": [
    welcomeNewMemberTool,
    flagForModerationTool,
    createContentBriefTool, // for digests / pinned announcements
    produceDraftsTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Email Marketer (Sprint 28)
  // Newsletter / promo campaign drafting + A/B subject lines + leads
  // segmentation BEFORE sending. Drafting + queueing reuses the
  // content + SDR pipelines (createContentBrief → produceDrafts +
  // queueOutreachEmail for individual sends if needed).
  "email-marketer": [
    segmentAudienceTool,
    draftSubjectLinesTool,
    createContentBriefTool,
    produceDraftsTool,
    queueOutreachEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Customer-facing — KB Editor (Sprint 29)
  // Read-only side of Brand Bible curation today: search the index,
  // propose changes for operator approval. Direct mutation lands in
  // Sprint 30 along with the dedicated `kb_update` worker_action kind.
  "kb-editor": [
    searchBrandBibleTool,
    proposeKbUpdateTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Influencer Outreach (Sprint 30)
  // SDR pattern with a creator-search lens. find_influencer surfaces
  // candidates → create_outreach_lead persists them as leads →
  // queue_outreach_email drafts the personalized collaboration pitch.
  "influencer-outreach": [
    findInfluencerTool,
    createOutreachLeadTool,
    queueOutreachEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Sales — Affiliate Manager (Sprint 31)
  // SDR-like recruitment of affiliates + commission code assignment.
  // create_affiliate_code records the agreement on the lead row;
  // Stripe Promotion Code + checkout enforcement land in Sprint 50.
  "affiliate-manager": [
    createOutreachLeadTool,
    queueOutreachEmailTool,
    createAffiliateCodeTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Sales — Account Manager (Sprint 32)
  // Owns existing customer relationships. Looks up account history
  // (lookup_order), books QBR / renewal calls (book_meeting from
  // inbound-sales), records expansion opportunities for operator
  // pipeline review.
  "account-manager": [
    lookupOrderTool,
    bookMeetingTool,
    sendFollowupEmailTool,
    trackExpansionOpportunityTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Customer-facing — Customer Onboarder (Sprint 33)
  // Guides new customers through activation; records step progress so
  // Customer Success / Account Manager pick up stuck accounts.
  "customer-onboarder": [
    recordOnboardingStepTool,
    sendFollowupEmailTool,
    lookupOrderTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Finance — Bookkeeping Assistant (Sprint 34)
  // Logs income/expense entries to the security-events ledger today;
  // Sprint 70+ migrates these to a dedicated bookkeeping_entries
  // table + QuickBooks/Xero sync.
  bookkeeping: [
    recordBookkeepingEntryTool,
    monthlySummaryTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Finance — Invoice Specialist (Sprint 35)
  // Issues real Stripe invoices (test mode), lists open / overdue
  // invoices for a customer, triggers Stripe's hosted-invoice email.
  // Caps single invoices at $50,000 — over-cap escalates.
  "invoice-specialist": [
    createInvoiceTool,
    listOpenInvoicesTool,
    sendInvoiceReminderTool,
    recordBookkeepingEntryTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Finance — Cash Flow Manager (Sprint 36)
  // Projects future cash flow from the bookkeeping ledger run-rate;
  // surfaces runway estimates so the operator knows when to act.
  "cash-flow": [
    computeCashflowProjectionTool,
    monthlySummaryTool,
    listOpenInvoicesTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — HR Assistant (Sprint 37)
  // CV parsing + applicant tracking via leads-table co-option.
  // Sprint 85+ migrates applicants to a dedicated table.
  "hr-assistant": [
    parseCvTool,
    trackApplicantTool,
    sendFollowupEmailTool,
    bookMeetingTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Executive Assistant (Sprint 38)
  // Inbox triage + meeting brief preparation. Both tools make their
  // own OpenAI calls (separate from the agent loop) because the
  // task-shaped prompts differ from general chat.
  "exec-assistant": [
    triageInboxTool,
    prepareMeetingBriefTool,
    bookMeetingTool,
    sendFollowupEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — IT Helper (Sprint 39)
  // Triages internal IT support requests; opens tickets in the
  // existing support_tickets table with channel='in_app'.
  "it-helper": [
    createItTicketTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Data Analyst (Sprint 40)
  // Read-only queries + named-metric computation. No arbitrary SQL —
  // whitelisted dimensions + metric names + LIMIT caps. Used by
  // Business Analyst + CEO Advisor too (Sprints 41-42).
  "data-analyst": [
    queryLeadsBreakdownTool,
    computeMetricTool,
    monthlySummaryTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Business Analyst (Sprint 41)
  // Sits one level above Data Analyst: ingests the raw KPIs, compares
  // them across periods, flags anomalies (default 20% threshold per
  // role-config), and produces a structured recommendation memo.
  // Approval mode is "Suggestion only" — memos never auto-execute.
  "business-analyst": [
    comparePeriodMetricTool,
    generateBusinessRecommendationTool,
    queryLeadsBreakdownTool,
    computeMetricTool,
    monthlySummaryTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Executive — CEO Advisor (Sprint 42)
  // Highest-level role: reads everything, frames the operator's week
  // around 2-3 real decisions, pushes back on hedging, logs the
  // decisions for future-self accountability. Inherits the Business
  // Analyst data tools (compute_metric / compare_period_metric /
  // query_leads_breakdown) so it can ground its framing in numbers
  // rather than vibes. Approval mode is "Suggestion only".
  "ceo-advisor": [
    frameWeeklyDecisionsTool,
    logDecisionTool,
    surfacePastDecisionsTool,
    comparePeriodMetricTool,
    computeMetricTool,
    queryLeadsBreakdownTool,
    generateBusinessRecommendationTool,
    monthlySummaryTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Executive — Strategic Advisor (Sprint 43)
  // Lower-frequency, deeper-cut counterpart to CEO Advisor. The
  // operator brings a decision they're considering; the Advisor asks
  // 3 sharp questions, surfaces contradictions with the past decision
  // log, and articulates the strongest counter-position. Default
  // pushback is "balanced" (CEO Advisor defaults blunt — a deliberate
  // split: weekly cadence wants directness, on-demand review wants
  // rigor). Approval mode is "Suggestion only".
  "strategic-advisor": [
    reviewDecisionTool,
    surfacePastDecisionsTool,
    logDecisionTool,
    comparePeriodMetricTool,
    computeMetricTool,
    generateBusinessRecommendationTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Legal Helper (Sprint 44)
  // Drafts first-pass docs + reviews clauses; ALWAYS returns a "not
  // legal advice" disclaimer and never produces signature blocks.
  // Approval mode is "Approval required" — the role-config flags this
  // intentionally so the operator + their counsel sign off before
  // anything leaves the building.
  "legal-helper": [
    draftLegalDocumentTool,
    reviewContractClauseTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Translator (Sprint 45)
  // High-throughput localization with brand-glossary preservation +
  // market-aware formality. Approval mode is "Automatic" — these are
  // low-stakes content operations and brand glossary protection is
  // built into the tool itself rather than a human gate.
  translator: [
    translateTextTool,
    buildGlossaryTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — PR Manager (Sprint 46)
  // Drafts press releases + journalist pitches with hard guardrails:
  // never invents quotes, never invents past coverage details, never
  // claims negative comparisons against competitors. Approval mode is
  // "Approval required" so the operator (and counsel if needed) signs
  // off before anything ships to a wire service or reporter.
  "pr-manager": [
    draftPressReleaseTool,
    draftJournalistPitchTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Visual Designer (Sprint 47)
  // Produces creative briefs + multi-channel variant cut-lists. Does
  // NOT generate images directly — image generation is a separate
  // sprint (downstream of the brief). Approval mode is "Approval
  // required" to keep brand-palette / typography under human review.
  "visual-designer": [
    createDesignBriefTool,
    specImageVariantsTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Customer-facing — Voice Agent (Sprint 48)
  // Post-call structured summary + warm-transfer paging. The real
  // telephony stack (Twilio Voice / Vapi) lands in Sprint 80+; today
  // these tools are driven by an external transcription pipeline that
  // posts text into the agent after each call. Approval mode is
  // "Approval required" because the operator owns transfer routing.
  "voice-agent": [
    summarizeCallTool,
    flagCallTransferTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Backlink AI (Sprint 49)
  // Scores link prospects for fit + red flags and enforces anchor-
  // text diversity floor before each outreach. Reuses SDR's outreach
  // queue tool (queue_outreach_email) for the actual pitch. Approval
  // mode is "Approval required" — Google penalty risk is real.
  "backlink-ai": [
    scoreLinkProspectTool,
    checkAnchorDiversityTool,
    queueOutreachEmailTool,
    createOutreachLeadTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Marketplace Ops (Sprint 50)
  // Repricing arithmetic + listing optimisation across Amazon, eBay,
  // Etsy, Walmart, Mercado Libre. Hard guardrails on price (min
  // margin + floor + ceiling) and on listing claims (banned phrases,
  // unsubstantiated metrics). Approval mode is "Approval required".
  "marketplace-ops": [
    computeRepricingTool,
    optimizeListingTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Ad Manager (Sprint 51)
  // Plans multi-platform ad campaigns + lints copy against common
  // policy patterns. NEVER launches anything — plans are staged for
  // operator approval. Approval mode is "Approval required" because
  // budgets and platform policies are unforgiving.
  "ad-manager": [
    planAdCampaignTool,
    checkAdComplianceTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — General Manager (Sprint 52)
  // Monday plan + Friday review cadence. Tools enforce north-star KPI
  // alignment on every bullet so the operator never wakes up to a
  // pile of unaligned activity. Inherits the BA/DA data tools for
  // KPI grounding. Approval mode is "Suggestion only".
  "general-manager": [
    generateWeeklyPlanTool,
    generateFridayReviewTool,
    comparePeriodMetricTool,
    computeMetricTool,
    queryLeadsBreakdownTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Ops Lead (Sprint 53)
  // Worker-load surveillance + runbook authoring. Approval mode is
  // "Automatic" because load assessment is read-only and runbook
  // drafts are non-destructive (operator confirms openQuestions
  // before they become canon).
  "ops-lead": [
    assessWorkerLoadTool,
    composeRunbookTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Product — Product Manager (Sprint 54)
  // Spec drafting + release notes authoring. Spec output is suggestion-
  // only and never files engineering tickets directly. Release notes
  // returns markdown for the operator to publish via the appropriate
  // channel (changelog page, in-app, email).
  "product-manager": [
    draftProductSpecTool,
    draftReleaseNotesTool,
    searchBrandBibleTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Marketing Director (Sprint 55)
  // Reviews channel mix (arithmetic) + proposes ONE focused growth
  // experiment per month (LLM-driven). Approval mode is "Suggestion
  // only" — director surfaces options, operator approves budget moves.
  "marketing-director": [
    reviewChannelMixTool,
    proposeGrowthExperimentTool,
    comparePeriodMetricTool,
    computeMetricTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Sales — Sales Director (Sprint 56)
  // Pipeline forecast (deterministic arithmetic) + SDR coaching feedback
  // (LLM-driven). Approval mode is "Suggestion only" — director surfaces
  // numbers and coaching notes, the operator runs the deal review.
  "sales-director": [
    forecastPipelineTool,
    coachSdrTool,
    comparePeriodMetricTool,
    computeMetricTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Video Editor (Sprint 57)
  // Clip planning (LLM, transcript-grounded) + caption formatting
  // (typography arithmetic). NEVER produces actual video files — output
  // is a structured spec the operator's editing software ingests.
  "video-editor": [
    planShortClipsTool,
    generateCaptionsTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Brand Manager (Sprint 58)
  // Voice-match scoring + Brand Bible update proposals. Suggestion-only
  // by design — the Brand Manager flags drift but the operator owns
  // the final Brand Bible edit (via the KB Editor's propose_kb_update
  // tool downstream of approval).
  "brand-manager": [
    scoreVoiceMatchTool,
    proposeBrandBibleUpdateTool,
    searchBrandBibleTool,
    proposeKbUpdateTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Event Marketer (Sprint 59)
  // Invite-sequence scheduling (deterministic) + event repurposing
  // (LLM, transcript-grounded). Approval mode is "Approval required"
  // because invites trigger real email sends downstream.
  "event-marketer": [
    planEventInviteSequenceTool,
    repurposeEventRecordingTool,
    queueOutreachEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Podcast Producer (Sprint 60)
  // Show-notes drafting + guest-invitation authoring. URL whitelisting
  // enforced server-side (the producer never invents links). Reuses
  // repurpose_event_recording for cutting clips from episodes.
  "podcast-producer": [
    draftShowNotesTool,
    draftGuestInvitationTool,
    repurposeEventRecordingTool,
    queueOutreachEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Marketing — Webinar Host (Sprint 61)
  // Live Q&A triage + post-event drip authoring. Reuses event-marketer
  // invite sequencing for pre-event ops. Triage NEVER drafts the
  // spoken answer; host owns it.
  "webinar-host": [
    triageLiveQaTool,
    draftWebinarFollowupDripTool,
    planEventInviteSequenceTool,
    repurposeEventRecordingTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Sales — Sales Engineer (Sprint 62)
  // Technical Q&A with automatic pricing-deferral + integration
  // outline drafting. NEVER commits to SLA or go-live dates; pricing
  // questions are forced to defer to the Account Manager.
  "sales-engineer": [
    answerTechnicalQuestionTool,
    draftIntegrationOutlineTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Sales — Proposal Writer (Sprint 63)
  // RFP responses + SOW drafting. ALWAYS defers pricing to the AM —
  // hard server-side enforcement (pricingDeferred=true, placeholder
  // string in SOW). Approval mode is "Approval required".
  "proposal-writer": [
    draftRfpResponseTool,
    draftSowTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Sales — Renewal Specialist (Sprint 64)
  // Deterministic churn-risk scoring + save-play drafting with hard
  // discount authority caps. Reuses account_manager helpers for
  // expansion tracking.
  "renewal-specialist": [
    scoreChurnRiskTool,
    draftRenewalPlayTool,
    trackExpansionOpportunityTool,
    sendFollowupEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Sales — Partnership Manager (Sprint 65)
  // Partner fit scoring (hard gates + LLM soft factors) + joint-GTM
  // proposal drafting. Financial terms ALWAYS placeholder — operator
  // owns deal economics.
  "partnership-manager": [
    scorePartnerFitTool,
    draftPartnershipProposalTool,
    createOutreachLeadTool,
    queueOutreachEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Real Estate — Listing Manager (Sprint 66)
  // Property listing drafting (with Fair Housing + price guardrails)
  // + inquiry triage. NEVER quotes prices in body copy; NEVER drafts
  // full replies — operator picks up the response.
  "listing-manager": [
    draftPropertyListingTool,
    scoreInquiryIntentTool,
    bookMeetingTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Purchasing Agent (Sprint 67)
  // Quote-request drafting (3-quote rule enforced server-side) +
  // weighted quote comparison (deterministic). Approved-supplier
  // whitelist enforced — non-approved suppliers dropped silently.
  "purchasing-agent": [
    requestSupplierQuotesTool,
    compareQuotesTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Logistics Coordinator (Sprint 68)
  // Deterministic shipment triage (status + staleness + value-based
  // claim threshold) + customer-facing update email drafting (URL +
  // ETA whitelisting enforced server-side). Approval mode "Automatic"
  // because most updates are low-stakes status notices.
  "logistics-coordinator": [
    triageShipmentStatusTool,
    draftShippingUpdateEmailTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Inventory Manager (Sprint 69)
  // Pure-arithmetic reorder evaluation + capped linear-trend demand
  // forecasting. Approval mode "Automatic" because reorders are
  // staged for the Purchasing Agent who handles the supplier outreach.
  "inventory-manager": [
    evaluateReorderTool,
    forecastDemandTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Vendor Manager (Sprint 70)
  // Deterministic vendor performance scoring (with hard overrides for
  // defect/on-time misses) + LLM-driven renegotiation brief. Tone of
  // the brief is set server-side from rateRise + relationshipHealth.
  "vendor-manager": [
    scoreVendorPerformanceTool,
    draftRenegotiationBriefTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Engineering — Quality Assurance (Sprint 71)
  // Bug triage (LLM with server-side P0 pattern auto-escalation) +
  // deterministic release-readiness scoring. Approval mode "Approval
  // required" because QA sign-off blocks/clears releases.
  "quality-assurance": [
    triageBugReportTool,
    evaluateReleaseReadinessTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Project Coordinator (Sprint 72)
  // Deterministic blocker detection + LLM status-update compilation.
  // Approval mode "Automatic" because both tools produce drafts /
  // surface signals — the operator owns broadcast.
  "project-coordinator": [
    detectProjectBlockersTool,
    compileStatusUpdateTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Customer-facing — Tier 2 Support (Sprint 73)
  // Deterministic escalation routing with hard refund-authority caps
  // and legal-pattern detection + LLM recurring-issue documentation
  // (quotes whitelisted). Reuses tier-1 tools so reps can still handle
  // bread-and-butter refunds and order lookups themselves.
  "tier2-support": [
    evaluateEscalationTool,
    documentRecurringIssueTool,
    lookupOrderTool,
    processRefundTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Customer-facing — Live Chat (Sprint 74)
  // Context-aware greeting composer (≤120 chars, allowed-CTA enforced)
  // + intent + qualification scorer. NEVER drafts the agent's reply —
  // it surfaces the next step.
  "live-chat": [
    composeGreetingTool,
    scoreChatLeadIntentTool,
    bookMeetingTool,
    qualifyLeadTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Feedback Analyst (Sprint 75)
  // Theme clustering with verbatim-quote whitelist + weekly digest
  // compilation. Approval mode "Suggestion only" — surfaces patterns,
  // operator decides which to act on.
  "feedback-analyst": [
    clusterFeedbackThemesTool,
    compileFeedbackDigestTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Hospitality — Concierge (Sprint 76)
  // Partner-whitelisted local recommendations (with disclosure) +
  // deterministic booking-authority evaluation. NEVER invents venues,
  // NEVER books medical/legal requests automatically.
  concierge: [
    recommendLocalOptionsTool,
    evaluateBookingRequestTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Education — Tutor (Sprint 77)
  // Socratic hints (server-side answer redaction) + honest weekly
  // parent update (no invented scores / diagnoses). Approval mode
  // "Automatic" — hints flow to the student inline; parent emails
  // are explicit "notForSend" drafts.
  tutor: [
    generateSocraticHintTool,
    compileParentUpdateTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Services — Receptionist (Sprint 78)
  // Deterministic slot booking (availability + buffer + lead time +
  // per-day cap) + channel-aware reminder/recovery composer with URL
  // whitelist + guilt-detection on no-show recovery.
  receptionist: [
    bookAppointmentSlotTool,
    composeAppointmentReminderTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Finance — Tax Prep (Sprint 79)
  // Chart-of-accounts categorisation (operator whitelist enforced) +
  // region-aware accountant package summary. NEVER asserts
  // deductibility, NEVER files anything.
  "tax-prep": [
    categorizeExpenseTool,
    compileTaxPackageSummaryTool,
    recordBookkeepingEntryTool,
    monthlySummaryTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Operations — Procurement (Sprint 80)
  // SaaS subscription audit (deterministic action classifier) +
  // vendor outreach drafting (LLM with verbatim utilization data +
  // server-side legal/competitor-threat scan).
  procurement: [
    auditSaasSubscriptionTool,
    draftVendorOutreachTool,
    escalateTool,
    gdprRequestTool,
  ],
  // Hospitality — Chef Assistant (Sprint 81)
  // Menu description (with server-side allergen derivation from EU 14
  // or US Big-9) + allergen-disclosure linting. NEVER invents
  // ingredients, NEVER makes health claims, NEVER quotes prices.
  "chef-assistant": [
    writeMenuDescriptionTool,
    checkAllergenDisclosureTool,
    escalateTool,
    gdprRequestTool,
  ],
  // HR — Recruiter (Sprint 82) — FINAL ROLE (64/64)
  // Deterministic + LLM candidate scoring with server-side protected-
  // attribute scan (refuses any reasoning over age / gender / etc.) +
  // outreach drafting with server-side compensation-number rejection.
  // Approval mode "Approval required".
  recruiter: [
    scoreCandidateFitTool,
    draftSourcingOutreachTool,
    parseCvTool,
    trackApplicantTool,
    escalateTool,
    gdprRequestTool,
  ],
};

/** Resolve the tool set for a role. Returns [] when the role has none. */
export function toolsForRole(roleSlug: string): Tool[] {
  return ROLE_TOOLS[roleSlug] ?? [];
}
