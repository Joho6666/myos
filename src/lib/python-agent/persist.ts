import type { MyOSSession } from "@/lib/auth/session";
import type { AgentExecution } from "@/lib/data/models";
import { applyMyOSActionToRepository } from "@/server/data/repository";

export async function persistExecution(session: MyOSSession, execution: AgentExecution) {
  try {
    await applyMyOSActionToRepository(session, {
      type: "upsertAgentExecution",
      payload: {
        id: execution.id,
        workItemId: execution.workItemId,
        projectId: execution.projectId,
        projectName: execution.projectName || "项目",
        agentId: execution.agentId as "codex" | "claude-code" | "opencode" | "copilot" | "hermes" | "openclaw",
        title: execution.title || "Agent 执行",
        instructions: execution.instructions || "",
        workingDirectory: execution.workingDirectory || "",
        permissionProfile: execution.permissionProfile,
        status: execution.status,
        phase: execution.phase,
        error: execution.error,
        latestAction: execution.latestAction,
        retryCount: execution.retryCount,
        filesChanged: execution.diff?.filesChanged,
        additions: execution.diff?.additions,
        deletions: execution.diff?.deletions,
        accepted: execution.accepted
      }
    });
  } catch {
    // Runtime 状态仍然有效；本地记录失败不应阻断执行中心。
  }
}
