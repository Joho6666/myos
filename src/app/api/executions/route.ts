import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerEmail, getSession } from "@/lib/auth/session";
import { chooseAgent, getPythonAgentStatus, listRuntimeExecutions, startRuntimeExecution } from "@/lib/python-agent/client";
import { persistExecution } from "@/lib/python-agent/persist";
import { getLocalAgentStatus } from "@/lib/local-agent/client";
import { applyMyOSActionToRepository, readMyOSData } from "@/server/data/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  agentId: z.enum(["auto", "codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]),
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(12000),
  permissionProfile: z.enum(["safe", "standard", "advanced"]).optional()
});

function sessionOrDemo() {
  return getSession().then((session) => session || { email: getOwnerEmail(), mode: "local-demo" as const });
}

export async function GET() {
  const session = await sessionOrDemo();
  if (!session) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const executions = await listRuntimeExecutions();
    return NextResponse.json({ executions });
  } catch (error) {
    const data = await readMyOSData(session);
    return NextResponse.json({
      executions: data.agentExecutions,
      warning: error instanceof Error ? error.message : "Runtime 不可用，已回退到本地执行记录。"
    });
  }
}

export async function POST(request: Request) {
  const session = await sessionOrDemo();
  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "执行请求格式不正确。", issues: parsed.error.issues }, { status: 400 });
  }

  const data = await readMyOSData(session);
  const project = data.projects.find((item) => item.id === parsed.data.projectId);
  if (!project) return NextResponse.json({ error: "项目不存在。" }, { status: 404 });

  const [runtime, localAgent] = await Promise.all([getPythonAgentStatus(), getLocalAgentStatus()]);
  if (!runtime.connected) {
    return NextResponse.json({ error: runtime.message || "Python Agent Runtime 未连接。" }, { status: 503 });
  }

  const routed = chooseAgent({
    requested: parsed.data.agentId,
    preferred: project.preferredAgent,
    fallback: project.fallbackAgent,
    agents: runtime.agents
  });
  if (!routed.available) {
    return NextResponse.json({ error: routed.reason }, { status: 409 });
  }

  const localProject = localAgent.projects.find((item) => item.id === project.id || item.name === project.name);
  const workingDirectory = localProject?.path || project.path;
  if (!localProject) {
    return NextResponse.json({ error: "项目不在本地 allowlist 中，拒绝执行。" }, { status: 403 });
  }

  const work = await applyMyOSActionToRepository(session, {
    type: "addAgentWorkItem",
    payload: {
      projectId: project.id,
      agentId: routed.agentId as "codex",
      title: parsed.data.title,
      instructions: parsed.data.instructions
    }
  });
  const workItem = work.agentWorkItems.find((item) => item.projectId === project.id && item.title === parsed.data.title);

  try {
    const execution = await startRuntimeExecution({
      projectId: project.id,
      agentId: routed.agentId,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      workItemId: workItem?.id,
      workingDirectory,
      permissionProfile: parsed.data.permissionProfile || project.permissionProfile || "standard",
      maxRuntimeSeconds: (project.maxRuntimeMinutes || 30) * 60,
      autoRetry: project.autoRetry ?? 2,
      verification: project.verification,
      context: [project.summary, project.techStack?.join(", ")].filter(Boolean).join("\n")
    });
    await persistExecution(session, execution);
    return NextResponse.json({ execution, workItemId: workItem?.id, routed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "启动执行失败。" }, { status: 502 });
  }
}
