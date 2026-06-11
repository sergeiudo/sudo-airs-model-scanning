"""GET /api/setup/status — live readiness signals for the onboarding wizard.

Returns booleans, versions, and discovered source types only. It NEVER returns
the value of any secret (only whether each credential env var is present)."""
import os
from importlib.metadata import version, PackageNotFoundError
from typing import Any
from fastapi import APIRouter, Depends
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy

router = APIRouter()

_CRED_VARS = ("MODEL_SECURITY_CLIENT_ID", "MODEL_SECURITY_CLIENT_SECRET", "TSG_ID")


def _installed(pkg: str) -> tuple[bool, str | None]:
    try:
        return True, version(pkg)
    except PackageNotFoundError:
        return False, None


def _discover_source_types(proxy: SDKProxy) -> tuple[bool, list[str], str | None]:
    """Best-effort reachability probe. Returns (reachable, source_types, error)."""
    try:
        result = proxy.call("list_security_groups")
    except Exception as exc:  # network/auth/SDK errors → not reachable
        return False, [], str(exc)
    dumped = result.model_dump(mode="json") if hasattr(result, "model_dump") else result
    groups: list[Any] = []
    if isinstance(dumped, dict):
        groups = dumped.get("security_groups", []) or []
    source_types = sorted({str(g.get("source_type")) for g in groups if isinstance(g, dict) and g.get("source_type")})
    return True, source_types, None


@router.get("/api/setup/status")
def setup_status(proxy: SDKProxy = Depends(get_proxy)) -> dict:
    sdk_installed, sdk_version = _installed("model-security-client")
    schemas_installed, schemas_version = _installed("airs-schemas")
    creds_present = {var: bool(os.environ.get(var)) for var in _CRED_VARS}
    all_creds = all(creds_present.values())

    api_reachable, source_types, api_error = _discover_source_types(proxy)

    return {
        "sdk_installed": sdk_installed,
        "sdk_version": sdk_version,
        "schemas_installed": schemas_installed,
        "schemas_version": schemas_version,
        "creds_present": creds_present,
        "all_creds_present": all_creds,
        "api_reachable": api_reachable,
        "api_error": api_error,
        "source_types": source_types,
    }
