from __future__ import annotations

from pathlib import Path
from typing import Protocol

from .process import ProcessError, which
from .types import DetectionResult, ExecutionInput, ValidationResult


class AgentExecutionAdapter(Protocol):
    id: str
    name: str

    def detect(self) -> DetectionResult: ...
    def validate(self, input: ExecutionInput) -> ValidationResult: ...
    def build_argv(self, input: ExecutionInput) -> list[str]: ...


def _detect_cli(agent_id: str, label: str, command: str, executable_hint: str) -> DetectionResult:
    executable = which(command)
    if not executable:
        return DetectionResult(
            id=agent_id,
            label=label,
            installed=False,
            available=False,
            execution_mode="manual",
            detail=f"{label} 未安装，或不在 PATH 中。",
        )
    from .process import run_argv

    try:
        code, stdout, stderr = run_argv([executable, "--version"], cwd=Path.cwd(), timeout=3)
    except ProcessError:
        return DetectionResult(
            id=agent_id,
            label=label,
            installed=True,
            available=False,
            execution_mode="manual",
            executable=executable,
            detail=f"{label} 在 PATH 中，但版本探测超时或失败。",
        )
    version = (stdout or stderr).strip().splitlines()[0] if code == 0 else None
    return DetectionResult(
        id=agent_id,
        label=label,
        installed=True,
        available=True,
        execution_mode="adapter",
        version=version,
        executable=executable,
        detail=f"{label} 可用。",
    )


class CodexAdapter:
    id = "codex"
    name = "Codex CLI"

    def detect(self) -> DetectionResult:
        result = _detect_cli(self.id, self.name, "codex", "codex")
        if result.installed:
            return DetectionResult(
                id=self.id,
                label=self.name,
                installed=True,
                available=True,
                execution_mode="adapter",
                version=result.version,
                executable=result.executable,
                detail="Codex CLI 已安装。MyOS 使用现有 CLI 登录态，不读取凭据。",
            )
        return result

    def validate(self, input: ExecutionInput) -> ValidationResult:
        detected = self.detect()
        if not detected.available or not detected.executable:
            return ValidationResult(False, detected.detail)
        return ValidationResult(True, "Codex 可执行。")

    def build_argv(self, input: ExecutionInput) -> list[str]:
        detected = self.detect()
        if not detected.executable:
            raise RuntimeError(detected.detail)
        sandbox = "workspace-write"
        if input.permission_profile == "safe":
            sandbox = "workspace-write"
        argv = [
            detected.executable,
            "exec",
            "--cd",
            input.working_directory,
            "--sandbox",
            sandbox,
            "--ask-for-approval",
            "never",
            "--skip-git-repo-check",
            "--color",
            "never",
        ]
        prompt = _compose_prompt(input)
        argv.append(prompt)
        return argv


class UnsupportedAdapter:
    def __init__(self, agent_id: str, name: str, command: str, reason: str):
        self.id = agent_id
        self.name = name
        self.command = command
        self.reason = reason

    def detect(self) -> DetectionResult:
        executable = which(self.command)
        if executable:
            from .process import run_argv

            version = None
            try:
                code, stdout, stderr = run_argv([executable, "--version"], cwd=Path.cwd(), timeout=3)
                if code == 0:
                    version = (stdout or stderr).strip().splitlines()[0] if (stdout or stderr).strip() else None
            except ProcessError:
                version = None
            return DetectionResult(
                id=self.id,
                label=self.name,
                installed=True,
                available=False,
                execution_mode="manual",
                version=version,
                executable=executable,
                detail=self.reason,
            )
        return DetectionResult(
            id=self.id,
            label=self.name,
            installed=False,
            available=False,
            execution_mode="manual",
            detail=f"{self.name} 未安装。{self.reason}",
        )

    def validate(self, input: ExecutionInput) -> ValidationResult:
        return ValidationResult(False, self.reason)

    def build_argv(self, input: ExecutionInput) -> list[str]:
        raise RuntimeError(self.reason)


def _compose_prompt(input: ExecutionInput) -> str:
    parts = [
        input.instructions.strip() or input.title,
        "",
        "Constraints:",
        "- Stay inside the current project working directory.",
        "- Do not modify unrelated files.",
        "- Do not change git remotes, force-push, or delete the repository.",
        "- Do not read or print secrets, tokens, or credential files.",
    ]
    if input.context:
        parts.extend(["", "Project context:", input.context[:12000]])
    return "\n".join(parts).strip()
