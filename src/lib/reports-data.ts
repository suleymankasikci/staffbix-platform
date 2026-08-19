export type ReportCadence =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "On demand";

export type ReportStatus = "Active" | "Paused" | "Draft";

export type DeliveryChannel = "Email" | "Slack" | "Teams" | "Webhook";

export type ReportRecipient = {
  email: string;
  name?: string;
  role?: string;
  cuts?: string[];
};

export type Report = {
  id: string;
  name: string;
  description: string;
  cadence: ReportCadence;
  cadenceTime?: string;
  status: ReportStatus;
  sections: string[];
  recipients: ReportRecipient[];
  channels: DeliveryChannel[];
  lastSentAt?: string;
  nextRunAt?: string;
  totalSent: number;
  avgOpenRate: number;
  createdAt: string;
  createdBy: string;
  templateSlug: string;
};

export type ReportRun = {
  id: string;
  reportId: string;
  ranAt: string;
  status: "Sent" | "Failed" | "Pending";
  recipientCount: number;
  opens: number;
  attachmentKB?: number;
};

export const REPORT_SECTIONS = [
  "Revenue",
  "Conversations",
  "Approvals decided",
  "Workforce load",
  "Channels breakdown",
  "Spending vs caps",
  "Voice match",
  "Anomalies",
  "Hot leads",
  "Cash flow",
  "Brand Bible updates",
  "Audit log summary",
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];

export type ReportTemplate = {
  slug: string;
  name: string;
  description: string;
  cadence: ReportCadence;
  cadenceTime: string;
  sections: ReportSection[];
  channels: DeliveryChannel[];
  audience: string;
};

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    slug: "daily-briefing",
    name: "Daily morning briefing",
    description:
      "Yesterday's highlights, anomalies, and today's planned actions. The single most-read report.",
    cadence: "Daily",
    cadenceTime: "06:00",
    sections: [
      "Conversations",
      "Approvals decided",
      "Hot leads",
      "Spending vs caps",
      "Anomalies",
    ],
    channels: ["Email"],
    audience: "Owner",
  },
  {
    slug: "weekly-summary",
    name: "Weekly executive summary",
    description:
      "Monday morning view of the week — revenue, workforce performance, channel mix.",
    cadence: "Weekly",
    cadenceTime: "Monday 08:00",
    sections: [
      "Revenue",
      "Workforce load",
      "Channels breakdown",
      "Approvals decided",
      "Voice match",
    ],
    channels: ["Email", "Slack"],
    audience: "Owner + leadership",
  },
  {
    slug: "monthly-comprehensive",
    name: "Monthly comprehensive",
    description:
      "Full PDF: every metric, every section, every worker. For investors and board.",
    cadence: "Monthly",
    cadenceTime: "1st of month, 08:00",
    sections: [
      "Revenue",
      "Conversations",
      "Approvals decided",
      "Workforce load",
      "Channels breakdown",
      "Spending vs caps",
      "Voice match",
      "Anomalies",
      "Cash flow",
      "Brand Bible updates",
    ],
    channels: ["Email"],
    audience: "Investors, board, accountant",
  },
  {
    slug: "social-performance",
    name: "Social media performance",
    description:
      "Reach, engagement, follower growth across every connected platform.",
    cadence: "Weekly",
    cadenceTime: "Friday 17:00",
    sections: ["Channels breakdown", "Hot leads"],
    channels: ["Email"],
    audience: "Marketing",
  },
  {
    slug: "spend-audit",
    name: "Spending audit",
    description:
      "Where the money went, which workers spent it, where caps were hit.",
    cadence: "Monthly",
    cadenceTime: "Last Friday of month",
    sections: ["Spending vs caps", "Audit log summary", "Cash flow"],
    channels: ["Email"],
    audience: "Owner, accountant",
  },
  {
    slug: "approvals-retro",
    name: "Approvals retrospective",
    description:
      "How many approvals, how fast, which workers triggered most. Quarterly review of where to loosen.",
    cadence: "Quarterly",
    cadenceTime: "1st of quarter, 09:00",
    sections: ["Approvals decided", "Audit log summary", "Anomalies"],
    channels: ["Email"],
    audience: "Owner",
  },
  {
    slug: "custom",
    name: "Custom report",
    description: "Start blank. Pick your own sections, schedule, and recipients.",
    cadence: "On demand",
    cadenceTime: "",
    sections: [],
    channels: ["Email"],
    audience: "Your call",
  },
];

