from fastapi.testclient import TestClient
from app.backend.main import create_app


def test_env_returns_versions_methods_and_scm():
    client = TestClient(create_app())
    r = client.get("/api/env")
    assert r.status_code == 200
    body = r.json()
    assert "sdk_version" in body
    assert "airs_schemas_version" in body
    assert "base_url" in body
    assert body["base_url"].startswith("https://api.sase.paloaltonetworks.com")
    assert "tsg_id" in body  # may be empty string if env not loaded in test
    assert isinstance(body["methods"], list)
    assert "list_security_groups" in body["methods"]
    assert "scan" in body["methods"]
    assert body["scm_base"].startswith("https://strata.paloaltonetworks.com")
    assert "{uuid}" in body["scm_scan_path"]
