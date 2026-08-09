from typing import Any
from urllib.parse import quote

import httpx

from .config import RuntimeConfig


class MyOSClientError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class MyOSClient:
    def __init__(self, config: RuntimeConfig, transport: httpx.AsyncBaseTransport | None = None):
        self.config = config
        self.http = httpx.AsyncClient(
            base_url=config.myos_url,
            timeout=config.request_timeout,
            transport=transport,
        )

    async def close(self) -> None:
        await self.http.aclose()

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        if not self.config.myos_cli_token:
            raise MyOSClientError("MYOS_CLI_TOKEN is not configured.")
        try:
            response = await self.http.request(
                method,
                path,
                headers={"authorization": f"Bearer {self.config.myos_cli_token}"},
                **kwargs,
            )
        except httpx.HTTPError as error:
            raise MyOSClientError(f"Unable to connect to MyOS: {self.config.myos_url}") from error

        try:
            body = response.json()
        except ValueError:
            body = {}
        if not response.is_success:
            message = body.get("error") if isinstance(body, dict) else None
            raise MyOSClientError(message or f"MyOS returned HTTP {response.status_code}", response.status_code)
        if not isinstance(body, dict):
            raise MyOSClientError("MyOS returned an invalid response.")
        return body

    async def list_projects(self) -> dict[str, Any]:
        return await self._request("GET", "/api/agent-os/command")

    async def get_brief(self, project_id: str) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"/api/agent-os/command?project={quote(project_id, safe='')}",
        )

    async def create_work(self, project_id: str, agent_id: str, title: str, instructions: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/api/agent-os/command",
            json={
                "type": "addAgentWorkItem",
                "payload": {
                    "projectId": project_id,
                    "agentId": agent_id,
                    "title": title,
                    "instructions": instructions,
                },
            },
        )

    async def update_work(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/api/agent-os/command",
            json={"type": "updateAgentWorkItem", "payload": payload},
        )

    async def report(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/api/agent-os/command",
            json={"type": "addAgentReport", "payload": payload},
        )


def latest_matching_work_item(
    response: dict[str, Any], project_id: str, agent_id: str, title: str
) -> dict[str, Any] | None:
    items = response.get("agentWorkItems") or response.get("workItems") or []
    matches = [
        item
        for item in items
        if item.get("projectId") == project_id
        and item.get("agentId") == agent_id
        and item.get("title") == title
    ]
    return matches[-1] if matches else None
