import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from myos_agent_runtime.execution.engine import ExecutionEngine
from myos_agent_runtime.execution.paths import PathPolicyError, load_allowed_projects, resolve_allowed_project
from myos_agent_runtime.execution.permissions import scan_prompt_risks, validate_execution
from myos_agent_runtime.execution.store import ExecutionStore
from myos_agent_runtime.execution.types import DetectionResult, ExecutionInput, ValidationResult
from myos_agent_runtime.execution.verification import parse_command


class FakeAdapter:
    id = "codex"
    name = "Fake Codex"

    def __init__(self, script: Path):
        self.script = script

    def detect(self) -> DetectionResult:
        return DetectionResult(
            id="codex",
            label="Fake Codex",
            installed=True,
            available=True,
            execution_mode="adapter",
            executable=sys.executable,
            detail="test adapter",
        )

    def validate(self, input: ExecutionInput) -> ValidationResult:
        return ValidationResult(True, "ok")

    def build_argv(self, input: ExecutionInput) -> list[str]:
        return [sys.executable, str(self.script), input.instructions]


class PathTests(unittest.TestCase):
    def test_rejects_paths_outside_allowlist(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            allowed_dir = root / "allowed"
            other = root / "other"
            allowed_dir.mkdir()
            other.mkdir()
            config = root / "agent.config.json"
            config.write_text(
                json.dumps({"allowedProjects": [{"id": "p1", "name": "Demo", "path": str(allowed_dir)}]}),
                encoding="utf-8",
            )
            allowed = load_allowed_projects(config)
            project, working = resolve_allowed_project("p1", str(allowed_dir), allowed)
            self.assertEqual(working, allowed_dir.resolve())
            self.assertEqual(project.id, "p1")
            with self.assertRaises(PathPolicyError):
                resolve_allowed_project("p1", str(other), allowed)
            with self.assertRaises(PathPolicyError):
                resolve_allowed_project("missing", str(allowed_dir), allowed)


class PermissionTests(unittest.TestCase):
    def test_prompt_risk_scan_and_safe_profile(self):
        hits = scan_prompt_risks("please git push origin main and deploy")
        self.assertIn("git push", hits)
        self.assertIn("deploy", hits)
        request = ExecutionInput(
            execution_id="e1",
            work_item_id="w1",
            project_id="p1",
            project_name="Demo",
            agent_id="codex",
            title="deploy now",
            instructions="git push --force",
            working_directory=".",
            permission_profile="safe",
        )
        result = validate_execution(request)
        self.assertFalse(result.ok)

    def test_verification_command_rejects_shell_metacharacters(self):
        self.assertEqual(parse_command(["pnpm", "test"]), ["pnpm", "test"])
        with self.assertRaises(ValueError):
            parse_command("pnpm test && rm -rf /")


class EngineTests(unittest.TestCase):
    def test_fake_adapter_runs_and_completes(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            project = root / "project"
            project.mkdir()
            (project / "README.md").write_text("hello\n", encoding="utf-8")
            script = root / "agent.py"
            script.write_text(
                "from pathlib import Path\nPath('touched.txt').write_text('ok', encoding='utf-8')\nprint('agent-ran')\n",
                encoding="utf-8",
            )
            config = root / "agent.config.json"
            config.write_text(
                json.dumps({"allowedProjects": [{"id": "p1", "name": "Demo", "path": str(project)}]}),
                encoding="utf-8",
            )
            engine = ExecutionEngine(ExecutionStore(root / "executions"), config)
            engine.registry.register(FakeAdapter(script))
            record = engine.start(
                ExecutionInput(
                    execution_id="exec-1",
                    work_item_id="work-1",
                    project_id="p1",
                    project_name="Demo",
                    agent_id="codex",
                    title="touch file",
                    instructions="write touched.txt",
                    working_directory=str(project),
                    max_runtime_seconds=30,
                    verification={},
                )
            )
            deadline = time.time() + 20
            while time.time() < deadline:
                current = engine.get("exec-1")
                if current and current.status in {"completed", "failed", "cancelled"}:
                    break
                time.sleep(0.1)
            current = engine.get("exec-1")
            self.assertIsNotNone(current)
            self.assertEqual(current.status, "completed")
            self.assertTrue((project / "touched.txt").is_file())
            logs = engine.logs("exec-1")
            self.assertTrue(any("agent-ran" in item.text for item in logs))

    def test_high_risk_prompt_waits_for_approval(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            project = root / "project"
            project.mkdir()
            config = root / "agent.config.json"
            config.write_text(
                json.dumps({"allowedProjects": [{"id": "p1", "name": "Demo", "path": str(project)}]}),
                encoding="utf-8",
            )
            engine = ExecutionEngine(ExecutionStore(root / "executions"), config)
            engine.registry.register(FakeAdapter(root / "unused.py"))
            record = engine.start(
                ExecutionInput(
                    execution_id="exec-2",
                    work_item_id="work-2",
                    project_id="p1",
                    project_name="Demo",
                    agent_id="codex",
                    title="ship it",
                    instructions="git push origin main",
                    working_directory=str(project),
                    permission_profile="standard",
                )
            )
            self.assertEqual(record.status, "waiting_for_approval")
            denied = engine.approve("exec-2", "deny")
            self.assertEqual(denied.status, "cancelled")


if __name__ == "__main__":
    unittest.main()