export const REPORTS: Report[] = [
  {
    id: "rep_001",
    name: "Daily morning briefing",
    description:
      "Yesterday's wins, today's planned actions, anomalies flagged overnight.",
    cadence: "Daily",
    cadenceTime: "06:00 CET",
    status: "Active",
    sections: [
      "Conversations",
      "Approvals decided",
      "Hot leads",
      "Spending vs caps",
      "Anomalies",
    ],
    recipients: [
      { email: "test@mail.com", name: "Alex Morgan", role: "Owner" },
    ],
    channels: ["Email"],
    lastSentAt: "2026-05-12T06:00:00Z",
    nextRunAt: "2026-05-13T06:00:00Z",
    totalSent: 142,
    avgOpenRate: 94,
    createdAt: "2026-01-14",
    createdBy: "Alex Morgan",
    templateSlug: "daily-briefing",
  },
  {
    id: "rep_002",
    name: "Weekly executive summary",
    description:
      "Revenue, workforce performance, channel mix across the week.",
    cadence: "Weekly",
    cadenceTime: "Monday 08:00 CET",
    status: "Active",
    sections: [
      "Revenue",
      "Workforce load",
      "Channels breakdown",
      "Approvals decided",
      "Voice match",
    ],
    recipients: [
      { email: "test@mail.com", name: "Alex Morgan", role: "Owner" },
      { email: "team@northway.example", role: "Team", cuts: ["Workforce load", "Channels breakdown"] },
    ],
    channels: ["Email", "Slack"],
    lastSentAt: "2026-05-12T08:00:00Z",
    nextRunAt: "2026-05-19T08:00:00Z",
    totalSent: 18,
    avgOpenRate: 87,
    createdAt: "2026-01-21",
    createdBy: "Alex Morgan",
    templateSlug: "weekly-summary",
  },
  {
    id: "rep_003",
    name: "Monthly financial report",
    description: "Full P&L summary delivered to the accountant on the 5th.",
    cadence: "Monthly",
    cadenceTime: "5th of month, 09:00 CET",
    status: "Active",
    sections: ["Revenue", "Cash flow", "Spending vs caps", "Audit log summary"],
    recipients: [
      {
        email: "accountant@northway.example",
        name: "Yasemin Ergün",
        role: "Accountant",
      },
    ],
    channels: ["Email"],
    lastSentAt: "2026-05-05T09:00:00Z",
    nextRunAt: "2026-06-05T09:00:00Z",
    totalSent: 4,
    avgOpenRate: 100,
    createdAt: "2026-02-01",
    createdBy: "Alex Morgan",
    templateSlug: "monthly-comprehensive",
  },
  {
    id: "rep_004",
    name: "Social media performance",
    description: "Reach, engagement, follower growth across IG / FB / X / LinkedIn.",
    cadence: "Weekly",
    cadenceTime: "Friday 17:00 CET",
    status: "Active",
    sections: ["Channels breakdown", "Hot leads"],
    recipients: [
      { email: "test@mail.com", name: "Alex Morgan", role: "Owner" },
    ],
    channels: ["Email"],
    lastSentAt: "2026-05-09T17:00:00Z",
    nextRunAt: "2026-05-16T17:00:00Z",
    totalSent: 14,
    avgOpenRate: 78,
    createdAt: "2026-02-14",
    createdBy: "Ayşe Nehir",
    templateSlug: "social-performance",
  },
  {
    id: "rep_005",
    name: "Approvals audit · Q1 retrospective",
    description: "One-off retrospective on Q1 approvals — what we approved, what we rejected, where we can loosen.",
    cadence: "On demand",
    status: "Paused",
    sections: ["Approvals decided", "Audit log summary"],
    recipients: [
      { email: "test@mail.com", name: "Alex Morgan", role: "Owner" },
    ],
    channels: ["Email"],
    lastSentAt: "2026-04-03T11:00:00Z",
    totalSent: 1,
    avgOpenRate: 100,
    createdAt: "2026-04-03",
    createdBy: "Alex Morgan",
    templateSlug: "approvals-retro",
  },
];

