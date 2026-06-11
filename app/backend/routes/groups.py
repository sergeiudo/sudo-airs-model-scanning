"""GET /api/groups — list; GET /api/groups/{uuid} — single group with rules."""
from fastapi import APIRouter, Depends
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy
from app.backend._common import parse_uuid_or_400

router = APIRouter()


@router.get("/api/groups")
def list_groups(proxy: SDKProxy = Depends(get_proxy)) -> dict:
    result = proxy.call("list_security_groups")
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"security_groups": []}


@router.get("/api/groups/{group_uuid}")
def get_group_detail(group_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = parse_uuid_or_400(group_uuid, "group uuid")
    result = proxy.call("get_security_group", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {}
