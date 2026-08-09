import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { applyMyOSActionToRepository } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";
import { formatBytes, inferKindFromName, maxUploadBytes, saveBinaryFile } from "@/server/files/storage";
import { collectGmailAttachments, decodeGmailAttachmentData, GmailAttachmentResponse, GmailMessage, gmailFetch, refreshGoogleToken } from "@/server/integrations/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({
  messageId: z.string().trim().min(1).max(200),
  project: z.string().trim().max(120).optional()
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请选择要导入附件的 Gmail 邮件。" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const accessToken = await refreshGoogleToken(controller.signal);
    const message = await gmailFetch<GmailMessage>(
      `/messages/${encodeURIComponent(parsed.data.messageId)}?format=full`,
      accessToken,
      controller.signal
    );
    const attachments = collectGmailAttachments(message.payload).slice(0, 5);
    if (!attachments.length) {
      return NextResponse.json({ data: null, imported: [], message: "这封邮件没有可导入的附件。" });
    }

    let totalBytes = 0;
    const imported: Array<{ id: string; name: string; size: string; storagePath: string }> = [];
    let latestData = null;
    for (const attachment of attachments) {
      const attachmentBody = await gmailFetch<GmailAttachmentResponse>(
        `/messages/${encodeURIComponent(parsed.data.messageId)}/attachments/${encodeURIComponent(attachment.attachmentId)}`,
        accessToken,
        controller.signal
      );
      if (!attachmentBody.data) continue;

      const bytes = decodeGmailAttachmentData(attachmentBody.data);
      totalBytes += bytes.length;
      if (bytes.length > maxUploadBytes || totalBytes > maxUploadBytes) {
        return NextResponse.json({ error: "本次导入附件总大小不能超过 25 MB。" }, { status: 413 });
      }

      const saved = await saveBinaryFile({
        filename: attachment.filename,
        bytes,
        mimeType: attachment.mimeType,
        ownerEmail: session.email
      });
      latestData = await applyMyOSActionToRepository(session, {
        type: "addFileRecord",
        payload: {
          name: attachment.filename,
          kind: inferKindFromName(attachment.filename, attachment.mimeType),
          project: parsed.data.project || "Gmail",
          size: formatBytes(bytes.length),
          mimeType: attachment.mimeType,
          sourceUrl: `/api/files/download/${saved.id}`,
          storagePath: saved.storagePath
        }
      });
      imported.push({
        id: saved.id,
        name: attachment.filename,
        size: formatBytes(bytes.length),
        storagePath: saved.storagePath
      });
    }

    return NextResponse.json({
      data: latestData,
      imported,
      message: imported.length ? `已导入 ${imported.length} 个附件到文件中心。` : "没有可导入的附件内容。"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail 附件导入失败。";
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: message }, { status: message.includes("未配置") ? 503 : 502 });
  } finally {
    clearTimeout(timer);
  }
}
