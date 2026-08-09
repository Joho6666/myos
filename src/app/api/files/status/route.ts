import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getBackendMode } from "@/server/data/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const backendMode = getBackendMode();
  return NextResponse.json({
    backendMode,
    storageMode: backendMode === "supabase" ? "supabase-storage" : "local-disk",
    bucket: backendMode === "supabase" ? process.env.SUPABASE_STORAGE_BUCKET || "myos-files" : null,
    maxUploadMb: 25,
    backupIncludesBinaries: false,
    message:
      backendMode === "supabase"
        ? "文件会上传到 Supabase 私有 Storage，并通过短期签名链接下载。"
        : "文件会保存到本机 work/uploads，仅适合本地使用。"
  });
}
