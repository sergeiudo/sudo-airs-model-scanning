"""POST /api/scans starts a scan as a background thread; GET /api/scan-jobs/:id polls it.
GET /api/scans and /api/scans/:uuid are added in subsequent tasks."""
import threading
import uuid as _uuid
from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy
from app.backend._common import parse_uuid_or_400

router = APIRouter()


class ScanRequest(BaseModel):
    security_group_uuid: str
    model_uri: str = Field(..., min_length=1)
    allow_patterns: list[str] | None = None
    ignore_patterns: list[str] | None = None
    poll_interval_secs: int | None = None
    poll_timeout_secs: int | None = None


class JobStatus(BaseModel):
    job_id: str
    status: str  # "pending" | "done" | "error"
    scan_id: str | None = None
    result: dict[str, Any] | None = None
    error: str | None = None


_JOBS: dict[str, JobStatus] = {}
_LOCK = threading.Lock()


def _resolve_scan_uuid(result: Any, dumped: dict | None) -> str | None:
    """SDK returns `.uuid`. Fall back to legacy attribute/key names just in case."""
    for attr in ("uuid", "scan_id", "id"):
        v = getattr(result, attr, None)
        if v is not None:
            return str(v)
    if isinstance(dumped, dict):
        for k in ("uuid", "scan_id", "id"):
            if dumped.get(k):
                return str(dumped[k])
    return None


def _run_scan_job(job_id: str, proxy: SDKProxy, req: ScanRequest) -> None:
    try:
        kwargs: dict[str, Any] = {
            "security_group_uuid": UUID(req.security_group_uuid),
            "model_uri": req.model_uri,
        }
        if req.allow_patterns is not None:
            kwargs["allow_patterns"] = req.allow_patterns
        if req.ignore_patterns is not None:
            kwargs["ignore_patterns"] = req.ignore_patterns
        if req.poll_interval_secs is not None:
            kwargs["poll_interval_secs"] = req.poll_interval_secs
        if req.poll_timeout_secs is not None:
            kwargs["poll_timeout_secs"] = req.poll_timeout_secs

        result = proxy.call("scan", **kwargs)
        dumped = result.model_dump(mode="json") if hasattr(result, "model_dump") else None
        scan_id = _resolve_scan_uuid(result, dumped)
        with _LOCK:
            _JOBS[job_id] = JobStatus(
                job_id=job_id, status="done",
                scan_id=scan_id, result=dumped,
            )
    except Exception as exc:
        with _LOCK:
            _JOBS[job_id] = JobStatus(job_id=job_id, status="error", error=str(exc))


@router.post("/api/scans")
def create_scan(req: ScanRequest, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    job_id = _uuid.uuid4().hex[:12]
    with _LOCK:
        _JOBS[job_id] = JobStatus(job_id=job_id, status="pending")
    t = threading.Thread(target=_run_scan_job, args=(job_id, proxy, req), daemon=True)
    t.start()
    return {"scan_job_id": job_id}


@router.get("/api/scan-jobs/{job_id}")
def get_scan_job(job_id: str) -> JobStatus:
    with _LOCK:
        job = _JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="unknown job")
    return job


@router.get("/api/scans")
def list_scans(limit: int = 50, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    """Wrap client.list_scans(limit=N). Filtering happens client-side in the React table."""
    limit = max(1, min(limit, 200))
    result = proxy.call("list_scans", limit=limit)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"scans": []}


@router.get("/api/scans/{scan_uuid}")
def get_scan_detail(scan_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = parse_uuid_or_400(scan_uuid, "scan uuid")
    result = proxy.call("get_scan", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {}


@router.get("/api/scans/{scan_uuid}/violations")
def get_scan_violations(scan_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = parse_uuid_or_400(scan_uuid, "scan uuid")
    result = proxy.call("get_scan_violations", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"violations": []}


@router.get("/api/scans/{scan_uuid}/evaluations")
def get_scan_evaluations(scan_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = parse_uuid_or_400(scan_uuid, "scan uuid")
    result = proxy.call("get_scan_evaluations", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"evaluations": []}
