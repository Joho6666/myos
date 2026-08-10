from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AgentId = Literal["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]
WorkStatus = Literal["queued", "in_progress", "blocked", "completed"]


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class CreateJobRequest(APIModel):
    project_id: str = Field(alias="projectId", min_length=1, max_length=200)
    agent_id: AgentId = Field(alias="agentId")
    title: str = Field(min_length=1, max_length=200)
    instructions: str = Field(default="", max_length=12000)


class HeartbeatRequest(APIModel):
    project_id: str = Field(alias="projectId", min_length=1, max_length=200)
    agent_id: AgentId = Field(alias="agentId")
    progress: int = Field(ge=0, le=100)
    message: str = Field(min_length=1, max_length=4000)
    status: WorkStatus = "in_progress"
    blocked_reason: str | None = Field(default=None, alias="blockedReason", max_length=4000)


class ReportRequest(APIModel):
    project_id: str = Field(alias="projectId", min_length=1, max_length=200)
    agent_id: AgentId = Field(alias="agentId")
    summary: str = Field(min_length=1, max_length=12000)
    progress: int = Field(ge=0, le=100)
    status: WorkStatus | None = None
    blocked_reason: str | None = Field(default=None, alias="blockedReason", max_length=4000)
    changed_files: list[str] | None = Field(default=None, alias="changedFiles", max_length=100)
    test_result: str | None = Field(default=None, alias="testResult", max_length=4000)
    artifact_url: str | None = Field(default=None, alias="artifactUrl", max_length=2000)


class AgentRuntimeTarget(APIModel):
    id: AgentId
    label: str
    registered: bool = True
    available: bool = False
    execution_mode: Literal["manual", "adapter"] = Field(alias="executionMode")
    detail: str


class JobResponse(APIModel):
    ok: bool = True
    work_item_id: str | None = Field(default=None, alias="workItemId")
    project_id: str = Field(alias="projectId")
    agent_id: AgentId = Field(alias="agentId")
    status: WorkStatus
    progress: int = Field(ge=0, le=100)
    message: str
    execution_mode: Literal["manual", "adapter"] = Field(alias="executionMode")
