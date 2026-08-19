import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, workers, messages } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/conversations — recent conversations for the caller's tenant.
 *
 * Sorted by `lastMessageAt DESC NULLS LAST` so the freshest activity
 * shows up at the top of the Inbox. Includes a preview of the latest
 * message + the worker name.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/conversations",
  });
  if (t) return t;

  const rows = await db
    .select({
      id: conversations.id,
      channel: conversations.channel,
      status: conversations.status,
      workerId: workers.id,
      workerName: workers.name,
      workerRoleSlug: workers.roleSlug,
      customer: conversations.customer,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(workers, eq(workers.id, conversations.workerId))
    .where(eq(conversations.tenantId, session.tenantId))
    .orderBy(sql`${conversations.lastMessageAt} DESC NULLS LAST`)
    .limit(200);

  // For each row, fetch the latest message preview. Doing this with a
  // subquery in Drizzle is awkward; for the typical inbox length (≤ 200)
  // an N+1 over a small fan-out is fine.
  const previews = await Promise.all(
    rows.map(async (r) => {
      const [last] = await db
        .select({ role: messages.role, content: messages.content })
        .from(messages)
        .where(eq(messages.conversationId, r.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      return {
        ...r,
        lastMessageRole: last?.role ?? null,
        lastMessageContent: last?.content.slice(0, 200) ?? null,
      };
    }),
  );

  return NextResponse.json({ conversations: previews });
}
