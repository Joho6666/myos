import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getBackendMode, readMyOSData } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  try {
    const data = await readMyOSData(session);
    if (new URL(request.url).searchParams.get("health") === "1") {
      return NextResponse.json({ ok: true, backend: getBackendMode() });
    }
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "读取 Supabase 数据失败。" }, { status: 500 });
  }
}
