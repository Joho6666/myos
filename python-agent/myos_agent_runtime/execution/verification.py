from __future__ import annotations

import re
from pathlib import Path

from .process import run_argv
from .types import VerificationResult

UNSAFE_TOKEN = re.compile(r"[;&|`$<>\n\r]|&&|\|\|")


def parse_command(value: str | list[str]) -> list[str]:
    if isinstance(value, list):
        argv = [str(item).strip() for item in value if str(item).strip()]
    else:
        text = value.strip()
        if not text:
            return []
        argv = text.split()
    if not argv:
        return []
    if any(UNSAFE_TOKEN.search(token) for token in argv):
        raise ValueError("验证命令包含不允许的 shell 元字符。")
    return argv


def run_verification(cwd: Path, commands: dict[str, str | list[str]]) -> list[VerificationResult]:
    results: list[VerificationResult] = []
    for name, raw in commands.items():
        argv = parse_command(raw)
        if not argv:
            continue
        code, stdout, stderr = run_argv(argv, cwd=cwd, timeout=600)
        output = (stdout + ("\n" + stderr if stderr else "")).strip()
        results.append(
            VerificationResult(
                name=name,
                command=argv,
                ok=code == 0,
                exit_code=code,
                output=output[-12000:],
            )
        )
    return results
