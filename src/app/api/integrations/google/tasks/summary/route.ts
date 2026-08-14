import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listGoogleTaskLists, listGoogleTasks } from "@/server/integrations/google-platforms";
import { googleErrorResponse, withGoogleAccessToken } from "@/server/integrations/google-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const response = await withGoogleAccessToken(async (token, signal) => {
      const lists = await listGoogleTaskLists(token, signal);
      const configured = process.env.GOOGLE_TASKS_LIST_ID?.trim();
      const listId = configured || lists.items?.[0]?.id;
      if (!listId) throw new Error("Google Tasks 中没有可用的任务清单。");
      const tasks = await listGoogleTasks(token, signal, listId);
      return { lists: lists.items || [], listId, tasks: tasks.tasks };
    });
    return NextResponse.json(response);
  } catch (error) {
    const result = googleErrorResponse(error, "Google Tasks 读取失败。");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
