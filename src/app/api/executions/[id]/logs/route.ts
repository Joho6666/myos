import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRuntimeLogs } from "@/lib/python-agent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  const { id } = await params;
  const after = Number(new URL(request.url).searchParams.get("after") || -1);
  try {
    return NextResponse.json({ logs: await getRuntimeLogs(id, Number.isFinite(after) ? after : -1) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取日志失败。" }, { status: 502 });
  }
}
