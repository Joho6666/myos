import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readMyOSData } from "@/server/data/repository";
import { createGoogleTask, updateGoogleTask } from "@/server/integrations/google-platforms";
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
    const linked = await findGoogleResourceLink(session, { provider: "google-tasks", localEntityType: "task", localEntityId: task.id, externalResourceType: "task" });
    const result = await withGoogleAccessToken(async (token, signal) => linked?.externalId
      ? await updateGoogleTask(task, linked.externalId, token, signal)
      : await createGoogleTask(task, token, signal));
    await saveGoogleResourceLink(session, { provider: "google-tasks", localEntityType: "task", localEntityId: task.id, externalResourceType: "task", externalId: result.task.id, remoteUpdatedAt: result.task.updated, remoteUrl: result.task.selfLink });
    return NextResponse.json({ message: linked ? "任务已更新到 Google Tasks。" : "任务已添加到 Google Tasks。", task: result.task });
  } catch (error) {
    const result = googleErrorResponse(error, "写入 Google Tasks 失败。");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
