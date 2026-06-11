"""GET /api/env — versions, base URL, TSG, SCM deep-link base, public SDK methods."""
import os
from importlib.metadata import version, PackageNotFoundError
from fastapi import APIRouter
from model_security_client.api import ModelSecurityAPIClient
from app.backend.deps import BASE_URL
from app.backend.routes.scm import SCM_BASE, SCM_SCAN_PATH

router = APIRouter()


def _safe_version(pkg: str) -> str:
    try:
        return version(pkg)
    except PackageNotFoundError:
        return "unknown"


@router.get("/api/env")
def get_env() -> dict:
    methods = sorted(
        m for m in dir(ModelSecurityAPIClient)
        if not m.startswith("_") and callable(getattr(ModelSecurityAPIClient, m))
    )
    return {
        "sdk_version": _safe_version("model-security-client"),
        "airs_schemas_version": _safe_version("airs-schemas"),
        "base_url": BASE_URL,
        "tsg_id": os.environ.get("TSG_ID", ""),
        "scm_base": SCM_BASE,
        "scm_scan_path": SCM_SCAN_PATH,
        "methods": methods,
    }
