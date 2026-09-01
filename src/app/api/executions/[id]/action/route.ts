import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerEmail, getSession } from "@/lib/auth/session";
import { mutateRuntimeExecution } from "@/lib/python-agent/client";
import { persistExecution } from "@/lib/python-agent/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["stop", "approve", "accept", "rollback"]),
  decision: z.enum(["once", "always", "deny"]).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getSession()) || { email: getOwnerEmail(), mode: "local-demo" as const };
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "操作格式不正确。" }, { status: 400 });
  const { id } = await params;
  try {
    const extra = parsed.data.type === "approve" ? { decision: parsed.data.decision || "once" } : undefined;
    const execution = await mutateRuntimeExecution(id, parsed.data.type, extra);
    await persistExecution(session, execution);
    return NextResponse.json({ execution });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "执行操作失败。" }, { status: 502 });
  }
}
