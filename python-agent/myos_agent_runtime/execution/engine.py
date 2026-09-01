from __future__ import annotations

import asyncio
import threading
from collections import defaultdict
from pathlib import Path
from typing import Any

from .gitops import capture_diff, capture_snapshot, rollback_agent_changes
from .paths import PathPolicyError, load_allowed_projects, resolve_allowed_project
from .permissions import high_risk_from_files, scan_prompt_risks, validate_execution
from .process import ManagedProcess, pid_is_alive
from .registry import AdapterRegistry
from .store import ExecutionStore, utc_now
from .types import ExecutionInput, ExecutionLog, ExecutionRecord
from .verification import run_verification


class ExecutionEngine:
    def __init__(self, store: ExecutionStore, allowlist_path: Path | None, myos_client: Any | None = None):
        self.store = store
        self.allowlist_path = allowlist_path
        self.myos_client = myos_client
        self.registry = AdapterRegistry()
        self._processes: dict[str, ManagedProcess] = {}
        self._subscribers: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)
        self._lock = threading.Lock()
        self.recover_crashes()

    def recover_crashes(self) -> None:
        for record in self.store.list_all():
            if record.status in {"running", "preparing", "verifying"} and not pid_is_alive(record.pid):
                record.status = "failed"
                record.phase = "failed"
                record.error = "Runtime 重启后发现进程已退出（crash recovery）。"
                record.finished_at = utc_now()
                record.updated_at = utc_now()
                record.pid = None
                self.store.save(record)
                self.store.save_pid(record.id, None)

    def runtime_agents(self) -> list[dict[str, Any]]:
        agents = []
        for detection in self.registry.detect_all():
            agents.append(
                {
                    "id": detection.id,
                    "label": detection.label,
                    "registered": True,
                    "installed": detection.installed,
                    "available": detection.available,
                    "executionMode": detection.execution_mode,
                    "version": detection.version,
                    "detail": detection.detail,
                }
            )
        return agents

    def list_executions(self) -> list[dict[str, Any]]:
        return [record.to_public_dict() for record in self.store.list_all()]

    def get(self, execution_id: str) -> ExecutionRecord | None:
        return self.store.load(execution_id)

    def logs(self, execution_id: str, after: int = -1) -> list[ExecutionLog]:
        return self.store.logs(execution_id, after)

    def start(self, input: ExecutionInput) -> ExecutionRecord:
        allowed = load_allowed_projects(self.allowlist_path)
        try:
            project, working = resolve_allowed_project(input.project_id, input.working_directory, allowed)
        except PathPolicyError as error:
            raise ValueError(str(error)) from error
        input.working_directory = str(working)
        input.project_name = project.name or input.project_name

        adapter = self.registry.get(input.agent_id)
        if adapter is None:
            raise ValueError("未知 Agent。")
        detected = adapter.detect()
        if not detected.available or detected.execution_mode != "adapter":
            raise ValueError(detected.detail or "该 Agent 当前不可执行。")
        permission = validate_execution(input)
        if not permission.ok:
            raise ValueError(permission.detail)
        adapter_ok = adapter.validate(input)
        if not adapter_ok.ok:
            raise ValueError(adapter_ok.detail)

        now = utc_now()
        record = ExecutionRecord(
            id=input.execution_id,
            work_item_id=input.work_item_id,
            project_id=input.project_id,
            project_name=input.project_name,
            agent_id=input.agent_id,
            title=input.title,
            instructions=input.instructions,
            working_directory=str(working),
            permission_profile=input.permission_profile,
            status="preparing",
            phase="preparing",
            created_at=now,
            updated_at=now,
            max_retries=max(0, min(input.auto_retry, 3)),
        )
        prompt_risks = scan_prompt_risks(f"{input.title}\n{input.instructions}")
        if prompt_risks and input.permission_profile != "advanced":
            record.status = "waiting_for_approval"
            record.phase = "waiting_for_approval"
            record.approval = {
                "reason": "任务文本包含高风险操作。",
                "risks": prompt_risks,
                "decision": None,
            }
            self.store.save(record)
            self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
            return record

        self.store.save(record)
        threading.Thread(target=self._run, args=(record.id, input), daemon=True).start()
        return record

    def approve(self, execution_id: str, decision: str) -> ExecutionRecord:
        record = self._require(execution_id)
        if record.status != "waiting_for_approval":
            raise ValueError("当前执行不在等待审批状态。")
        record.approval = {**(record.approval or {}), "decision": decision}
        if decision == "deny":
            record.status = "cancelled"
            record.phase = "cancelled"
            record.finished_at = utc_now()
            record.updated_at = utc_now()
            self.store.save(record)
            self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
            return record
        input = self._input_from_record(record)
        if record.diff is not None:
            record.status = "verifying"
            record.phase = "verifying"
            record.updated_at = utc_now()
            self.store.save(record)
            threading.Thread(target=self._verify_and_finish, args=(record, input), daemon=True).start()
            return record
        record.status = "preparing"
        record.phase = "preparing"
        record.updated_at = utc_now()
        self.store.save(record)
        threading.Thread(target=self._run, args=(record.id, input), daemon=True).start()
        return record

    def stop(self, execution_id: str) -> ExecutionRecord:
        record = self._require(execution_id)
        process = self._processes.get(execution_id)
        if process:
            process.stop()
        record.status = "cancelled"
        record.phase = "cancelled"
        record.finished_at = utc_now()
        record.updated_at = utc_now()
        record.pid = None
        self.store.save(record)
        self.store.save_pid(execution_id, None)
        self._emit(execution_id, {"type": "status", "execution": record.to_public_dict()})
        return record

    def accept(self, execution_id: str) -> ExecutionRecord:
        record = self._require(execution_id)
        if record.status != "completed":
            raise ValueError("只能验收已完成的执行。")
        record.accepted = True
        record.updated_at = utc_now()
        self.store.save(record)
        return record

    def rollback(self, execution_id: str) -> ExecutionRecord:
        record = self._require(execution_id)
        if record.diff is None or record.snapshot is None:
            raise ValueError("没有可回滚的快照。")
        ok, detail = rollback_agent_changes(Path(record.working_directory), record.snapshot, record.diff.patch)
        if not ok:
            raise ValueError(detail)
        record.accepted = False
        record.latest_action = detail
        record.updated_at = utc_now()
        self.store.save(record)
        self._log(record, "system", detail)
        return record

    def subscribe(self, execution_id: str) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._subscribers[execution_id].append(queue)
        record = self.store.load(execution_id)
        if record:
            queue.put_nowait({"type": "status", "execution": record.to_public_dict()})
        return queue

    def unsubscribe(self, execution_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        listeners = self._subscribers.get(execution_id) or []
        if queue in listeners:
            listeners.remove(queue)

    def _require(self, execution_id: str) -> ExecutionRecord:
        record = self.store.load(execution_id)
        if record is None:
            raise ValueError("执行记录不存在。")
        return record

    def _input_from_record(self, record: ExecutionRecord) -> ExecutionInput:
        return ExecutionInput(
            execution_id=record.id,
            work_item_id=record.work_item_id,
            project_id=record.project_id,
            project_name=record.project_name,
            agent_id=record.agent_id,
            title=record.title,
            instructions=record.instructions,
            working_directory=record.working_directory,
            permission_profile=record.permission_profile,
            auto_retry=record.max_retries,
        )

    def _run(self, execution_id: str, input: ExecutionInput) -> None:
        record = self._require(execution_id)
        try:
            self._sync_myos(record, status="in_progress", progress=5, message="正在准备执行环境。")
            cwd = Path(input.working_directory)
            agents_md = cwd / "AGENTS.md"
            if agents_md.is_file() and not input.context:
                input.context = agents_md.read_text(encoding="utf-8")[:12000]
            record.snapshot = capture_snapshot(cwd)
            if record.snapshot.dirty:
                self._log(record, "system", "警告：执行前工作区已有未提交改动。Rollback 将避开这些文件。")
            adapter = self.registry.get(input.agent_id)
            if adapter is None:
                raise RuntimeError("未知 Agent。")
            argv = adapter.build_argv(input)
            self._log(record, "system", "启动 " + " ".join(argv[:6]) + " …")
            record.status = "running"
            record.phase = "running"
            record.started_at = utc_now()
            record.updated_at = utc_now()
            self.store.save(record)
            self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})

            def on_log(stream: str, text: str) -> None:
                self._log(record, stream, text)
                if stream == "stdout":
                    record.latest_action = text[:240]
                    record.updated_at = utc_now()
                    self.store.save(record)

            process = ManagedProcess(argv=argv, cwd=cwd, timeout_seconds=input.max_runtime_seconds, on_log=on_log)
            with self._lock:
                self._processes[execution_id] = process
            pid = process.start()
            record.pid = pid
            self.store.save_pid(execution_id, pid)
            self.store.save(record)
            self._sync_myos(record, status="in_progress", progress=35, message="Agent 正在运行。")
            exit_code = process.wait()
            record.exit_code = exit_code
            record.pid = None
            self.store.save_pid(execution_id, None)
            if process.cancelled and record.status == "cancelled":
                return
            if process.timed_out:
                raise RuntimeError("执行超时。")
            if exit_code != 0:
                raise RuntimeError(f"Agent 以退出码 {exit_code} 结束。")

            record.diff = capture_diff(cwd, record.snapshot)
            record.diff.high_risk = high_risk_from_files(record.diff.files)
            if record.diff.high_risk and (record.approval or {}).get("decision") != "always":
                record.status = "waiting_for_approval"
                record.phase = "waiting_for_approval"
                record.approval = {
                    "reason": "检测到高风险文件变更。",
                    "risks": record.diff.high_risk,
                    "decision": None,
                }
                record.updated_at = utc_now()
                self.store.save(record)
                self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
                self._sync_myos(record, status="blocked", progress=70, message="等待批准高风险变更。")
                return

            self._verify_and_finish(record, input)
        except Exception as error:
            record.status = "failed"
            record.phase = "failed"
            record.error = str(error)
            record.finished_at = utc_now()
            record.updated_at = utc_now()
            self.store.save(record)
            self._log(record, "system", record.error)
            self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
            self._sync_myos(record, status="blocked", progress=record.retry_count * 10, message=str(error))
            self._write_report(record, success=False)
        finally:
            with self._lock:
                self._processes.pop(execution_id, None)

    def continue_after_approval(self, execution_id: str) -> ExecutionRecord:
        record = self._require(execution_id)
        input = self._input_from_record(record)
        if record.diff is not None:
            threading.Thread(target=self._verify_and_finish, args=(record, input), daemon=True).start()
            return record
        return self.approve(execution_id, "once")

    def _verify_and_finish(self, record: ExecutionRecord, input: ExecutionInput) -> None:
        cwd = Path(record.working_directory)
        while True:
            record.status = "verifying"
            record.phase = "verifying"
            record.updated_at = utc_now()
            self.store.save(record)
            self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
            commands = input.verification or {}
            if not commands:
                break
            results = run_verification(cwd, commands)
            record.verification = results
            failed = [item for item in results if not item.ok]
            if not failed:
                break
            if record.retry_count >= record.max_retries:
                record.status = "failed"
                record.phase = "failed"
                record.error = "验证失败，已达到最大自动修复次数。"
                record.finished_at = utc_now()
                record.updated_at = utc_now()
                self.store.save(record)
                self._write_report(record, success=False)
                self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
                return
            record.retry_count += 1
            stderr = "\n\n".join(f"{item.name}: {item.output[-4000:]}" for item in failed)
            input.instructions = (
                "Verification failed. Fix these problems without changing unrelated code.\n\n" + stderr
            )
            self._log(record, "system", f"验证失败，交回 Agent 修复（{record.retry_count}/{record.max_retries}）。")
            adapter = self.registry.get(record.agent_id)
            if adapter is None:
                raise RuntimeError("未知 Agent。")
            argv = adapter.build_argv(input)
            process = ManagedProcess(
                argv=argv,
                cwd=cwd,
                timeout_seconds=input.max_runtime_seconds,
                on_log=lambda stream, text: self._log(record, stream, text),
            )
            record.status = "running"
            record.phase = "running"
            self.store.save(record)
            with self._lock:
                self._processes[record.id] = process
            record.pid = process.start()
            self.store.save_pid(record.id, record.pid)
            exit_code = process.wait()
            record.pid = None
            self.store.save_pid(record.id, None)
            if exit_code != 0:
                record.status = "failed"
                record.phase = "failed"
                record.exit_code = exit_code
                record.error = f"修复轮次失败，退出码 {exit_code}。"
                record.finished_at = utc_now()
                self.store.save(record)
                self._write_report(record, success=False)
                self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
                return
            if record.snapshot is not None:
                record.diff = capture_diff(cwd, record.snapshot)

        record.status = "completed"
        record.phase = "completed"
        record.finished_at = utc_now()
        record.updated_at = utc_now()
        self.store.save(record)
        self._write_report(record, success=True)
        self._emit(record.id, {"type": "status", "execution": record.to_public_dict()})
        self._sync_myos(record, status="completed", progress=100, message="执行完成。")

    def _write_report(self, record: ExecutionRecord, success: bool) -> None:
        diff = record.diff
        verification = {item.name: "ok" if item.ok else "failed" for item in record.verification}
        report = {
            "task": record.title,
            "agent": record.agent_id,
            "project": record.project_name,
            "duration": None,
            "status": "completed" if success else "failed",
            "summary": record.latest_action or record.error or ("完成" if success else "失败"),
            "changedFiles": diff.files if diff else [],
            "filesChanged": diff.files_changed if diff else 0,
            "additions": diff.additions if diff else 0,
            "deletions": diff.deletions if diff else 0,
            "tests": verification,
            "risks": (diff.high_risk if diff else []) + ((record.approval or {}).get("risks") or []),
            "unfinished": [] if success else [record.error or "执行未完成"],
            "nextSteps": ["查看 Diff 并验收"] if success else ["检查日志后重试或缩小任务范围"],
        }
        record.report = report
        record.updated_at = utc_now()
        self.store.save(record)
        if self.myos_client is not None:
            try:
                asyncio.run(
                    self.myos_client.report(
                        {
                            "projectId": record.project_id,
                            "workItemId": record.work_item_id,
                            "agentId": record.agent_id,
                            "summary": report["summary"],
                            "progress": 100 if success else min(90, 20 + record.retry_count * 20),
                            "status": "completed" if success else "blocked",
                            "changedFiles": report["changedFiles"][:100],
                            "testResult": ", ".join(f"{name}={'✅' if value == 'ok' else '❌'}" for name, value in verification.items())
                            or None,
                        }
                    )
                )
            except Exception:
                pass

    def _sync_myos(self, record: ExecutionRecord, status: str, progress: int, message: str) -> None:
        if self.myos_client is None:
            return
        try:
            asyncio.run(
                self.myos_client.update_work(
                    {
                        "id": record.work_item_id,
                        "status": status,
                        "progress": progress,
                        "eventMessage": message,
                        "changedFiles": record.diff.files if record.diff else None,
                    }
                )
            )
        except Exception:
            pass

    def _log(self, record: ExecutionRecord, stream: str, text: str) -> None:
        log = self.store.append_log(record.id, stream, text)
        self._emit(record.id, {"type": "log", "seq": log.seq, "stream": stream, "text": text, "createdAt": log.created_at})

    def _emit(self, execution_id: str, event: dict[str, Any]) -> None:
        for queue in list(self._subscribers.get(execution_id) or []):
            try:
                queue.put_nowait(event)
            except Exception:
                pass
