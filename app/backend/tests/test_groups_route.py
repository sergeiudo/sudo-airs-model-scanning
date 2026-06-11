from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeGroupsList(BaseModel):
    security_groups: list[dict]


def test_list_groups_returns_dumped_payload():
    c = MagicMock()
    c.list_security_groups = MagicMock(return_value=FakeGroupsList(security_groups=[
        {"uuid": "g-1", "name": "Default HF", "source_type": "HUGGING_FACE", "description": None},
    ]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/groups")
    assert r.status_code == 200
    assert r.json()["security_groups"][0]["uuid"] == "g-1"


def test_get_group_returns_dumped_payload_and_calls_sdk_with_uuid():
    class FakeGroupDetail(BaseModel):
        uuid: str
        name: str
        source_type: str
        rules: list[dict]

    c = MagicMock()
    c.get_security_group = MagicMock(return_value=FakeGroupDetail(
        uuid="8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2",
        name="Default HF", source_type="HUGGING_FACE",
        rules=[{"name": "Malicious Code", "enabled": True, "blocking": True}],
    ))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/groups/8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2")
    assert r.status_code == 200
    body = r.json()
    assert body["uuid"] == "8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2"
    assert body["rules"][0]["name"] == "Malicious Code"
    args, kwargs = c.get_security_group.call_args
    arg = args[0] if args else (kwargs.get("security_group_uuid") or kwargs.get("uuid"))
    assert str(arg) == "8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2"


def test_get_group_rejects_invalid_uuid():
    c = MagicMock()
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/groups/not-a-uuid")
    assert r.status_code == 400
