from pathlib import Path
import sys

import uvicorn

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from myos_agent_runtime.app import create_app  # noqa: E402
from myos_agent_runtime.config import RuntimeConfig  # noqa: E402


if __name__ == "__main__":
    config = RuntimeConfig.from_env()
    uvicorn.run(
        create_app(config),
        host=config.host,
        port=config.port,
        log_level="info",
    )
