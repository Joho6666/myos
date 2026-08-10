import { Bot, Braces, ClipboardCheck, Code2, Github, Workflow } from "lucide-react";

export const agentRegistry = [
  { id: "codex", name: "Codex CLI", description: "实现功能、修改仓库、运行验证。", icon: Code2, cli: "codex" },
  { id: "claude-code", name: "Claude Code", description: "架构分析、代码审查与协作开发。", icon: ClipboardCheck, cli: "claude" },
  { id: "opencode", name: "OpenCode", description: "本地终端型编码 Agent。", icon: Braces, cli: "opencode" },
  { id: "copilot", name: "GitHub Copilot CLI", description: "GitHub Copilot 的本机终端 Agent。", icon: Github, cli: "copilot" },
  { id: "hermes", name: "Hermes", description: "自定义 Agent 适配入口。", icon: Bot, cli: "hermes" },
  { id: "openclaw", name: "OpenClaw", description: "自动化与多 Agent 协作入口。", icon: Workflow, cli: "openclaw" }
] as const;

export type KnownAgentId = (typeof agentRegistry)[number]["id"];

export function getAgent(agentId: string) {
  return agentRegistry.find((agent) => agent.id === agentId);
}
