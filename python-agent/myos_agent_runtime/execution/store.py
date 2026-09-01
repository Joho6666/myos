from __future__ import annotations

import json
import threading
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .types import DiffSummary, ExecutionLog, ExecutionRecord, GitSnapshot, VerificationResult


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ExecutionStore:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def _dir(self, execution_id: str) -> Path:
        path = self.root / execution_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def save(self, record: ExecutionRecord) -> None:
        payload = asdict(record)
        with self._lock:
            (self._dir(record.id) / "record.json").write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    def load(self, execution_id: str) -> ExecutionRecord | None:
        path = self.root / execution_id / "record.json"
        if not path.is_file():
            return None
        raw = json.loads(path.read_text(encoding="utf-8"))
        return _record_from_dict(raw)

    def list_all(self) -> list[ExecutionRecord]:
        records: list[ExecutionRecord] = []
        if not self.root.exists():
            return records
        for child in self.root.iterdir():
            if child.is_dir():
                record = self.load(child.name)
                if record:
                    records.append(record)
        records.sort(key=lambda item: item.updated_at, reverse=True)
        return records

    def append_log(self, execution_id: str, stream: str, text: str) -> ExecutionLog:
        with self._lock:
            path = self._dir(execution_id) / "logs.jsonl"
            seq = 0
            if path.is_file():
                with path.open("r", encoding="utf-8") as handle:
                    seq = sum(1 for _ in handle)
            log = ExecutionLog(seq=seq, stream=stream, text=text[:8000], created_at=utc_now())  # type: ignore[arg-type]
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(asdict(log), ensure_ascii=False) + "\n")
            return log

    def logs(self, execution_id: str, after: int = -1) -> list[ExecutionLog]:
        path = self.root / execution_id / "logs.jsonl"
        if not path.is_file():
            return []
        items: list[ExecutionLog] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            raw = json.loads(line)
            if int(raw.get("seq", 0)) > after:
                items.append(
                    ExecutionLog(
                        seq=int(raw["seq"]),
                        stream=raw["stream"],
                        text=raw["text"],
                        created_at=raw["created_at"],
                    )
                )
        return items

    def save_pid(self, execution_id: str, pid: int | None) -> None:
        path = self._dir(execution_id) / "pid"
        if pid is None:
            if path.exists():
                path.unlink()
            return
        path.write_text(str(pid), encoding="utf-8")


def _record_from_dict(raw: dict[str, Any]) -> ExecutionRecord:
    snapshot = raw.get("snapshot")
    diff = raw.get("diff")
    verification = raw.get("verification") or []
    return ExecutionRecord(
        id=raw["id"],
        work_item_id=raw["work_item_id"],
        project_id=raw["project_id"],
        project_name=raw.get("project_name", ""),
        agent_id=raw["agent_id"],
        title=raw.get("title", ""),
        instructions=raw.get("instructions", ""),
        working_directory=raw["working_directory"],
        permission_profile=raw.get("permission_profile", "standard"),
        status=raw.get("status", "queued"),
        phase=raw.get("phase", "queued"),
        created_at=raw.get("created_at", utc_now()),
        updated_at=raw.get("updated_at", utc_now()),
        started_at=raw.get("started_at"),
        finished_at=raw.get("finished_at"),
        pid=raw.get("pid"),
        exit_code=raw.get("exit_code"),
        error=raw.get("error"),
        current_file=raw.get("current_file"),
        latest_action=raw.get("latest_action"),
        retry_count=int(raw.get("retry_count") or 0),
        max_retries=int(raw.get("max_retries") or 2),
        snapshot=None
        if not snapshot
        else GitSnapshot(
            head=snapshot.get("head"),
            dirty=bool(snapshot.get("dirty")),
            status=snapshot.get("status") or "",
            files=list(snapshot.get("files") or []),
        ),
        diff=None
        if not diff
        else DiffSummary(
            files_changed=int(diff.get("files_changed") or 0),
            additions=int(diff.get("additions") or 0),
            deletions=int(diff.get("deletions") or 0),
            files=list(diff.get("files") or []),
            patch=diff.get("patch") or "",
            high_risk=list(diff.get("high_risk") or []),
        ),
        verification=[
            VerificationResult(
                name=item.get("name", "check"),
                command=list(item.get("command") or []),
                ok=bool(item.get("ok")),
                exit_code=item.get("exit_code"),
                output=item.get("output") or "",
            )
            for item in verification
            if isinstance(item, dict)
        ],
        report=raw.get("report"),
        approval=raw.get("approval"),
        accepted=raw.get("accepted"),
    )
