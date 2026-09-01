from __future__ import annotations

import re

from .types import ExecutionInput, PermissionProfile, ValidationResult

HIGH_RISK_PATTERNS = (
    (r"\bgit\s+push\b", "git push"),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard"),
    (r"\bforce\s+push\b|\b--force\b", "force push"),
    (r"\bnpm\s+publish\b|\bpnpm\s+publish\b", "publish"),
    (r"\bdeploy\b|\bvercel\s+deploy\b|\bcap\s+deploy\b", "deploy"),
    (r"\bdrop\s+table\b|\bmigrate\b", "database migration"),
    (r"\brm\s+-rf\b|\bdel\s+/[sf]\b", "destructive delete"),
    (r"\bnpm\s+install\s+-g\b|\bpnpm\s+add\s+-g\b", "global dependency install"),
)

LOCKED_PATH_HINTS = (
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    ".env",
    "supabase/migrations",
)

PROFILE_DEFAULTS: dict[PermissionProfile, dict[str, bool]] = {
    "safe": {"allow_network": False, "allow_install": False, "allow_tests": True, "allow_git": False},
    "standard": {"allow_network": False, "allow_install": True, "allow_tests": True, "allow_git": True},
    "advanced": {"allow_network": True, "allow_install": True, "allow_tests": True, "allow_git": True},
}


def expected_actions(profile: PermissionProfile) -> tuple[str, ...]:
    if profile == "safe":
        return ("读取项目", "修改 allowlist 内文件", "运行检查")
    if profile == "advanced":
        return ("修改项目", "安装依赖", "运行测试", "Git 操作", "有限网络")
    return ("修改项目", "安装依赖", "运行 typecheck/lint/test", "查看 git diff/status")


def scan_prompt_risks(text: str) -> list[str]:
    hits: list[str] = []
    lowered = text.lower()
    for pattern, label in HIGH_RISK_PATTERNS:
        if re.search(pattern, lowered, flags=re.IGNORECASE):
            hits.append(label)
    for hint in LOCKED_PATH_HINTS:
        if hint.lower() in lowered:
            hits.append(hint)
    return list(dict.fromkeys(hits))


def validate_execution(input: ExecutionInput) -> ValidationResult:
    if input.max_runtime_seconds < 30 or input.max_runtime_seconds > 4 * 60 * 60:
        return ValidationResult(False, "最大运行时间必须在 30 秒到 4 小时之间。")
    if input.permission_profile not in PROFILE_DEFAULTS:
        return ValidationResult(False, "未知权限档位。")
    risks = scan_prompt_risks(f"{input.title}\n{input.instructions}")
    expected = expected_actions(input.permission_profile)
    if risks and input.permission_profile == "safe":
        return ValidationResult(False, f"Safe 模式拒绝高风险请求：{', '.join(risks)}。", expected)
    return ValidationResult(True, "权限检查通过。", expected)


def high_risk_from_files(files: list[str]) -> list[str]:
    hits: list[str] = []
    for path in files:
        lowered = path.replace("\\", "/").lower()
        if any(hint in lowered for hint in ("package-lock.json", "pnpm-lock.yaml", "yarn.lock")):
            hits.append("lockfile")
        if lowered.endswith(".env") or "/.env." in lowered:
            hits.append("environment file")
        if "supabase/migrations" in lowered or "/migrations/" in lowered:
            hits.append("database migration")
        if lowered.endswith(".sql") and "migration" in lowered:
            hits.append("database migration")
    return list(dict.fromkeys(hits))
