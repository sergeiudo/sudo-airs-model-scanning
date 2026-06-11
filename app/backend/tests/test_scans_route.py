import time
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeScanResult(BaseModel):
    uuid: str
    eval_outcome: str


def _proxy(return_value=None, side_effect=None):
    c = MagicMock()
    c.scan = MagicMock(return_value=return_value, side_effect=side_effect)
    return SDKProxy(c, WSHub())


def _wait_done(client, job_id, timeout=2.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = client.get(f"/api/scan-jobs/{job_id}")
        if r.json()["status"] in ("done", "error"):
            return r.json()
        time.sleep(0.05)
    raise AssertionError("job did not finish")


def test_create_scan_job_returns_job_id_then_completes():
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: _proxy(
        return_value=FakeScanResult(uuid="d110c5a5-27a0-459e-9556-eda7196c6ac3",
                                    eval_outcome="ALLOWED"),
    )
    client = TestClient(app)
    r = client.post("/api/scans", json={
        "security_group_uuid": "00000000-0000-0000-0000-000000000001",
        "model_uri": "https://huggingface.co/openai-community/gpt2",
    })
    assert r.status_code == 200
    job_id = r.json()["scan_job_id"]
    assert job_id
    body = _wait_done(client, job_id)
    assert body["status"] == "done"
    assert body["scan_id"] == "d110c5a5-27a0-459e-9556-eda7196c6ac3"
    assert body["result"]["eval_outcome"] == "ALLOWED"


def test_scan_error_captured():
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: _proxy(side_effect=RuntimeError("nope"))
    client = TestClient(app)
    r = client.post("/api/scans", json={
        "security_group_uuid": "00000000-0000-0000-0000-000000000001",
        "model_uri": "https://huggingface.co/x/y",
    })
    job_id = r.json()["scan_job_id"]
    body = _wait_done(client, job_id)
    assert body["status"] == "error"
    assert "nope" in body["error"]


def test_unknown_job_returns_404():
    app = create_app()
    client = TestClient(app)
    r = client.get("/api/scan-jobs/does-not-exist")
    assert r.status_code == 404


def test_advanced_options_forwarded_to_sdk():
    captured: dict = {}

    def fake_scan(**kwargs):
        captured.update(kwargs)
        return FakeScanResult(uuid="u-1", eval_outcome="ALLOWED")

    c = MagicMock()
    c.scan = MagicMock(side_effect=fake_scan)
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.post("/api/scans", json={
        "security_group_uuid": "00000000-0000-0000-0000-000000000001",
        "model_uri": "https://huggingface.co/openai-community/gpt2",
        "allow_patterns": ["*.bin", "*.json"],
        "ignore_patterns": [".gitattributes"],
        "poll_interval_secs": 2,
        "poll_timeout_secs": 600,
    })
    job_id = r.json()["scan_job_id"]
    _wait_done(client, job_id)
    assert captured["allow_patterns"] == ["*.bin", "*.json"]
    assert captured["ignore_patterns"] == [".gitattributes"]
    assert captured["poll_interval_secs"] == 2
    assert captured["poll_timeout_secs"] == 600


def test_list_scans_returns_dumped_payload():
    class FakeScansList(BaseModel):
        scans: list[dict]

    c = MagicMock()
    c.list_scans = MagicMock(return_value=FakeScansList(scans=[
        {"uuid": "a", "model_uri": "https://huggingface.co/x/y", "eval_outcome": "ALLOWED"},
        {"uuid": "b", "model_uri": "https://huggingface.co/p/q", "eval_outcome": "BLOCKED"},
    ]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/scans?limit=25")
    assert r.status_code == 200
    body = r.json()
    assert len(body["scans"]) == 2
    assert body["scans"][0]["eval_outcome"] == "ALLOWED"
    c.list_scans.assert_called_once_with(limit=25)


def test_list_scans_default_limit_50():
    class FakeScansList(BaseModel):
        scans: list[dict]
    c = MagicMock()
    c.list_scans = MagicMock(return_value=FakeScansList(scans=[]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    client.get("/api/scans")
    c.list_scans.assert_called_once_with(limit=50)


def test_get_scan_returns_dumped_payload():
    class FakeScan(BaseModel):
        uuid: str
        eval_outcome: str
        model_uri: str

    c = MagicMock()
    c.get_scan = MagicMock(return_value=FakeScan(
        uuid="d110c5a5-27a0-459e-9556-eda7196c6ac3",
        eval_outcome="BLOCKED",
        model_uri="https://huggingface.co/ykilcher/totally-harmless-model",
    ))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/scans/d110c5a5-27a0-459e-9556-eda7196c6ac3")
    assert r.status_code == 200
    body = r.json()
    assert body["uuid"] == "d110c5a5-27a0-459e-9556-eda7196c6ac3"
    assert body["eval_outcome"] == "BLOCKED"
    args, kwargs = c.get_scan.call_args
    # Argument may be passed positionally or by keyword; either is fine.
    arg = args[0] if args else kwargs.get("scan_uuid") or kwargs.get("uuid")
    assert str(arg) == "d110c5a5-27a0-459e-9556-eda7196c6ac3"


def test_get_scan_rejects_invalid_uuid():
    c = MagicMock()
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/scans/not-a-uuid")
    assert r.status_code == 400


def test_get_scan_violations_returns_dumped_payload():
    class FakeViolationsList(BaseModel):
        violations: list[dict]

    c = MagicMock()
    c.get_scan_violations = MagicMock(return_value=FakeViolationsList(violations=[
        {"rule_name": "Malicious Code", "severity": "HIGH", "issue": "pickle exec",
         "file": "model.bin", "remediation": {"steps": ["Re-export as safetensors"]}},
    ]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/scans/d110c5a5-27a0-459e-9556-eda7196c6ac3/violations")
    assert r.status_code == 200
    body = r.json()
    assert body["violations"][0]["rule_name"] == "Malicious Code"
    args, kwargs = c.get_scan_violations.call_args
    arg = args[0] if args else (kwargs.get("scan_uuid") or kwargs.get("uuid"))
    assert str(arg) == "d110c5a5-27a0-459e-9556-eda7196c6ac3"


def test_get_scan_evaluations_returns_dumped_payload():
    class FakeEvalsList(BaseModel):
        evaluations: list[dict]

    c = MagicMock()
    c.get_scan_evaluations = MagicMock(return_value=FakeEvalsList(evaluations=[
        {"rule_name": "Malicious Code", "outcome": "FAILED", "severity": "HIGH"},
        {"rule_name": "License Check", "outcome": "PASSED", "severity": "MEDIUM"},
    ]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/scans/d110c5a5-27a0-459e-9556-eda7196c6ac3/evaluations")
    assert r.status_code == 200
    body = r.json()
    assert len(body["evaluations"]) == 2


def test_violations_endpoint_rejects_invalid_uuid():
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    r = client.get("/api/scans/not-a-uuid/violations")
    assert r.status_code == 400


def test_evaluations_endpoint_rejects_invalid_uuid():
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    r = client.get("/api/scans/not-a-uuid/evaluations")
    assert r.status_code == 400
