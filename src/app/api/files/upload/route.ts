import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { applyMyOSActionToRepository } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";
import { deleteBinaryFile, formatBytes, inferKindFromName, maxUploadBytes, saveBinaryFile } from "@/server/files/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const project = String(formData?.get("project") || "未关联");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择要上传的文件。" }, { status: 400 });
  }
  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "文件不能超过 25 MB。" }, { status: 413 });
  }

  let saved: Awaited<ReturnType<typeof saveBinaryFile>> | null = null;

  try {
    saved = await saveBinaryFile({
      filename: file.name,
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
      ownerEmail: session.email
    });
    const data = await applyMyOSActionToRepository(session, {
      type: "addFileRecord",
      payload: {
        name: file.name,
        kind: inferKindFromName(file.name, file.type),
        project,
        size: formatBytes(file.size),
        mimeType: file.type || "application/octet-stream",
        sourceUrl: `/api/files/download/${saved.id}`,
        storagePath: saved.storagePath
      }
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (saved?.storagePath) {
      await deleteBinaryFile(saved.storagePath).catch(() => undefined);
    }
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "文件已保存，但登记到 MyOS 数据失败。" }, { status: 500 });
  }
}
