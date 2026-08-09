import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getBackendMode } from "@/server/data/repository";
import { createSupabaseAdminClient, SupabaseStoreError } from "@/server/data/supabase-store";
import { uploadRoot } from "@/server/paths";

export const maxUploadBytes = 25 * 1024 * 1024;

export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "myos-files";
}

export function supabaseObjectPath(storagePath: string) {
  return storagePath.startsWith("supabase/") ? storagePath.slice("supabase/".length) : "";
}

export function safeName(name: string) {
  return name.replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 120) || "file";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function inferKindFromName(name: string, mimeType = "") {
  const type = mimeType.toLowerCase();
  const lowerName = name.toLowerCase();
  if (type.includes("pdf") || lowerName.endsWith(".pdf")) return "PDF";
  if (type.includes("word") || lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) return "Word";
  if (type.includes("presentation") || lowerName.endsWith(".ppt") || lowerName.endsWith(".pptx")) return "PPT";
  if (type.includes("spreadsheet") || lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".csv")) return "Excel";
  if (type.startsWith("image/")) return "图片";
  if (lowerName.endsWith(".zip") || lowerName.endsWith(".7z") || lowerName.endsWith(".rar")) return "ZIP";
  if (lowerName.endsWith(".ts") || lowerName.endsWith(".tsx") || lowerName.endsWith(".js") || lowerName.endsWith(".py") || lowerName.endsWith(".c") || lowerName.endsWith(".h")) return "代码";
  return "其他";
}

function ownerStorageKey(email: string) {
  return (process.env.SUPABASE_OWNER_USER_ID || email).replace(/[^\w.@-]+/g, "_");
}

async function ensureStorageBucket(client: ReturnType<typeof createSupabaseAdminClient>) {
  const bucket = storageBucket();
  const { error } = await client.storage.getBucket(bucket);
  if (!error) return;

  const created = await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: maxUploadBytes
  });
  if (created.error) {
    throw new SupabaseStoreError(`Supabase Storage bucket 不可用：${created.error.message}`, 500);
  }
}

export async function saveBinaryFile(input: {
  filename: string;
  bytes: Buffer;
  mimeType: string;
  ownerEmail: string;
}) {
  const id = randomUUID();
  const filename = `${id}-${safeName(input.filename)}`;

  if (getBackendMode() === "supabase") {
    const objectPath = `${ownerStorageKey(input.ownerEmail)}/${id.slice(0, 2)}/${filename}`;
    const client = createSupabaseAdminClient();
    await ensureStorageBucket(client);
    const { error } = await client.storage.from(storageBucket()).upload(objectPath, input.bytes, {
      contentType: input.mimeType || "application/octet-stream",
      upsert: false
    });
    if (error) {
      throw new SupabaseStoreError(`上传到 Supabase Storage 失败：${error.message}`, 500);
    }
    return { id, storagePath: `supabase/${objectPath}` };
  }

  const storagePath = path.join(id.slice(0, 2), filename);
  const absolutePath = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.bytes);
  return { id, storagePath };
}

export async function deleteBinaryFile(storagePath?: string) {
  if (!storagePath) return;

  const objectPath = supabaseObjectPath(storagePath);
  if (objectPath) {
    const client = createSupabaseAdminClient();
    const { error } = await client.storage.from(storageBucket()).remove([objectPath]);
    if (error) {
      throw new SupabaseStoreError(`删除 Supabase Storage 文件失败：${error.message}`, 500);
    }
    return;
  }

  const absolutePath = path.resolve(uploadRoot, storagePath);
  const root = path.resolve(uploadRoot);
  if (!absolutePath.startsWith(root)) {
    throw new SupabaseStoreError("文件路径无效。", 400);
  }

  await rm(absolutePath, { force: true });
}
