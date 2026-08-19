/**
 * Single barrel that re-exports every table for Drizzle Kit to discover.
 * `drizzle.config.ts` points at this file.
 *
 * Note: we use explicit re-exports rather than `export * from`. Some
 * runtimes (tsx, Node ESM) drop wildcard re-exports when one of the
 * inner modules sets a default — explicit re-exports avoid that pitfall.
 *
 * Add a new table → add it here in the same PR. Schema sprawl is fine;
 * undeclared tables are not.
 */

export {
  plans,
  type Plan,
  type NewPlan,
} from "./plans";

export {
  tenants,
  tenantStatusEnum,
  type Tenant,
  type NewTenant,
} from "./tenants";

export {
  users,
  userRoleEnum,
  userStatusEnum,
  type User,
  type NewUser,
} from "./users";

export {
  sessions,
  refreshTokens,
  type Session,
  type NewSession,
  type RefreshToken,
  type NewRefreshToken,
} from "./sessions";

export {
  oneTimePasswords,
  verificationTokens,
  otpPurposeEnum,
  verificationTokenKindEnum,
  type OneTimePassword,
  type NewOneTimePassword,
  type VerificationToken,
  type NewVerificationToken,
} from "./otp";

export {
  securityEvents,
  rateLimitBuckets,
  securityEventKindEnum,
  type SecurityEvent,
  type NewSecurityEvent,
} from "./security";

export {
  invitations,
  invitationStatusEnum,
  type Invitation,
  type NewInvitation,
} from "./invitations";

export {
  brandBibleSources,
  brandBibleChunks,
  sourceStatusEnum,
  sourceKindEnum,
  type BrandBibleSource,
  type NewBrandBibleSource,
  type BrandBibleChunk,
  type NewBrandBibleChunk,
} from "./brand-bible";

export {
  workers,
  conversations,
  messages,
  workerStatusEnum,
  workerAutonomyEnum,
  conversationChannelEnum,
  conversationStatusEnum,
  messageRoleEnum,
  type Worker,
  type NewWorker,
  type Conversation,
  type NewConversation,
  type Message,
  type NewMessage,
} from "./workers";

export {
  aiUsage,
  aiProviderEnum,
  aiCallKindEnum,
  type AiUsageRow,
  type NewAiUsageRow,
} from "./ai-usage";

export {
  workerActions,
  pushSubscriptions,
  actionKindEnum,
  actionStatusEnum,
  type WorkerAction,
  type NewWorkerAction,
  type PushSubscription,
  type NewPushSubscription,
} from "./approvals";

export {
  integrations,
  integrationKindEnum,
  integrationStatusEnum,
  type Integration,
  type NewIntegration,
} from "./integrations";

export {
  contentBriefs,
  seoAudits,
  briefStatusEnum,
  seoAuditStatusEnum,
  type ContentBrief,
  type NewContentBrief,
  type SeoAudit,
  type NewSeoAudit,
} from "./content";

export {
  leads,
  supportTickets,
  leadStatusEnum,
  ticketPriorityEnum,
  ticketStatusEnum,
  ticketChannelEnum,
  type Lead,
  type NewLead,
  type SupportTicket,
  type NewSupportTicket,
} from "./sales-support";

export {
  tenantAiSpend,
  platformInvoices,
  invoiceStatusEnum,
  type TenantAiSpend,
  type NewTenantAiSpend,
  type PlatformInvoice,
  type NewPlatformInvoice,
} from "./billing";

export {
  announcements,
  announcementStatusEnum,
  announcementSeverityEnum,
  announcementAudienceEnum,
  type Announcement,
  type NewAnnouncement,
} from "./announcements";

export {
  platformSettings,
  type PlatformSetting,
  type NewPlatformSetting,
} from "./platform-settings";

export {
  staff,
  staffRoleEnum,
  staffStatusEnum,
  type Staff,
  type NewStaff,
} from "./staff";

export {
  reports,
  reportRuns,
  reportKindEnum,
  reportRunStatusEnum,
  TENANT_REPORT_KINDS,
  ADMIN_REPORT_KINDS,
  ALL_REPORT_KINDS,
  type Report,
  type NewReport,
  type ReportRun,
  type NewReportRun,
  type ReportKind,
  type ReportRunStatus,
} from "./reports";

export {
  tenantKeks,
  type TenantKek,
  type NewTenantKek,
} from "./keks";

export {
  contactMessages,
  contactMessageStatusEnum,
  type ContactMessage,
  type NewContactMessage,
} from "./contact";

export {
  roleCatalog,
  roleCatalogStatusEnum,
  roleCatalogCategoryEnum,
  type RoleCatalogRow,
  type NewRoleCatalogRow,
} from "./role-catalog";

export {
  platformIntegrations,
  platformIntegrationCategoryEnum,
  platformIntegrationStatusEnum,
  type PlatformIntegrationRow,
  type NewPlatformIntegrationRow,
} from "./platform-integrations";
