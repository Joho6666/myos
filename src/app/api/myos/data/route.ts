import { NextResponse } from "next/server";
import { getSession, getOwnerEmail } from "@/lib/auth/session";
import { getBackendMode, readMyOSData } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isHealth = new URL(request.url).searchParams.get("health") === "1";
  
  if (isHealth) {
    return NextResponse.json({ ok: true, backend: getBackendMode() });
  }

  const session = await getSession() || {
    email: getOwnerEmail(),
    mode: "local-demo" as const
  };

  try {
    const data = await readMyOSData(session);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "读取 MyOS 数据失败。" }, { status: 500 });
  }
}
