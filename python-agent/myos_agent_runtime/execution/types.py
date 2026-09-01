from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

ExecutionStatus = Literal[
    "queued",
    "preparing",
    "running",
    "waiting_for_approval",
    "verifying",
    "completed",
    "failed",
    "cancelled",
]

PermissionProfile = Literal["safe", "standard", "advanced"]
ExecutionMode = Literal["manual", "adapter"]
LogStream = Literal["stdout", "stderr", "system"]


@dataclass(frozen=True)
class DetectionResult:
    id: str
    label: str
    installed: bool
    available: bool
    execution_mode: ExecutionMode
    version: str | None = None
    executable: str | None = None
    detail: str = ""


@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    detail: str = ""
    expected_actions: tuple[str, ...] = ()


@dataclass(frozen=True)
class AllowedProject:
    id: str
    name: str
    path: str


@dataclass
class ExecutionLog:
    seq: int
    stream: LogStream
    text: str
    created_at: str


@dataclass
class GitSnapshot:
    head: str | None
    dirty: bool
    status: str
    files: list[str] = field(default_factory=list)


@dataclass
class DiffSummary:
    files_changed: int = 0
    additions: int = 0
    deletions: int = 0
    files: list[str] = field(default_factory=list)
    patch: str = ""
    high_risk: list[str] = field(default_factory=list)


@dataclass
class VerificationResult:
    name: str
    command: list[str]
    ok: bool
    exit_code: int | None = None
    output: str = ""


@dataclass
class ExecutionInput:
    execution_id: str
    work_item_id: str
    project_id: str
    project_name: str
    agent_id: str
    title: str
    instructions: str
    working_directory: str
    permission_profile: PermissionProfile = "standard"
    max_runtime_seconds: int = 1800
    auto_retry: int = 2
    verification: dict[str, list[str]] = field(default_factory=dict)
    allow_network: bool = False
    allow_install: bool = True
    allow_tests: bool = True
    allow_git: bool = True
    context: str = ""


@dataclass
class ExecutionRecord:
    id: str
    work_item_id: str
    project_id: str
    project_name: str
    agent_id: str
    title: str
    instructions: str
    working_directory: str
    permission_profile: PermissionProfile
    status: ExecutionStatus
    phase: str
    created_at: str
    updated_at: str
    started_at: str | None = None
    finished_at: str | None = None
    pid: int | None = None
    exit_code: int | None = None
    error: str | None = None
    current_file: str | None = None
    latest_action: str | None = None
    retry_count: int = 0
    max_retries: int = 2
    snapshot: GitSnapshot | None = None
    diff: DiffSummary | None = None
    verification: list[VerificationResult] = field(default_factory=list)
    report: dict[str, Any] | None = None
    approval: dict[str, Any] | None = None
    accepted: bool | None = None

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "workItemId": self.work_item_id,
            "projectId": self.project_id,
            "projectName": self.project_name,
            "agentId": self.agent_id,
            "title": self.title,
            "instructions": self.instructions,
            "workingDirectory": self.working_directory,
            "permissionProfile": self.permission_profile,
            "status": self.status.upper(),
            "phase": self.phase,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "startedAt": self.started_at,
            "finishedAt": self.finished_at,
            "pid": self.pid,
            "exitCode": self.exit_code,
            "error": self.error,
            "currentFile": self.current_file,
            "latestAction": self.latest_action,
            "retryCount": self.retry_count,
            "maxRetries": self.max_retries,
            "snapshot": None
            if self.snapshot is None
            else {
                "head": self.snapshot.head,
                "dirty": self.snapshot.dirty,
                "status": self.snapshot.status,
                "files": self.snapshot.files,
            },
            "diff": None
            if self.diff is None
            else {
                "filesChanged": self.diff.files_changed,
                "additions": self.diff.additions,
                "deletions": self.diff.deletions,
                "files": self.diff.files,
                "patch": self.diff.patch,
                "highRisk": self.diff.high_risk,
            },
            "verification": [
                {
                    "name": item.name,
                    "command": item.command,
                    "ok": item.ok,
                    "exitCode": item.exit_code,
                    "output": item.output[-8000:],
                }
                for item in self.verification
            ],
            "report": self.report,
            "approval": self.approval,
            "accepted": self.accepted,
        }
