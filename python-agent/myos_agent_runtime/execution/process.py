from __future__ import annotations

import os
import signal
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from subprocess import PIPE, Popen, TimeoutExpired
from typing import Any


class ProcessError(RuntimeError):
    pass


LogCallback = Callable[[str, str], None]


def which(command: str) -> str | None:
    from shutil import which as shutil_which

    return shutil_which(command)


def run_argv(
    argv: list[str],
    *,
    cwd: Path,
    timeout: float = 20,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    if not argv or not isinstance(argv, list) or any(not isinstance(item, str) for item in argv):
        raise ProcessError("命令必须是 argv 字符串数组。")
    process = Popen(
        argv,
        cwd=str(cwd),
        stdout=PIPE,
        stderr=PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env or os.environ.copy(),
        shell=False,
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except TimeoutExpired as error:
        process.kill()
        process.communicate(timeout=5)
        raise ProcessError(f"命令超时：{argv[0]}") from error
    except Exception:
        process.kill()
        try:
            process.communicate(timeout=5)
        except Exception:
            pass
        raise
    return process.returncode or 0, stdout or "", stderr or ""


@dataclass
class ManagedProcess:
    argv: list[str]
    cwd: Path
    timeout_seconds: int
    on_log: LogCallback
    env: dict[str, str] = field(default_factory=lambda: os.environ.copy())
    process: Popen[str] | None = None
    started_at: float = 0
    cancelled: bool = False
    timed_out: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def start(self) -> int:
        if not self.argv or any(not isinstance(item, str) for item in self.argv):
            raise ProcessError("命令必须是 argv 字符串数组。")
        self.started_at = time.time()
        self.process = Popen(
            self.argv,
            cwd=str(self.cwd),
            stdout=PIPE,
            stderr=PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=self.env,
            shell=False,
        )
        threading.Thread(target=self._pump, args=("stdout", self.process.stdout), daemon=True).start()
        threading.Thread(target=self._pump, args=("stderr", self.process.stderr), daemon=True).start()
        threading.Thread(target=self._watch_timeout, daemon=True).start()
        return self.process.pid or 0

    def _pump(self, stream: str, pipe: Any) -> None:
        if pipe is None:
            return
        for line in iter(pipe.readline, ""):
            text = line.rstrip("\n")
            if text:
                self.on_log(stream, text)
        pipe.close()

    def _watch_timeout(self) -> None:
        while self.process and self.process.poll() is None:
            if time.time() - self.started_at > self.timeout_seconds:
                self.timed_out = True
                self.stop()
                self.on_log("system", f"执行超时（{self.timeout_seconds}s），已取消。")
                return
            time.sleep(0.5)

    def wait(self) -> int:
        if self.process is None:
            raise ProcessError("进程尚未启动。")
        return int(self.process.wait())

    def stop(self) -> None:
        with self._lock:
            self.cancelled = True
            if self.process is None or self.process.poll() is not None:
                return
            pid = self.process.pid
            if pid is None:
                return
            if os.name == "nt":
                Popen(["taskkill", "/pid", str(pid), "/T", "/F"], stdout=PIPE, stderr=PIPE, shell=False).wait(timeout=10)
            else:
                try:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                except OSError:
                    self.process.terminate()

    def pid(self) -> int | None:
        return None if self.process is None else self.process.pid

    def alive(self) -> bool:
        return self.process is not None and self.process.poll() is None


def pid_is_alive(pid: int | None) -> bool:
    if not pid:
        return False
    if os.name == "nt":
        code, stdout, _ = run_argv(["tasklist", "/FI", f"PID eq {pid}", "/NH"], cwd=Path.cwd(), timeout=8)
        return code == 0 and str(pid) in stdout
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False
