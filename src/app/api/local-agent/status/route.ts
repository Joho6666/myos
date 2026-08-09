import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLocalAgentStatus } from "@/lib/local-agent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  return NextResponse.json(await getLocalAgentStatus());
}
