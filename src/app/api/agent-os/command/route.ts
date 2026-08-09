import { NextResponse } from "next/server";
import { getOwnerEmail, type MyOSSession } from "@/lib/auth/session";
import { applyMyOSActionToRepository, readMyOSData } from "@/server/data/repository";
import { myOSActionSchema } from "@/server/data/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const token = process.env.MYOS_CLI_TOKEN?.trim();
  return Boolean(token) && request.headers.get("authorization") === `Bearer ${token}`;
}

function trustedCliSession(): MyOSSession {
  return { email: getOwnerEmail(), mode: process.env.OWNER_EMAIL ? "configured-owner" : "local-demo" };
}

function projectBrief(data: Awaited<ReturnType<typeof readMyOSData>>, projectId: string) {
  const project = data.projects.find((item) => item.id === projectId || item.name.toLowerCase() === projectId.toLowerCase());
  if (!project) return null;
  return {
    project,
    assignments: data.agentAssignments.filter((item) => item.projectId === project.id),
    milestones: data.projectMilestones.filter((item) => item.projectId === project.id),
    risks: data.projectRisks.filter((item) => item.projectId === project.id && item.status === "open"),
    workItems: data.agentWorkItems.filter((item) => item.projectId === project.id),
    reports: data.agentReports.filter((item) => item.projectId === project.id).slice(0, 20),
    executionEvents: data.agentWorkEvents.filter((item) => item.projectId === project.id).slice(0, 30),
    tasks: data.tasks.filter((item) => item.project === project.name)
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Agent CLI 认证失败。" }, { status: 401 });
  try {
    const data = await readMyOSData(trustedCliSession());
    const projectId = new URL(request.url).searchParams.get("project")?.trim();

    if (!projectId) {
      return NextResponse.json({ projects: data.projects.map((project) => ({ id: project.id, name: project.name, status: project.status, nextAction: project.nextAction, techStack: project.techStack ?? [] })) });
    }

    const brief = projectBrief(data, projectId);
    return brief ? NextResponse.json(brief) : NextResponse.json({ error: "项目不存在。" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取 Agent 项目上下文失败。" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Agent CLI 认证失败。" }, { status: 401 });
  const parsed = myOSActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Agent 请求格式不正确。" }, { status: 400 });

  const allowed = new Set(["addAgentWorkItem", "updateAgentWorkItem", "addAgentReport"]);
  if (!allowed.has(parsed.data.type)) return NextResponse.json({ error: "CLI 暂不允许这个操作。" }, { status: 403 });

  try {
    const data = await applyMyOSActionToRepository(trustedCliSession(), parsed.data);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent 操作失败。" }, { status: 502 });
  }
}