export const REPORT_RUNS: ReportRun[] = [
  // Daily briefing — last 7 days
  { id: "run_001", reportId: "rep_001", ranAt: "2026-05-12T06:00:08Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 248 },
  { id: "run_002", reportId: "rep_001", ranAt: "2026-05-11T06:00:12Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 241 },
  { id: "run_003", reportId: "rep_001", ranAt: "2026-05-10T06:00:09Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 263 },
  { id: "run_004", reportId: "rep_001", ranAt: "2026-05-09T06:00:11Z", status: "Sent", recipientCount: 1, opens: 0, attachmentKB: 232 },
  { id: "run_005", reportId: "rep_001", ranAt: "2026-05-08T06:00:07Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 257 },
  { id: "run_006", reportId: "rep_001", ranAt: "2026-05-07T06:00:14Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 244 },
  { id: "run_007", reportId: "rep_001", ranAt: "2026-05-06T06:00:09Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 251 },

  // Weekly summary — last 4 weeks
  { id: "run_010", reportId: "rep_002", ranAt: "2026-05-12T08:00:11Z", status: "Sent", recipientCount: 2, opens: 2, attachmentKB: 482 },
  { id: "run_011", reportId: "rep_002", ranAt: "2026-05-05T08:00:08Z", status: "Sent", recipientCount: 2, opens: 2, attachmentKB: 471 },
  { id: "run_012", reportId: "rep_002", ranAt: "2026-04-28T08:00:13Z", status: "Sent", recipientCount: 2, opens: 1, attachmentKB: 462 },
  { id: "run_013", reportId: "rep_002", ranAt: "2026-04-21T08:00:09Z", status: "Sent", recipientCount: 2, opens: 2, attachmentKB: 458 },

  // Monthly — last 3
  { id: "run_020", reportId: "rep_003", ranAt: "2026-05-05T09:00:34Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 1840 },
  { id: "run_021", reportId: "rep_003", ranAt: "2026-04-05T09:00:28Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 1792 },
  { id: "run_022", reportId: "rep_003", ranAt: "2026-03-05T09:00:31Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 1714 },

  // Social — last 3
  { id: "run_030", reportId: "rep_004", ranAt: "2026-05-09T17:00:14Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 318 },
  { id: "run_031", reportId: "rep_004", ranAt: "2026-05-02T17:00:11Z", status: "Sent", recipientCount: 1, opens: 0, attachmentKB: 304 },
  { id: "run_032", reportId: "rep_004", ranAt: "2026-04-25T17:00:09Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 312 },

  // Approvals retro — one off
  { id: "run_040", reportId: "rep_005", ranAt: "2026-04-03T11:00:22Z", status: "Sent", recipientCount: 1, opens: 1, attachmentKB: 612 },
];

export function findReport(id: string): Report | undefined {
  return REPORTS.find((r) => r.id === id);
}

export function reportRuns(reportId: string): ReportRun[] {
  return REPORT_RUNS.filter((r) => r.reportId === reportId).sort((a, b) =>
    b.ranAt.localeCompare(a.ranAt)
  );
}

export function findTemplate(slug: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find((t) => t.slug === slug);
}
