import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readMyOSData } from "@/server/data/repository";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/server/integrations/google-platforms";
import { googleErrorResponse, withGoogleAccessToken } from "@/server/integrations/google-route";
import { findGoogleResourceLink, saveGoogleResourceLink } from "@/server/integrations/resource-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const body = await request.json() as { taskId?: string };
    if (!body.taskId) return NextResponse.json({ error: "缺少 taskId。" }, { status: 400 });
    const data = await readMyOSData(session);
    const task = data.tasks.find((item) => item.id === body.taskId);
    if (!task) return NextResponse.json({ error: "MyOS 任务不存在。" }, { status: 404 });
    const linked = await findGoogleResourceLink(session, { provider: "google-calendar", localEntityType: "task", localEntityId: task.id, externalResourceType: "event" });
    const event = await withGoogleAccessToken((token, signal) => linked?.externalId
      ? updateGoogleCalendarEvent(task, linked.externalId, token, signal)
      : createGoogleCalendarEvent(task, token, signal));
    await saveGoogleResourceLink(session, { provider: "google-calendar", localEntityType: "task", localEntityId: task.id, externalResourceType: "event", externalId: event.id, remoteUpdatedAt: event.updated, remoteUrl: event.htmlLink });
    return NextResponse.json({ message: linked ? "任务已更新到 Google Calendar。" : "任务已添加到 Google Calendar。", event });
  } catch (error) {
    const result = googleErrorResponse(error, "写入 Google Calendar 失败。");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
