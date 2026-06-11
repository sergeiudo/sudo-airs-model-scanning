from fastapi.testclient import TestClient
from app.backend.main import create_app
from app.backend.routes.assets import ASSETS, REPO_ROOT


def test_unknown_asset_returns_404():
    client = TestClient(create_app())
    r = client.get("/api/assets/does-not-exist")
    assert r.status_code == 404


def test_known_assets_serve_with_expected_media_type():
    client = TestClient(create_app())
    for name, (rel, media_type) in ASSETS.items():
        if not (REPO_ROOT / rel).is_file():
            # Asset file not present in this checkout; route should 404 cleanly.
            assert client.get(f"/api/assets/{name}").status_code == 404
            continue
        r = client.get(f"/api/assets/{name}")
        assert r.status_code == 200
        assert media_type.split("/")[0] in r.headers["content-type"]
