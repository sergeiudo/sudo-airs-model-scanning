from fastapi.testclient import TestClient
from app.backend.main import create_app


def test_schemas_returns_a_list():
    client = TestClient(create_app())
    r = client.get("/api/schemas")
    assert r.status_code == 200
    body = r.json()
    assert "schemas" in body
    assert isinstance(body["schemas"], list)
    # We expect at least one schema model exposed by airs_schemas.
    assert len(body["schemas"]) > 0


def test_schemas_entries_have_name_and_json_schema():
    client = TestClient(create_app())
    body = client.get("/api/schemas").json()
    first = body["schemas"][0]
    assert "name" in first
    assert isinstance(first["name"], str)
    assert "schema" in first
    assert isinstance(first["schema"], dict)
    # Pydantic JSON schemas always contain at minimum a "type" or "$defs" or "properties" key.
    assert any(k in first["schema"] for k in ("type", "properties", "$defs", "title"))


def test_schemas_entries_are_sorted_by_name():
    client = TestClient(create_app())
    body = client.get("/api/schemas").json()
    names = [e["name"] for e in body["schemas"]]
    assert names == sorted(names)
