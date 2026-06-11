from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


def test_list_models_default_limit_50():
    class FakeModelsList(BaseModel):
        models: list[dict]

    c = MagicMock()
    c.list_models = MagicMock(return_value=FakeModelsList(models=[]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/models")
    assert r.status_code == 200
    c.list_models.assert_called_once_with(limit=50)


def test_list_models_honours_query_limit():
    class FakeModelsList(BaseModel):
        models: list[dict]

    c = MagicMock()
    c.list_models = MagicMock(return_value=FakeModelsList(models=[{"uuid": "m-1", "name": "gpt2"}]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/models?limit=10")
    assert r.json()["models"][0]["uuid"] == "m-1"
    c.list_models.assert_called_once_with(limit=10)


def test_list_model_versions_calls_sdk_with_uuid():
    class FakeVersionsList(BaseModel):
        model_versions: list[dict]

    c = MagicMock()
    c.list_model_versions = MagicMock(return_value=FakeVersionsList(
        model_versions=[{"uuid": "v-1", "name": "main"}]
    ))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/models/8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2/versions")
    assert r.status_code == 200
    assert r.json()["model_versions"][0]["uuid"] == "v-1"
    args, kwargs = c.list_model_versions.call_args
    arg = args[0] if args else (kwargs.get("model_uuid") or kwargs.get("uuid"))
    assert str(arg) == "8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2"


def test_list_version_files_calls_sdk_with_uuid():
    class FakeFilesList(BaseModel):
        files: list[dict]

    c = MagicMock()
    c.list_model_version_files = MagicMock(return_value=FakeFilesList(
        files=[{"uuid": "f-1", "name": "pytorch_model.bin", "size": 1024}]
    ))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/model-versions/8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2/files")
    assert r.status_code == 200
    assert r.json()["files"][0]["name"] == "pytorch_model.bin"


def test_list_model_versions_rejects_invalid_uuid():
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    r = client.get("/api/models/not-a-uuid/versions")
    assert r.status_code == 400


def test_list_version_files_rejects_invalid_uuid():
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    r = client.get("/api/model-versions/not-a-uuid/files")
    assert r.status_code == 400
