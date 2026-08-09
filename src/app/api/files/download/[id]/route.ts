import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readMyOSData } from "@/server/data/repository";
import { createSupabaseAdminClient } from "@/server/data/supabase-store";
import { uploadRoot } from "@/server/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "myos-files";
}

function supabaseObjectPath(storagePath: string) {
  return storagePath.startsWith("supabase/") ? storagePath.slice("supabase/".length) : "";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const { id } = await context.params;
  const data = await readMyOSData(session);
  const file = data.files.find((item) => item.sourceUrl === `/api/files/download/${id}` || item.storagePath?.includes(id));
  if (!file?.storagePath) {
    return NextResponse.json({ error: "文件不存在或没有下载路径。" }, { status: 404 });
  }

  const objectPath = supabaseObjectPath(file.storagePath);
  if (objectPath) {
    const client = createSupabaseAdminClient();
    const { data: signed, error } = await client.storage
      .from(storageBucket())
      .createSignedUrl(objectPath, 60, { download: file.name });

    if (error || !signed?.signedUrl) {
      return NextResponse.json({ error: error?.message || "生成 Supabase 签名下载链接失败。" }, { status: 404 });
    }

    return NextResponse.redirect(signed.signedUrl);
  }

  const absolutePath = path.resolve(uploadRoot, file.storagePath);
  if (!absolutePath.startsWith(path.resolve(uploadRoot))) {
    return NextResponse.json({ error: "文件路径无效。" }, { status: 400 });
  }

  try {
    const info = await stat(absolutePath);
    return new Response(Readable.toWeb(createReadStream(absolutePath)) as ReadableStream, {
      headers: {
        "content-type": file.mimeType || "application/octet-stream",
        "content-length": String(info.size),
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`
      }
    });
  } catch {
    return NextResponse.json({ error: "本地文件已丢失。" }, { status: 404 });
  }
}
