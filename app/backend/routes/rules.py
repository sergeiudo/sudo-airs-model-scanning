"""GET /api/rules — full catalog of security rules (the deck's 'Coverage' slide)."""
from fastapi import APIRouter, Depends
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy

router = APIRouter()


@router.get("/api/rules")
def list_rules(proxy: SDKProxy = Depends(get_proxy)) -> dict:
    result = proxy.call("list_security_rules")
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"security_rules": []}
