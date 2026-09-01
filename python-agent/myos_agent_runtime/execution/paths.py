from __future__ import annotations

from pathlib import Path

from .types import AllowedProject


class PathPolicyError(ValueError):
    pass


def load_allowed_projects(config_path: Path | None) -> list[AllowedProject]:
    if config_path is None or not config_path.is_file():
        return []
    import json

    raw = json.loads(config_path.read_text(encoding="utf-8"))
    projects = raw.get("allowedProjects") if isinstance(raw, dict) else []
    if not isinstance(projects, list):
        return []
    allowed: list[AllowedProject] = []
    for item in projects:
        if not isinstance(item, dict):
            continue
        project_id = str(item.get("id") or "").strip()
        path = str(item.get("path") or "").strip()
        name = str(item.get("name") or project_id).strip()
        if project_id and path:
            allowed.append(AllowedProject(id=project_id, name=name, path=path))
    return allowed


def normalize_existing_path(value: str) -> Path:
    candidate = Path(value).expanduser()
    try:
        return candidate.resolve(strict=True)
    except FileNotFoundError as error:
        raise PathPolicyError("工作目录不存在。") from error


def is_within(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def resolve_allowed_project(
    project_id: str,
    requested_path: str | None,
    allowed: list[AllowedProject],
) -> tuple[AllowedProject, Path]:
    match = next((item for item in allowed if item.id == project_id), None)
    if match is None:
        raise PathPolicyError("项目不在本地 allowlist 中，拒绝执行。")
    allowed_root = normalize_existing_path(match.path)
    working = normalize_existing_path(requested_path or match.path)
    if working != allowed_root and not is_within(working, allowed_root):
        raise PathPolicyError("拒绝在 allowlist 以外的目录执行。")
    return match, working
