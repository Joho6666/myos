import { NextResponse } from "next/server";
import { authenticateQuickRequest } from "@/lib/auth/quick-token";
import { readMyOSData } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";
import { todayDateKey } from "@/server/data/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await authenticateQuickRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "鉴权失败。请提供有效的 Bearer Token (Authorization: Bearer <TOKEN>) 或 x-api-key 请求头。",
        hint: "请在服务端环境变量或 .env.local 中设置 MYOS_QUICK_API_TOKEN。"
      },
      { status: 401 }
    );
  }

  try {
    const data = await readMyOSData(session);
    const today = todayDateKey();

    // 1. Pending inbox items
    const pendingInbox = data.inbox.filter((item) => item.status === "pending");

    // 2. Today's incomplete tasks
    const activeTasks = data.tasks.filter((task) => {
      if (task.status === "completed" || task.status === "cancelled" || task.status === "archived") {
        return false;
      }
      return task.plannedDate === today || task.due === today || task.dueDate === today || task.todayFocus === true;
    });

    // 3. Active goals
    const activeGoals = data.goals.filter((g) => g.status === "active");

    return NextResponse.json({
      ok: true,
      today,
      user: session.email,
      inbox: {
        pendingCount: pendingInbox.length,
        recent: pendingInbox.slice(0, 3).map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          createdAt: item.createdAt
        }))
      },
      tasks: {
        todayTotal: activeTasks.length,
        todayList: activeTasks.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          project: t.project,
          todayFocus: t.todayFocus ?? false
        }))
      },
      goals: {
        activeCount: activeGoals.length,
        focusGoal: activeGoals[0]?.title || null
      },
      stats: {
        totalProjects: data.projects.filter((p) => p.status === "active").length,
        totalHabits: data.habits.filter((h) => h.status === "active").length
      }
    });
  } catch (error) {
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "读取 MyOS 数据失败。" }, { status: 500 });
  }
}
