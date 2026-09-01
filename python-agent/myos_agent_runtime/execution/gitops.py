from __future__ import annotations

from pathlib import Path

from .process import run_argv
from .types import DiffSummary, GitSnapshot


def _git(cwd: Path, *args: str, timeout: float = 30) -> tuple[int, str, str]:
    return run_argv(["git", *args], cwd=cwd, timeout=timeout)


def capture_snapshot(cwd: Path) -> GitSnapshot:
    head_code, head_out, _ = _git(cwd, "rev-parse", "HEAD")
    status_code, status_out, status_err = _git(cwd, "status", "--porcelain")
    if status_code != 0 and "not a git repository" in (status_err + status_out).lower():
        return GitSnapshot(head=None, dirty=False, status="not a git repository", files=[])
    files = [line[3:] for line in status_out.splitlines() if line.strip()]
    return GitSnapshot(
        head=head_out.strip() if head_code == 0 else None,
        dirty=bool(files),
        status=status_out,
        files=files,
    )


def capture_diff(cwd: Path, before: GitSnapshot) -> DiffSummary:
    code, numstat, _ = _git(cwd, "diff", "--numstat")
    if code != 0:
        return DiffSummary()
    additions = 0
    deletions = 0
    files: list[str] = []
    for line in numstat.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        add, delete, name = parts[0], parts[1], parts[2]
        if add.isdigit():
            additions += int(add)
        if delete.isdigit():
            deletions += int(delete)
        if name not in before.files:
            files.append(name)
        elif name not in files:
            files.append(name)
    _, patch, _ = _git(cwd, "diff")
    return DiffSummary(
        files_changed=len(files),
        additions=additions,
        deletions=deletions,
        files=files,
        patch=patch,
    )


def save_pre_diff(cwd: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    _, patch, _ = _git(cwd, "diff")
    destination.write_text(patch, encoding="utf-8")


def rollback_agent_changes(cwd: Path, before: GitSnapshot, agent_patch: str) -> tuple[bool, str]:
    if not agent_patch.strip():
        return True, "没有可回滚的工作树改动。"
    if before.dirty:
        overlapping = [name for name in before.files if name in agent_patch]
        if overlapping:
            return False, "执行前工作区已有未提交改动，且与 Agent 改动重叠，拒绝回滚以免丢失用户内容。"
    patch_file = cwd / ".git" / "myos-agent-reverse.patch" if (cwd / ".git").exists() else cwd / "myos-agent-reverse.patch"
    try:
        patch_file.write_text(agent_patch, encoding="utf-8")
        check_code, _, check_err = _git(cwd, "apply", "--reverse", "--check", str(patch_file))
        if check_code != 0:
            return False, check_err.strip() or "无法安全反向应用本次 diff。"
        apply_code, _, apply_err = _git(cwd, "apply", "--reverse", str(patch_file))
        if apply_code != 0:
            return False, apply_err.strip() or "回滚失败。"
        return True, "已恢复本次 Agent 产生的工作树改动。"
    finally:
        if patch_file.exists() and patch_file.name.startswith("myos-agent"):
            try:
                patch_file.unlink()
            except OSError:
                pass
