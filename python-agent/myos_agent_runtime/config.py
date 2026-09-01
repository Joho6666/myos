from dataclasses import dataclass
from pathlib import Path
import os


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _loopback_host() -> str:
    host = _env("PYTHON_AGENT_HOST", "127.0.0.1")
    if host not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("PYTHON_AGENT_HOST must be a loopback address.")
    return host


def _port() -> int:
    value = int(_env("PYTHON_AGENT_PORT", "43200"))
    if value < 1 or value > 65535:
        raise ValueError("PYTHON_AGENT_PORT must be between 1 and 65535.")
    return value


@dataclass(frozen=True)
class RuntimeConfig:
    myos_url: str = "http://127.0.0.1:3002"
    myos_cli_token: str = ""
    runtime_token: str = ""
    host: str = "127.0.0.1"
    port: int = 43200
    request_timeout: float = 15.0
    allowlist_path: str = ""
    data_dir: str = ""

    def __post_init__(self) -> None:
        if self.host not in {"127.0.0.1", "localhost", "::1"}:
            raise ValueError("Python Agent Runtime must listen on a loopback address.")
        if self.port < 1 or self.port > 65535:
            raise ValueError("Python Agent Runtime port must be between 1 and 65535.")
        if self.request_timeout <= 0:
            raise ValueError("Python Agent Runtime timeout must be positive.")

    @classmethod
    def from_env(cls) -> "RuntimeConfig":
        return cls(
            myos_url=_env("MYOS_URL", "http://127.0.0.1:3002").rstrip("/"),
            myos_cli_token=_env("MYOS_CLI_TOKEN"),
            runtime_token=_env("MYOS_PYTHON_AGENT_TOKEN"),
            host=_loopback_host(),
            port=_port(),
            request_timeout=float(_env("PYTHON_AGENT_REQUEST_TIMEOUT", "15")),
            allowlist_path=_env("MYOS_AGENT_CONFIG"),
            data_dir=_env("PYTHON_AGENT_DATA_DIR"),
        )

    def resolved_allowlist_path(self) -> Path | None:
        if self.allowlist_path:
            return Path(self.allowlist_path)
        default = Path(__file__).resolve().parents[2] / "local-agent" / "agent.config.json"
        return default if default.is_file() else None

    def resolved_data_dir(self) -> Path:
        if self.data_dir:
            return Path(self.data_dir)
        return Path(__file__).resolve().parents[1] / "data" / "executions"

    @property
    def myos_configured(self) -> bool:
        return bool(self.myos_url and self.myos_cli_token)

    @property
    def runtime_configured(self) -> bool:
        return bool(self.runtime_token)
