"""GET /api/models — model catalog;
GET /api/models/{uuid}/versions — versions for a model;
GET /api/model-versions/{uuid}/files — files for a version."""
from fastapi import APIRouter, Depends
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy
from app.backend._common import parse_uuid_or_400

router = APIRouter()


@router.get("/api/models")
def list_models(limit: int = 50, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    limit = max(1, min(limit, 200))
    result = proxy.call("list_models", limit=limit)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"models": []}


@router.get("/api/models/{model_uuid}/versions")
def list_versions(model_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = parse_uuid_or_400(model_uuid, "model uuid")
    result = proxy.call("list_model_versions", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"model_versions": []}


@router.get("/api/model-versions/{version_uuid}/files")
def list_files(version_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = parse_uuid_or_400(version_uuid, "model-version uuid")
    result = proxy.call("list_model_version_files", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"files": []}
