from typing import Any

from .client import MyOSClient, latest_matching_work_item
from .models import (
    AgentId,
    AgentRuntimeTarget,
    CreateJobRequest,
    HeartbeatRequest,
    JobResponse,
    ReportRequest,
)


AGENT_TARGETS: tuple[AgentRuntimeTarget, ...] = (
    AgentRuntimeTarget(
        id="codex",
        label="Codex CLI",
        executionMode="manual",
        detail="Registered target. Phase 1 records context and evidence; execution adapter is not enabled.",
    ),
    AgentRuntimeTarget(
        id="claude-code",
        label="Claude Code",
        executionMode="manual",
        detail="Registered target. Use the project brief and report progress through this runtime.",
    ),
    AgentRuntimeTarget(
        id="opencode",
        label="OpenCode",
        executionMode="manual",
        detail="Registered target. Execution remains allow-list based and disabled in Phase 1.",
    ),
    AgentRuntimeTarget(
        id="copilot",
        label="GitHub Copilot CLI",
        executionMode="manual",
        detail="Registered target. Authenticate locally with Copilot CLI; MyOS does not read or store its local credential.",
    ),
    AgentRuntimeTarget(
        id="hermes",
        label="Hermes",
        executionMode="manual",
        detail="Registered target. Execution adapter will be added only after its CLI contract is verified.",
    ),
    AgentRuntimeTarget(
        id="openclaw",
        label="OpenClaw",
        executionMode="manual",
        detail="Registered target. No local process is launched by the runtime.",
    ),
)


class RuntimeService:
    def __init__(self, client: MyOSClient):
        self.client = client

    def runtime_info(self) -> dict[str, Any]:
        return {
            "name": "MyOS Python Agent Runtime",
            "version": "0.1.0",
            "executionPolicy": "no-arbitrary-shell",
            "agents": [target.model_dump(by_alias=True) for target in AGENT_TARGETS],
        }

    async def create_job(self, request: CreateJobRequest) -> JobResponse:
        brief = await self.client.get_brief(request.project_id)
        project = brief.get("project")
        if not project:
            raise ValueError("Project was not found in MyOS.")

        response = await self.client.create_work(
            request.project_id,
            request.agent_id,
            request.title,
            request.instructions,
        )
        item = latest_matching_work_item(response, project.get("id", request.project_id), request.agent_id, request.title)
        return JobResponse(
            workItemId=item.get("id") if item else None,
            projectId=project.get("id", request.project_id),
            agentId=request.agent_id,
            status=item.get("status", "queued") if item else "queued",
            progress=int(item.get("progress", 0)) if item else 0,
            message="Work item created in MyOS. Execution remains manual in Phase 1.",
            executionMode="manual",
        )

    async def heartbeat(self, work_item_id: str, request: HeartbeatRequest) -> JobResponse:
        response = await self.client.update_work(
            {
                "id": work_item_id,
                "status": request.status,
                "progress": request.progress,
                "blockedReason": request.blocked_reason,
                "eventMessage": request.message,
            }
        )
        item = _find_item(response, work_item_id)
        return JobResponse(
            workItemId=work_item_id,
            projectId=request.project_id,
            agentId=request.agent_id,
            status=item.get("status", request.status) if item else request.status,
            progress=int(item.get("progress", request.progress)) if item else request.progress,
            message=request.message,
            executionMode="manual",
        )

    async def report(self, work_item_id: str, request: ReportRequest) -> dict[str, Any]:
        payload = request.model_dump(by_alias=True, exclude_none=True)
        payload["workItemId"] = work_item_id
        await self.client.report(payload)
        return {
            "ok": True,
            "workItemId": work_item_id,
            "projectId": request.project_id,
            "agentId": request.agent_id,
            "progress": request.progress,
            "message": "Agent report saved in MyOS.",
            "executionMode": "manual",
        }


def _find_item(response: dict[str, Any], work_item_id: str) -> dict[str, Any] | None:
    items = response.get("agentWorkItems") or response.get("workItems") or []
    return next((item for item in items if item.get("id") == work_item_id), None)
