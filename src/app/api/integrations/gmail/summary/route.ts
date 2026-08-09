import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { collectGmailAttachments, getGmailHeader, gmailFetch, GmailListResponse, GmailMessage, refreshGoogleToken } from "@/server/integrations/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const accessToken = await refreshGoogleToken(controller.signal);
    const list = await gmailFetch<GmailListResponse>("/messages?maxResults=10&q=in%3Ainbox%20newer_than%3A30d", accessToken, controller.signal);
    const messages = await Promise.all(
      (list.messages || []).map((message) => {
        const params = new URLSearchParams({ format: "full" });
        params.append("metadataHeaders", "Subject");
        params.append("metadataHeaders", "From");
        params.append("metadataHeaders", "Date");
        return gmailFetch<GmailMessage>(`/messages/${message.id}?${params.toString()}`, accessToken, controller.signal);
      })
    );

    return NextResponse.json({
      messages: messages.map((message) => {
        const attachments = collectGmailAttachments(message.payload);
        return {
          id: message.id || "",
          threadId: message.threadId || "",
          subject: getGmailHeader(message, "Subject") || "(无主题)",
          from: getGmailHeader(message, "From") || "未知发件人",
          date: getGmailHeader(message, "Date") || "",
          snippet: message.snippet || "",
          unread: Boolean(message.labelIds?.includes("UNREAD")),
          important: Boolean(message.labelIds?.includes("IMPORTANT")),
          url: message.id ? `https://mail.google.com/mail/u/0/#inbox/${message.id}` : "",
          attachmentCount: attachments.length,
          attachmentNames: attachments.map((attachment) => attachment.filename).slice(0, 3)
        };
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail 总览读取失败。";
    return NextResponse.json({ error: message }, { status: message.includes("未配置") ? 503 : 502 });
  } finally {
    clearTimeout(timer);
  }
}
