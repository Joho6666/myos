from contextlib import asynccontextmanager
from typing import Annotated, Any
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from .client import MyOSClient, MyOSClientError
from .config import RuntimeConfig
from .execution.engine import ExecutionEngine
from .execution.store import ExecutionStore
from .execution.types import ExecutionInput
from .models import ApprovalRequest, CreateJobRequest, HeartbeatRequest, ReportRequest, StartExecutionRequest
from .service import RuntimeService


def create_app(config: RuntimeConfig | None = None, client: MyOSClient | None = None, engine: ExecutionEngine | None = None) -> FastAPI:
    runtime_config = config or RuntimeConfig.from_env()
    myos_client = client or MyOSClient(runtime_config)
    execution_engine = engine or ExecutionEngine(
        ExecutionStore(runtime_config.resolved_data_dir()),
        runtime_config.resolved_allowlist_path(),
        myos_client,
    )
    service = RuntimeService(myos_client, execution_engine)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        if client is None:
            await myos_client.close()

    app = FastAPI(
        title="MyOS Python Agent Runtime",
        version="0.2.0-alpha",
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
            "version": "0.2.0-alpha",
            "host": runtime_config.host,
            "port": runtime_config.port,
            "myosConfigured": runtime_config.myos_configured,
            "runtimeTokenConfigured": runtime_config.runtime_configured,
            "executionPolicy": "allowlisted-argv",
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
        created = await _call(lambda: service.create_job(request))
        if not request.start:
            return created
        start_request = StartExecutionRequest(
            projectId=request.project_id,
            agentId=request.agent_id,
            title=request.title,
            instructions=request.instructions,
            workItemId=created.get("workItemId") if isinstance(created, dict) else None,
            workingDirectory=request.working_directory,
            permissionProfile=request.permission_profile,
            maxRuntimeSeconds=request.max_runtime_seconds,
            autoRetry=request.auto_retry,
            verification=request.verification,
        )
        execution = await _start_execution(start_request, created if isinstance(created, dict) else {})
        if isinstance(created, dict):
            created["execution"] = execution
            created["executionMode"] = "adapter"
        return created

    @app.post("/jobs/{work_item_id}/heartbeat", dependencies=[protected])
    async def heartbeat(work_item_id: str, request: HeartbeatRequest):
        return await _call(lambda: service.heartbeat(work_item_id, request))

    @app.post("/jobs/{work_item_id}/report", dependencies=[protected])
    async def report(work_item_id: str, request: ReportRequest):
        return await _call(lambda: service.report(work_item_id, request))

    @app.get("/executions", dependencies=[protected])
    async def list_executions() -> dict[str, Any]:
        return {"ok": True, "executions": execution_engine.list_executions()}

    @app.post("/executions", dependencies=[protected])
    async def start_execution(request: StartExecutionRequest) -> dict[str, Any]:
        return await _start_execution(request, {})

    @app.get("/executions/{execution_id}", dependencies=[protected])
    async def get_execution(execution_id: str) -> dict[str, Any]:
        record = execution_engine.get(execution_id)
        if record is None:
            raise HTTPException(status_code=404, detail="执行记录不存在。")
        return {"ok": True, "execution": record.to_public_dict()}

    @app.get("/executions/{execution_id}/logs", dependencies=[protected])
    async def execution_logs(execution_id: str, after: int = -1) -> dict[str, Any]:
        if execution_engine.get(execution_id) is None:
            raise HTTPException(status_code=404, detail="执行记录不存在。")
        logs = execution_engine.logs(execution_id, after)
        return {
            "ok": True,
            "logs": [
                {"seq": item.seq, "stream": item.stream, "text": item.text, "createdAt": item.created_at}
                for item in logs
            ],
        }

    @app.get("/executions/{execution_id}/events", dependencies=[protected])
    async def execution_events(execution_id: str):
        if execution_engine.get(execution_id) is None:
            raise HTTPException(status_code=404, detail="执行记录不存在。")

        async def stream():
            queue = execution_engine.subscribe(execution_id)
            try:
                while True:
                    event = await queue.get()
                    yield f"data: {__import__('json').dumps(event, ensure_ascii=False)}\n\n"
                    if event.get("type") == "status" and str(event.get("execution", {}).get("status", "")).upper() in {
                        "COMPLETED",
                        "FAILED",
                        "CANCELLED",
                    }:
                        break
            finally:
                execution_engine.unsubscribe(execution_id, queue)

        return StreamingResponse(stream(), media_type="text/event-stream")

    @app.post("/executions/{execution_id}/stop", dependencies=[protected])
    async def stop_execution(execution_id: str) -> dict[str, Any]:
        try:
            record = execution_engine.stop(execution_id)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True, "execution": record.to_public_dict()}

    @app.post("/executions/{execution_id}/approve", dependencies=[protected])
    async def approve_execution(execution_id: str, request: ApprovalRequest) -> dict[str, Any]:
        try:
            record = execution_engine.approve(execution_id, request.decision)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        return {"ok": True, "execution": record.to_public_dict()}

    @app.post("/executions/{execution_id}/accept", dependencies=[protected])
    async def accept_execution(execution_id: str) -> dict[str, Any]:
        try:
            record = execution_engine.accept(execution_id)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        return {"ok": True, "execution": record.to_public_dict()}

    @app.post("/executions/{execution_id}/rollback", dependencies=[protected])
    async def rollback_execution(execution_id: str) -> dict[str, Any]:
        try:
            record = execution_engine.rollback(execution_id)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        return {"ok": True, "execution": record.to_public_dict()}

    async def _start_execution(request: StartExecutionRequest, created: dict[str, Any]) -> dict[str, Any]:
        work_item_id = request.work_item_id or created.get("workItemId")
        if not work_item_id:
            created_job = await _call(
                lambda: service.create_job(
                    CreateJobRequest(
                        projectId=request.project_id,
                        agentId=request.agent_id,
                        title=request.title,
                        instructions=request.instructions,
                    )
                )
            )
            work_item_id = created_job.get("workItemId") if isinstance(created_job, dict) else None
        if not work_item_id:
            raise HTTPException(status_code=502, detail="无法创建 MyOS 工作项。")
        try:
            record = execution_engine.start(
                ExecutionInput(
                    execution_id=str(uuid4()),
                    work_item_id=str(work_item_id),
                    project_id=request.project_id,
                    project_name="",
                    agent_id=request.agent_id,
                    title=request.title,
                    instructions=request.instructions,
                    working_directory=request.working_directory or "",
                    permission_profile=request.permission_profile,
                    max_runtime_seconds=request.max_runtime_seconds,
                    auto_retry=request.auto_retry,
                    verification=request.verification or {},
                    context=request.context,
                )
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        return record.to_public_dict()

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
