import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { requireApp } from "@/lib/auth/guards";
import { rateLimitOr429 } from "@/lib/auth/rate-limit-route";
import { readJson } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

interface Body {
  content?: string;
}

const ID_RE = /^[0-9a-f-]{36}$/;

/**
 * POST /api/conversations/[id]/messages
 *
 * Staff takeover: appends a human-agent message to the conversation and
 * flips its status to `awaiting_human` (so the AI worker stops responding
 * automatically until a teammate resolves it).
 *
 * In Sprint 6 the Approval Center will let the staff send a message
 * that the customer sees as if from the AI worker; for now, every
 * staff-authored message is tagged as `human_agent`.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const session = await requireApp();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await rateLimitOr429("api", `tenant:${session.tenantId}`, {
    tenantId: session.tenantId,
    userId: session.user.id,
    route: "POST /api/conversations/[id]/messages",
  });
  if (t) return t;
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await readJson<Body>(req);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });
  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long (max 4000 chars)" }, { status: 413 });
  }

  // Verify the conversation belongs to the tenant before inserting.
  const [convo] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.tenantId, session.tenantId)))
    .limit(1);
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [row] = await db
    .insert(messages)
    .values({
      tenantId: session.tenantId,
      conversationId: id,
      role: "human_agent",
      content,
      authorUserId: session.userId,
    })
    .returning();

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      status: "awaiting_human",
    })
    .where(eq(conversations.id, id));

  return NextResponse.json({ ok: true, message: row });
}
