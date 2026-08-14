import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { applyMyOSActionToRepository } from "@/server/data/repository";
import { readMyOSData } from "@/server/data/repository";
import { listGoogleTasks } from "@/server/integrations/google-platforms";
import { googleErrorResponse, withGoogleAccessToken } from "@/server/integrations/google-route";
import { findGoogleResourceLink, saveGoogleResourceLink } from "@/server/integrations/resource-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { taskIds?: string[] };
    let currentData = await readMyOSData(session);
    const remote = await withGoogleAccessToken((token, signal) => listGoogleTasks(token, signal));
    const selected = body.taskIds?.length ? remote.tasks.filter((task) => body.taskIds?.includes(task.id)) : remote.tasks;
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    for (const remoteTask of selected) {
      if (!remoteTask.id || !remoteTask.title.trim()) {
        skipped += 1;
        continue;
      }
      const plannedDate = remoteTask.due ? new Intl.DateTimeFormat("en-CA", { timeZone: process.env.MYOS_TIME_ZONE || "Asia/Shanghai" }).format(new Date(remoteTask.due)) : undefined;
      const due = remoteTask.due ? new Intl.DateTimeFormat("zh-CN", { timeZone: process.env.MYOS_TIME_ZONE || "Asia/Shanghai", month: "2-digit", day: "2-digit" }).format(new Date(remoteTask.due)) : "Google Tasks";
      const linked = await findGoogleResourceLink(session, { provider: "google-tasks", externalResourceType: "task", externalId: remoteTask.id });
      let localTask = linked ? currentData.tasks.find((task) => task.id === linked.localEntityId) : undefined;
      if (!localTask) localTask = currentData.tasks.find((task) => task.project === "Google Tasks" && task.title.trim().toLowerCase() === remoteTask.title.trim().toLowerCase());
      let next = currentData;
      if (localTask) {
        const nextStatus = remoteTask.status === "completed" ? "completed" : localTask.status === "in_progress" ? "in_progress" : "planned";
        const changed = localTask.title !== remoteTask.title || localTask.plannedDate !== plannedDate || localTask.done !== (remoteTask.status === "completed") || localTask.status !== nextStatus;
        if (changed) {
          next = await applyMyOSActionToRepository(session, {
            type: "updateTask",
            payload: {
              id: localTask.id,
              title: remoteTask.title,
              project: "Google Tasks",
              priority: localTask.priority,
              goalId: localTask.goalId,
              due,
              plannedDate,
              todayFocus: localTask.todayFocus,
              status: nextStatus
            }
          });
          updated += 1;
        }
      } else {
        next = await applyMyOSActionToRepository(session, {
          type: "addTask",
          payload: {
            title: remoteTask.title,
            project: "Google Tasks",
            priority: "medium",
            due,
            plannedDate,
            todayFocus: false
          }
        });
        localTask = next.tasks.find((task) => task.project === "Google Tasks" && task.title === remoteTask.title);
        imported += 1;
      }
      currentData = next;
      if (localTask) {
        await saveGoogleResourceLink(session, { provider: "google-tasks", localEntityType: "task", localEntityId: localTask.id, externalResourceType: "task", externalId: remoteTask.id, remoteUpdatedAt: remoteTask.updated, remoteUrl: remoteTask.selfLink });
      }
    }
    return NextResponse.json({ message: `Google Tasks 已同步：新增 ${imported} 个，更新 ${updated} 个，跳过 ${skipped} 个。`, data: currentData, imported, updated, skipped });
  } catch (error) {
    const result = googleErrorResponse(error, "Google Tasks 导入失败。");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
