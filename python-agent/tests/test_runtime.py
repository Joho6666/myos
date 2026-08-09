import asyncio
import os
from pathlib import Path
import sys
from unittest import TestCase
from unittest.mock import patch

import httpx

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from myos_agent_runtime.app import create_app
from myos_agent_runtime.client import MyOSClient
from myos_agent_runtime.config import RuntimeConfig


class RuntimeTests(TestCase):
    def async_request(self, app, method: str, path: str, **kwargs):
        async def run():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(run())

    def test_config_reads_separate_runtime_token(self):
        with patch.dict(
            os.environ,
            {
                "MYOS_URL": "http://127.0.0.1:3999",
                "MYOS_CLI_TOKEN": "cli-secret",
                "MYOS_PYTHON_AGENT_TOKEN": "runtime-secret",
                "PYTHON_AGENT_PORT": "43201",
            },
            clear=False,
        ):
            config = RuntimeConfig.from_env()

        self.assertEqual(config.myos_url, "http://127.0.0.1:3999")
        self.assertTrue(config.myos_configured)
        self.assertTrue(config.runtime_configured)
        self.assertEqual(config.port, 43201)

    def test_health_is_public_and_protected_routes_require_runtime_token(self):
        config = RuntimeConfig(myos_cli_token="cli", runtime_token="runtime")
        app = create_app(config)

        health = self.async_request(app, "GET", "/health")
        self.assertEqual(health.status_code, 200)
        self.assertTrue(health.json()["myosConfigured"])

        unauthorized = self.async_request(app, "GET", "/runtime")
        self.assertEqual(unauthorized.status_code, 401)

        authorized = self.async_request(
            app,
            "GET",
            "/runtime",
            headers={"Authorization": "Bearer runtime"},
        )
        self.assertEqual(authorized.status_code, 200)
        self.assertEqual(len(authorized.json()["agents"]), 5)

    def test_create_job_uses_myos_context_and_returns_manual_mode(self):
        def handler(request: httpx.Request):
            if request.method == "GET" and request.url.path == "/api/agent-os/command":
                if request.url.params.get("project"):
                    return httpx.Response(
                        200,
                        json={"project": {"id": "p1", "name": "Demo"}, "workItems": []},
                    )
                return httpx.Response(200, json={"projects": [{"id": "p1", "name": "Demo"}]})
            if request.method == "POST":
                return httpx.Response(
                    200,
                    json={
                        "agentWorkItems": [
                            {
                                "id": "w1",
                                "projectId": "p1",
                                "agentId": "codex",
                                "title": "Build a slice",
                                "status": "queued",
                                "progress": 0,
                            }
                        ]
                    },
                )
            return httpx.Response(404)

        config = RuntimeConfig(myos_url="http://myos.test", myos_cli_token="cli", runtime_token="runtime")
        client = MyOSClient(config, transport=httpx.MockTransport(handler))
        app = create_app(config, client)
        response = self.async_request(
            app,
            "POST",
            "/jobs",
            headers={"Authorization": "Bearer runtime"},
            json={
                "projectId": "p1",
                "agentId": "codex",
                "title": "Build a slice",
                "instructions": "Read the brief first.",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["workItemId"], "w1")
        self.assertEqual(response.json()["executionMode"], "manual")
