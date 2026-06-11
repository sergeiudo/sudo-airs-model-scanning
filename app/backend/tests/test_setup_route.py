from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeGroupsList(BaseModel):
    security_groups: list[dict]


def _client_with_groups(groups: list[dict]) -> TestClient:
    c = MagicMock()
    c.list_security_groups = MagicMock(return_value=FakeGroupsList(security_groups=groups))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    return TestClient(app)


def test_setup_status_reports_versions_and_creds_shape():
    client = _client_with_groups([])
    r = client.get("/api/setup/status")
    assert r.status_code == 200
    body = r.json()
    assert "sdk_installed" in body and isinstance(body["sdk_installed"], bool)
    assert "schemas_installed" in body
    # Never leak secret values — only presence booleans.
    assert set(body["creds_present"].keys()) == {
        "MODEL_SECURITY_CLIENT_ID", "MODEL_SECURITY_CLIENT_SECRET", "TSG_ID",
    }
    assert all(isinstance(v, bool) for v in body["creds_present"].values())
    assert isinstance(body["all_creds_present"], bool)


def test_setup_status_discovers_source_types_when_reachable():
    client = _client_with_groups([
        {"uuid": "g-1", "name": "Default HF", "source_type": "HUGGING_FACE", "description": None},
        {"uuid": "g-2", "name": "Default S3", "source_type": "S3", "description": None},
    ])
    body = client.get("/api/setup/status").json()
    assert body["api_reachable"] is True
    assert body["api_error"] is None
    assert body["source_types"] == ["HUGGING_FACE", "S3"]


def test_setup_status_marks_unreachable_on_sdk_error():
    c = MagicMock()
    c.list_security_groups = MagicMock(side_effect=RuntimeError("auth failed"))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    body = client.get("/api/setup/status").json()
    assert body["api_reachable"] is False
    assert "auth failed" in body["api_error"]
    assert body["source_types"] == []
