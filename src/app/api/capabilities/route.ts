import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readRuntimeConfig } from "@/lib/config/env-config";
import { getLocalAgentStatus } from "@/lib/local-agent/client";
import { getPythonAgentStatus } from "@/lib/python-agent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Skill = { id: string; name: string; category: string };

async function readSkills(directory: string, relative = "", depth = 0): Promise<Skill[]> {
  if (depth > 3) return [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const skills: Skill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    try {
      const childEntries = await readdir(child, { withFileTypes: true });
      if (childEntries.some((item) => item.isFile() && item.name === "SKILL.md")) {
        skills.push({ id: nextRelative, name: entry.name, category: relative || "常用" });
      }
    } catch { /* inaccessible skill folders are ignored */ }
    skills.push(...await readSkills(child, nextRelative, depth + 1));
    if (skills.length >= 160) break;
  }
  return skills;
}

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });

  const [configured, localAgent, pythonAgent] = await Promise.all([readRuntimeConfig(), getLocalAgentStatus(), getPythonAgentStatus()]);
  const fields = configured.filter((field) => ["database", "ai", "automation", "external"].includes(field.group)).map((field) => ({
    key: field.key, label: field.label, group: field.group, configured: field.configured, secret: field.secret, description: field.description
  }));
  const skillRoot = process.env.MYOS_SKILLS_ROOT || path.join(process.env.USERPROFILE || process.env.HOME || "", ".codex", "skills");
  const skills = await readSkills(skillRoot);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3002";
  const cliTokenConfigured = Boolean(process.env.MYOS_CLI_TOKEN);

  return NextResponse.json({
    skills,
    skillSourceAvailable: Boolean(skills.length),
    mcpServers: [{
      id: "myos-agent-os", name: "MyOS Agent MCP", status: cliTokenConfigured ? "ready" : "needs_config",
      detail: cliTokenConfigured ? "可读取项目并提交 Agent 工作项与汇报。" : "需要配置 MYOS_CLI_TOKEN 后再连接到 MCP 客户端。",
      config: JSON.stringify({ mcpServers: { myos: { command: "node", args: ["tools/myos-agent-mcp.mjs"], env: { MYOS_URL: appUrl, MYOS_CLI_TOKEN: "在 MCP 客户端安全配置" } } } }, null, 2)
    }],
    apiFields: fields,
    localAgent: {
      configured: localAgent.configured,
      connected: localAgent.connected,
      message: localAgent.message,
      projects: localAgent.projects.map((project) => ({ id: project.id, name: project.name }))
    },
    pythonAgent
  });
}
