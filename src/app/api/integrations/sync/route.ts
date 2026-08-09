import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readIntegrationSyncLogs } from "@/server/integrations/sync-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });

  try {
    return NextResponse.json(await readIntegrationSyncLogs(session));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取同步状态失败。" }, { status: 502 });
  }
}
