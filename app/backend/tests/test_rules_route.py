from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeRulesList(BaseModel):
    security_rules: list[dict]


def test_list_rules_returns_dumped_payload():
    c = MagicMock()
    c.list_security_rules = MagicMock(return_value=FakeRulesList(security_rules=[
        {"uuid": "r-1", "name": "Malicious Code", "severity": "HIGH", "description": "…"},
        {"uuid": "r-2", "name": "Neural Backdoor", "severity": "HIGH", "description": "…"},
    ]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/rules")
    assert r.status_code == 200
    body = r.json()
    assert len(body["security_rules"]) == 2
    c.list_security_rules.assert_called_once_with()
