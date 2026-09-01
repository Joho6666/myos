from __future__ import annotations

from .adapters import AgentExecutionAdapter, CodexAdapter, UnsupportedAdapter
from .types import DetectionResult


class AdapterRegistry:
    def __init__(self) -> None:
        self._detections: list[DetectionResult] | None = None
        self._adapters: dict[str, AgentExecutionAdapter] = {
            "codex": CodexAdapter(),
            "claude-code": UnsupportedAdapter(
                "claude-code",
                "Claude Code",
                "claude",
                "Claude Code 的非交互执行参数尚未核验，保持 registered / unsupported。",
            ),
            "opencode": UnsupportedAdapter(
                "opencode",
                "OpenCode",
                "opencode",
                "OpenCode 的非交互执行参数尚未核验，保持 registered / unsupported。",
            ),
            "copilot": UnsupportedAdapter(
                "copilot",
                "GitHub Copilot CLI",
                "copilot",
                "Copilot CLI 执行适配器尚未启用。",
            ),
            "hermes": UnsupportedAdapter(
                "hermes",
                "Hermes",
                "hermes",
                "Hermes CLI 合同尚未核验，禁止虚构命令。",
            ),
            "openclaw": UnsupportedAdapter(
                "openclaw",
                "OpenClaw",
                "openclaw",
                "OpenClaw 执行适配器尚未启用。",
            ),
        }

    def register(self, adapter: AgentExecutionAdapter) -> None:
        self._adapters[adapter.id] = adapter
        self._detections = None

    def get(self, agent_id: str) -> AgentExecutionAdapter | None:
        return self._adapters.get(agent_id)

    def detect_all(self) -> list[DetectionResult]:
        if self._detections is None:
            self._detections = [adapter.detect() for adapter in self._adapters.values()]
        return self._detections
