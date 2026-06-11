"""FastAPI app for the Prisma AIRS Demo UI.

Run: `./run-app.sh` (preferred) or `uvicorn app.backend.main:app --reload`
"""
import asyncio
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.backend.deps import get_hub
from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route, rules as rules_route, models as models_route, schemas as schemas_route, repl as repl_route, setup as setup_route, assets as assets_route

FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    get_hub().bind_loop(asyncio.get_running_loop())
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Prisma AIRS Demo UI", version="0.1.0", lifespan=_lifespan)
    app.include_router(ws_route.router)
    app.include_router(env_route.router)
    app.include_router(groups_route.router)
    app.include_router(scans_route.router)
    app.include_router(rules_route.router)
    app.include_router(models_route.router)
    app.include_router(schemas_route.router)
    app.include_router(repl_route.router)
    app.include_router(setup_route.router)
    app.include_router(assets_route.router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    if FRONTEND_DIST.exists():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    return app


app = create_app()
