"""GET /api/assets/{name} — serve a small allowlist of repo-root reference files
(presentation decks, the product PDF) so the portal's Resources page can open them in-app.

Only the explicitly listed files are served; arbitrary paths are rejected to avoid traversal."""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

REPO_ROOT = Path(__file__).resolve().parents[3]

# name -> (relative path from repo root, media type)
ASSETS: dict[str, tuple[str, str]] = {
    "overview-deck": ("model-scanning-deck.html", "text/html"),
    "cicd-deck": ("model-scanning-cicd-deck.html", "text/html"),
    "product-pdf": ("ai-model-security.pdf", "application/pdf"),
}


@router.get("/api/assets/{name}")
def get_asset(name: str) -> FileResponse:
    entry = ASSETS.get(name)
    if entry is None:
        raise HTTPException(status_code=404, detail="Unknown asset")
    rel, media_type = entry
    path = REPO_ROOT / rel
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Asset file missing: {rel}")
    return FileResponse(path, media_type=media_type)
