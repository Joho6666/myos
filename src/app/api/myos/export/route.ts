import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getBackendMode, readMyOSData } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  try {
    const exportedAt = new Date().toISOString();
    const payload = {
      app: "MyOS",
      schemaVersion: 1,
      exportedAt,
      backendMode: getBackendMode(),
      owner: {
        email: session.email,
        mode: session.mode
      },
      files: {
        includesBinaryContent: false,
        note: "This JSON export includes file records only. Downloaded/uploaded binary files remain in local disk or Supabase Storage."
      },
      data: await readMyOSData(session)
    };
    const filename = `myos-backup-${exportedAt.slice(0, 10)}.json`;

    return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "导出 MyOS 数据失败。" }, { status: 500 });
  }
}
