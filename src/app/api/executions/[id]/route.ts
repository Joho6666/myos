import { NextResponse } from "next/server";
import { getOwnerEmail, getSession } from "@/lib/auth/session";
import { getRuntimeExecution } from "@/lib/python-agent/client";
import { persistExecution } from "@/lib/python-agent/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getSession()) || { email: getOwnerEmail(), mode: "local-demo" as const };
  const { id } = await params;
  try {
    const execution = await getRuntimeExecution(id);
    await persistExecution(session, execution);
    return NextResponse.json({ execution });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取执行失败。" }, { status: 404 });
  }
}
