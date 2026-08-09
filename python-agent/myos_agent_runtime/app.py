from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query

from .client import MyOSClient, MyOSClientError
from .config import RuntimeConfig
from .models import CreateJobRequest, HeartbeatRequest, ReportRequest
from .service import RuntimeService


def create_app(config: RuntimeConfig | None = None, client: MyOSClient | None = None) -> FastAPI:
    runtime_config = config or RuntimeConfig.from_env()
    myos_client = client or MyOSClient(runtime_config)
    service = RuntimeService(myos_client)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        if client is None:
            await myos_client.close()

    app = FastAPI(
        title="MyOS Python Agent Runtime",
        version="0.1.0",
        docs_url="/docs",
        redoc_url=None,
        lifespan=lifespan,
    )

    def require_runtime_token(
        authorization: Annotated[str | None, Header()] = None,
    ) -> None:
        if not runtime_config.runtime_configured:
            raise HTTPException(status_code=503, detail="MYOS_PYTHON_AGENT_TOKEN is not configured.")
        if authorization != f"Bearer {runtime_config.runtime_token}":
            raise HTTPException(status_code=401, detail="Agent runtime authentication failed.")

    protected = Depends(require_runtime_token)

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {
            "ok": True,
            "name": "MyOS Python Agent Runtime",
            "version": "0.1.0",
            "host": runtime_config.host,
            "port": runtime_config.port,
            "myosConfigured": runtime_config.myos_configured,
            "runtimeTokenConfigured": runtime_config.runtime_configured,
            "executionPolicy": "no-arbitrary-shell",
        }

    @app.get("/runtime", dependencies=[protected])
    async def runtime() -> dict[str, Any]:
        return service.runtime_info()

    @app.get("/projects", dependencies=[protected])
    async def projects() -> dict[str, Any]:
        return await _call(lambda: myos_client.list_projects())

    @app.get("/projects/{project_id}/brief", dependencies=[protected])
    async def project_brief(project_id: str) -> dict[str, Any]:
        return await _call(lambda: myos_client.get_brief(project_id))

    @app.get("/jobs", dependencies=[protected])
    async def jobs(project_id: Annotated[str, Query(alias="projectId", min_length=1)]) -> dict[str, Any]:
        return await _call(lambda: myos_client.get_brief(project_id))

    @app.post("/jobs", dependencies=[protected])
    async def create_job(request: CreateJobRequest):
        return await _call(lambda: service.create_job(request))

    @app.post("/jobs/{work_item_id}/heartbeat", dependencies=[protected])
    async def heartbeat(work_item_id: str, request: HeartbeatRequest):
        return await _call(lambda: service.heartbeat(work_item_id, request))

    @app.post("/jobs/{work_item_id}/report", dependencies=[protected])
    async def report(work_item_id: str, request: ReportRequest):
        return await _call(lambda: service.report(work_item_id, request))

    return app


async def _call(operation):
    try:
        result = await operation()
        if hasattr(result, "model_dump"):
            return result.model_dump(by_alias=True)
        return result
    except MyOSClientError as error:
        status = 503 if error.status_code is None else 502
        raise HTTPException(status_code=status, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
