import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { applyMyOSActionToRepository, readMyOSData } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";
import { deleteBinaryFile } from "@/server/files/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const current = await readMyOSData(session);
    const file = current.files.find((item) => item.id === id);
    if (!file) {
      return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
    }

    if (file.storagePath && file.sourceUrl) {
      await deleteBinaryFile(file.storagePath);
    }

    const data = await applyMyOSActionToRepository(session, { type: "deleteFile", payload: { id } });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "删除文件失败。" }, { status: 500 });
  }
}
