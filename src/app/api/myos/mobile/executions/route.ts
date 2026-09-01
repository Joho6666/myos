import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authenticate(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return { client, userId: data.user.id };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "云同步暂未配置。" }, { status: 503 });
  const context = await authenticate(request);
  if (!context) return NextResponse.json({ error: "同步登录已过期，请重新登录。" }, { status: 401 });
  const { data, error } = await context.client
    .from("agent_executions")
    .select("id,title,project_name,agent_id,status,phase,updated_at,error")
    .eq("user_id", context.userId)
    .order("updated_at", { ascending: false })
    .limit(40);
  if (error) return NextResponse.json({ error: `读取执行记录失败：${error.message}` }, { status: 500 });
  return NextResponse.json({
    executions: (data || []).map((row) => ({
      id: String(row.id),
      title: String(row.title || "执行"),
      projectName: String(row.project_name || ""),
      agentId: String(row.agent_id || ""),
      status: String(row.status || "queued"),
      phase: String(row.phase || row.status || "queued"),
      updatedAt: String(row.updated_at || ""),
      error: row.error ? String(row.error) : undefined
    })),
    approvalAvailable: false
  });
}
