import { type NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, messages, workers } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const ID_RE = /^[0-9a-f-]{36}$/;

/**
 * GET /api/conversations/[id]
 *
 * Conversation detail + full message history. Tenant-scoped; returns
 * 404 if the conversation belongs to a different tenant.
 */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "GET /api/conversations/[id]",
  });
  if (t) return t;
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [convo] = await db
    .select({
      id: conversations.id,
      channel: conversations.channel,
      status: conversations.status,
      customer: conversations.customer,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      workerId: workers.id,
      workerName: workers.name,
      workerRoleSlug: workers.roleSlug,
    })
    .from(conversations)
    .innerJoin(workers, eq(workers.id, conversations.workerId))
    .where(
      and(eq(conversations.id, id), eq(conversations.tenantId, session.tenantId)),
    )
    .limit(1);
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ conversation: convo, messages: msgRows });
}
