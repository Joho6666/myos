import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { applyAgentMcpConfiguration, previewAgentMcpConfiguration } from "@/lib/local-agent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  agentId: z.enum(["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]),
  projectId: z.string().trim().min(1).max(200),
  confirmation: z.string().trim().max(80).optional()
});

async function requestBody(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new Error("配置请求格式不正确。");
  return parsed.data;
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const body = await requestBody(request);
    return NextResponse.json(await previewAgentMcpConfiguration(body.agentId, body.projectId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法预览本地配置。" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const body = await requestBody(request);
    return NextResponse.json(await applyAgentMcpConfiguration(body.agentId, body.projectId, body.confirmation || ""));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法写入本地配置。" }, { status: 400 });
  }
}
