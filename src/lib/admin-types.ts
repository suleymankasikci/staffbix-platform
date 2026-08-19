// Shared admin-panel TypeScript types. These mirror the column shapes
// that `/api/admin/*` GET endpoints return. No runtime data here — the
// admin pages fetch real data from the API and use these types to keep
// the UI strongly typed.
//
// Previously these types lived alongside design-phase mock arrays in
// `src/lib/admin-data.ts`. Audit Sprint A (C-1..C-10) deleted the mocks
// and split types into this file.

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  initials: string;
  plan: "Starter" | "Growth" | "Business" | "Enterprise";
  status: "Active" | "Trial" | "Past due" | "Suspended" | "Churned";
  mrr: number; // monthly recurring revenue in USD
  workersHired: number;
  users: number;
  signedUpAt: string;
  region: string;
  ownerEmail: string;
  ownerName: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: "Owner" | "Admin" | "Editor" | "Reviewer";
  status: "Active" | "Invited" | "Banned";
  lastLoginAt: string;
  signedUpAt: string;
  country: string;
  flag: string;
};

export type PlatformPlan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnualMonthly: number;
  status: "Active" | "Archived";
  workerLimit: number | "Unlimited";
  messagesIncluded: number;
  voiceMinutes: number;
  features: string[];
  customers: number;
  mrr: number;
};

export type SupportTicket = {
  id: string;
  subject: string;
  body: string;
  tenantId: string;
  reporterName: string;
  reporterEmail: string;
  status: "Open" | "Pending" | "Resolved" | "Closed";
  priority: "Low" | "Normal" | "High" | "Critical";
  assignedTo?: string;
  channel: "Email" | "In-app" | "Chat" | "API";
  createdAt: string;
  updatedAt: string;
};

export type PlatformInvoice = {
  id: string;
  tenantId: string;
  amount: number;
  currency: "USD";
  status: "Paid" | "Past due" | "Failed" | "Refunded";
  issuedAt: string;
  paidAt?: string;
  plan: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "Super admin" | "Support lead" | "Engineer" | "Finance" | "Read-only";
  status: "Active" | "Invited";
  twoFactor: boolean;
  lastSeenAt: string;
};

export type PlatformAuditEntry = {
  id: string;
  at: string;
  staff: string;
  action: string;
  target: string;
  tenant?: string;
  result: "success" | "blocked";
  ip: string;
  city: string;
  country: string;
  flag: string;
};
