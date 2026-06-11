# Demo UI — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the end-to-end thin slice of the Prisma AIRS Demo UI — a FastAPI + React app on `localhost:8765` with three working screens (Dashboard, Run-a-scan, Environment) and a persistent bottom drawer that streams every SDK call/response. Milestones 2–4 (scan detail, browsers, REPL) are out of scope here.

**Architecture:** A single FastAPI process on `localhost:8765` serves a Vite-built React frontend from `/` and JSON + WebSocket APIs from `/api/*`. All SDK calls funnel through a single `SDKProxy` chokepoint that emits `SDKEvent` records to a WebSocket hub; the frontend's bottom drawer subscribes to that hub and renders the live log. Scans run in `BackgroundTasks` jobs polled by the frontend.

**Tech Stack:** Python 3.12 · FastAPI · uvicorn · websockets · pytest · React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · Vitest

**Spec:** `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md`

**What's in M1:**
- Backend: SDKProxy + WS hub + 3 routes (`/api/env`, `/api/groups`, `/api/scans` + `/api/scan-jobs/:id`).
- Frontend: app shell with sidebar nav, persistent drawer with **Log** tab only, three pages: Dashboard, Run-a-scan, Environment.

**Explicitly NOT in M1:**
- Scan history list + scan detail page (M2)
- Groups detail + Models browser (M3)
- REPL tab + Code tab in drawer (M4)
- Updating rule instances, multi-tenant `.env` switching, scan diffing, export (v2)

---

## Pre-flight context for the implementer

Read these before starting:

- `CLAUDE.md` (repo root) — explains the proprietary SDK install dance and key SDK usage patterns. **Critical:** the SDK reads `MODEL_SECURITY_CLIENT_ID`/`SECRET`/`TSG_ID` from env; do NOT pass credentials as arguments.
- `examples/list_security_groups.py`, `examples/scan_huggingface_model.py` — the patterns to mirror for SDK usage.
- `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md` — the design spec this plan implements.
- The shared `.venv` at the repo root already has `model-security-client==1.1.0` and `airs-schemas==0.2.5` installed. Use `source .venv/bin/activate` from the repo root.

**Conventions:**
- All paths in this plan are relative to the repo root unless prefixed with `app/`.
- Backend Python: type hints everywhere, Pydantic v2 models.
- Frontend: TypeScript strict mode, no `any` unless interfacing with an untyped boundary.
- Commit after every passing task. Commit messages: `m1: <short description>`.

---

## File map (what gets created)

```
app/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app factory; mounts static frontend + routes
│   ├── sdk_proxy.py         # SDKProxy + SDKEvent
│   ├── ws_hub.py            # WSHub: in-process pub/sub for WS events
│   ├── codegen.py           # render_python(event) -> str
│   ├── deps.py              # FastAPI dependencies (shared SDKProxy, WSHub)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── env.py           # GET /api/env
│   │   ├── groups.py        # GET /api/groups
│   │   ├── scans.py         # POST /api/scans, GET /api/scan-jobs/:id
│   │   └── ws.py            # WS /api/ws/log
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_sdk_proxy.py
│       ├── test_codegen.py
│       ├── test_ws_hub.py
│       ├── test_env_route.py
│       ├── test_groups_route.py
│       └── test_scans_route.py
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   ├── components.json      # shadcn config
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   ├── api.ts       # REST client
│   │   │   ├── ws.ts        # WebSocket connection + event bus
│   │   │   ├── types.ts     # shared types (SDKEvent, EnvInfo, …)
│   │   │   └── hf.ts        # HuggingFace URI validator
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── AppShell.tsx
│   │   │   └── Drawer/
│   │   │       ├── Drawer.tsx
│   │   │       └── LogTab.tsx
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── Scan.tsx
│   │       └── Environment.tsx
│   └── src/__tests__/
│       └── hf.test.ts
├── run-app.sh
└── README.md
```

Modified files:
- `requirements.txt` — add `fastapi`, `uvicorn[standard]`, `websockets`, `pytest`, `httpx` (for TestClient).
- `.gitignore` — add `app/frontend/node_modules/`, `app/frontend/dist/`, `.superpowers/`.

---

## Task 1: Repo prep — requirements, gitignore, app folder

**Files:**
- Modify: `requirements.txt`
- Modify: `.gitignore`
- Create: `app/__init__.py` (empty)
- Create: `app/backend/__init__.py` (empty)
- Create: `app/backend/routes/__init__.py` (empty)
- Create: `app/backend/tests/__init__.py` (empty)

- [ ] **Step 1: Add backend dependencies**

Open `requirements.txt`. Append:

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
websockets==13.1
pytest==8.3.3
httpx==0.27.2
```

- [ ] **Step 2: Update .gitignore**

Append to `.gitignore`:

```
# Demo UI
app/frontend/node_modules/
app/frontend/dist/

# Brainstorming scratch
.superpowers/
```

- [ ] **Step 3: Create empty package files**

```bash
mkdir -p app/backend/routes app/backend/tests
touch app/__init__.py app/backend/__init__.py app/backend/routes/__init__.py app/backend/tests/__init__.py
```

- [ ] **Step 4: Install new dependencies into the existing venv**

Run:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```
Expected: fastapi, uvicorn, websockets, pytest, httpx install successfully. SDK packages (model-security-client, airs-schemas) remain untouched.

- [ ] **Step 5: Commit**

```bash
git add requirements.txt .gitignore app/__init__.py app/backend/
git commit -m "m1: scaffold app/ package and add backend deps"
```

---

## Task 2: SDKEvent model + WSHub (no SDK yet)

**Files:**
- Create: `app/backend/sdk_proxy.py` (just the SDKEvent model for now)
- Create: `app/backend/ws_hub.py`
- Create: `app/backend/tests/conftest.py`
- Create: `app/backend/tests/test_ws_hub.py`

- [ ] **Step 1: Write the failing test for WSHub**

Create `app/backend/tests/conftest.py`:

```python
import sys
from pathlib import Path

# Allow `import app.backend...` when running pytest from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
```

Create `app/backend/tests/test_ws_hub.py`:

```python
import asyncio
import pytest
from app.backend.ws_hub import WSHub


@pytest.mark.asyncio
async def test_publish_delivers_to_subscriber():
    hub = WSHub()
    sub = hub.subscribe()
    await hub.publish({"hello": "world"})
    msg = await asyncio.wait_for(sub.get(), timeout=0.5)
    assert msg == {"hello": "world"}


@pytest.mark.asyncio
async def test_two_subscribers_both_receive():
    hub = WSHub()
    a = hub.subscribe()
    b = hub.subscribe()
    await hub.publish({"n": 1})
    assert (await asyncio.wait_for(a.get(), 0.5)) == {"n": 1}
    assert (await asyncio.wait_for(b.get(), 0.5)) == {"n": 1}


@pytest.mark.asyncio
async def test_unsubscribe_stops_delivery():
    hub = WSHub()
    sub = hub.subscribe()
    hub.unsubscribe(sub)
    await hub.publish({"n": 1})
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(sub.get(), timeout=0.1)
```

- [ ] **Step 2: Add pytest-asyncio to dependencies and install**

Append to `requirements.txt`:
```
pytest-asyncio==0.24.0
```

Create `pytest.ini` at repo root:
```ini
[pytest]
asyncio_mode = auto
testpaths = app/backend/tests
```

Run:
```bash
pip install pytest-asyncio==0.24.0
```

- [ ] **Step 3: Run tests, confirm failure**

Run: `pytest app/backend/tests/test_ws_hub.py -v`
Expected: ImportError or collection error — `app.backend.ws_hub` doesn't exist yet.

- [ ] **Step 4: Implement WSHub**

Create `app/backend/ws_hub.py`:

```python
"""In-process pub/sub hub used to fan SDKEvent records out to WebSocket clients."""
import asyncio
from typing import Any


class WSHub:
    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue[Any]] = []

    def subscribe(self) -> asyncio.Queue[Any]:
        q: asyncio.Queue[Any] = asyncio.Queue(maxsize=1000)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[Any]) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def publish(self, message: Any) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                # Slowest subscriber drops messages rather than blocking the publisher.
                pass
```

- [ ] **Step 5: Re-run tests, confirm pass**

Run: `pytest app/backend/tests/test_ws_hub.py -v`
Expected: 3 passed.

- [ ] **Step 6: Write the SDKEvent model**

Create `app/backend/sdk_proxy.py`:

```python
"""SDK call interception. The SDKProxy is added in Task 3; this file currently
defines only the event record that travels through the WSHub."""
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel


class SDKEvent(BaseModel):
    id: str
    method: str
    kwargs: dict[str, Any]
    status: Literal["pending", "ok", "error"]
    started_at: float
    duration_ms: float | None = None
    response_summary: str | None = None
    response_full: dict[str, Any] | list[Any] | None = None
    error: str | None = None
```

- [ ] **Step 7: Commit**

```bash
git add app/backend/sdk_proxy.py app/backend/ws_hub.py app/backend/tests/ requirements.txt pytest.ini
git commit -m "m1: WSHub pub/sub + SDKEvent model"
```

---

## Task 3: SDKProxy wrapping the client

**Files:**
- Modify: `app/backend/sdk_proxy.py`
- Create: `app/backend/tests/test_sdk_proxy.py`

- [ ] **Step 1: Write the failing tests**

Create `app/backend/tests/test_sdk_proxy.py`:

```python
import asyncio
from unittest.mock import MagicMock
import pytest
from pydantic import BaseModel
from app.backend.sdk_proxy import SDKProxy, SDKEvent
from app.backend.ws_hub import WSHub


class FakeResp(BaseModel):
    name: str
    items: list[str]


@pytest.fixture
def fake_client():
    client = MagicMock()
    client.list_security_groups = MagicMock(
        return_value=FakeResp(name="r", items=["a", "b"])
    )
    return client


async def _drain(sub):
    events = []
    while True:
        try:
            events.append(await asyncio.wait_for(sub.get(), timeout=0.2))
        except asyncio.TimeoutError:
            return events


async def test_call_returns_response(fake_client):
    hub = WSHub()
    proxy = SDKProxy(fake_client, hub)
    result = proxy.call("list_security_groups")
    assert result.name == "r"


async def test_call_emits_pending_then_ok(fake_client):
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(fake_client, hub)
    proxy.call("list_security_groups")
    await asyncio.sleep(0.05)  # let publish tasks finish
    events = await _drain(sub)
    assert len(events) == 2
    assert events[0]["status"] == "pending"
    assert events[1]["status"] == "ok"
    assert events[0]["method"] == "list_security_groups"
    assert events[1]["duration_ms"] is not None
    assert events[1]["response_full"]["items"] == ["a", "b"]


async def test_call_captures_error_and_reraises():
    client = MagicMock()
    client.broken = MagicMock(side_effect=RuntimeError("boom"))
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(client, hub)
    with pytest.raises(RuntimeError, match="boom"):
        proxy.call("broken")
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    assert events[-1]["status"] == "error"
    assert events[-1]["error"] == "boom"


async def test_kwargs_are_json_safe(fake_client):
    from uuid import UUID
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(fake_client, hub)
    uid = UUID("00000000-0000-0000-0000-000000000001")
    proxy.call("list_security_groups", uuid=uid, count=3)
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    # UUID rendered as string, not a UUID instance.
    assert events[0]["kwargs"] == {"uuid": str(uid), "count": 3}
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `pytest app/backend/tests/test_sdk_proxy.py -v`
Expected: ImportError — SDKProxy doesn't exist yet.

- [ ] **Step 3: Implement SDKProxy**

Replace `app/backend/sdk_proxy.py` with:

```python
"""SDK call interception. Every SDK call goes through SDKProxy.call() so the
frontend can stream live events to the persistent drawer."""
from __future__ import annotations
import asyncio
import time
import uuid as _uuid
from typing import Any, Literal
from pydantic import BaseModel


class SDKEvent(BaseModel):
    id: str
    method: str
    kwargs: dict[str, Any]
    status: Literal["pending", "ok", "error"]
    started_at: float
    duration_ms: float | None = None
    response_summary: str | None = None
    response_full: dict[str, Any] | list[Any] | None = None
    error: str | None = None


def _json_safe(value: Any) -> Any:
    """Coerce non-JSON-native values (UUID, Pydantic models, sets) to JSON-safe forms."""
    if isinstance(value, _uuid.UUID):
        return str(value)
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return value


def _serialise_response(response: Any) -> tuple[str | None, dict[str, Any] | list[Any] | None]:
    if response is None:
        return None, None
    if isinstance(response, BaseModel):
        dumped = response.model_dump(mode="json")
        summary = type(response).__name__
        return summary, dumped
    if isinstance(response, (list, dict)):
        return type(response).__name__, _json_safe(response)
    return repr(response), None


class SDKProxy:
    """Wraps a model_security_client instance. Every call publishes pending/ok/error
    SDKEvents to the WSHub for live UI streaming."""

    def __init__(self, client: Any, hub: "WSHub") -> None:  # type: ignore[name-defined]
        self._client = client
        self._hub = hub

    def call(self, method: str, **kwargs: Any) -> Any:
        event_id = _uuid.uuid4().hex[:12]
        safe_kwargs = {k: _json_safe(v) for k, v in kwargs.items()}
        started = time.time()

        pending = SDKEvent(
            id=event_id, method=method, kwargs=safe_kwargs,
            status="pending", started_at=started,
        )
        self._publish(pending)

        try:
            result = getattr(self._client, method)(**kwargs)
        except Exception as exc:
            duration_ms = (time.time() - started) * 1000
            err = SDKEvent(
                id=event_id, method=method, kwargs=safe_kwargs,
                status="error", started_at=started, duration_ms=duration_ms,
                error=str(exc),
            )
            self._publish(err)
            raise

        duration_ms = (time.time() - started) * 1000
        summary, full = _serialise_response(result)
        ok = SDKEvent(
            id=event_id, method=method, kwargs=safe_kwargs,
            status="ok", started_at=started, duration_ms=duration_ms,
            response_summary=summary, response_full=full,
        )
        self._publish(ok)
        return result

    def _publish(self, event: SDKEvent) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # No running loop — only happens in non-async contexts (e.g. background threads).
            # In production both routes and tests run inside a loop.
            return
        loop.create_task(self._hub.publish(event.model_dump(mode="json")))
```

- [ ] **Step 4: Re-run tests, confirm pass**

Run: `pytest app/backend/tests/test_sdk_proxy.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add app/backend/sdk_proxy.py app/backend/tests/test_sdk_proxy.py
git commit -m "m1: SDKProxy chokepoint emits pending/ok/error events"
```

---

## Task 4: codegen — render Python snippet from an event

**Files:**
- Create: `app/backend/codegen.py`
- Create: `app/backend/tests/test_codegen.py`

- [ ] **Step 1: Write the failing tests**

Create `app/backend/tests/test_codegen.py`:

```python
from app.backend.codegen import render_python
from app.backend.sdk_proxy import SDKEvent


def _evt(method, kwargs):
    return SDKEvent(
        id="x", method=method, kwargs=kwargs,
        status="ok", started_at=0.0, duration_ms=10.0,
    )


def test_no_args():
    assert render_python(_evt("list_security_groups", {})) == "client.list_security_groups()"


def test_string_arg_quoted():
    out = render_python(_evt("get_model", {"model_id": "abc"}))
    assert out == "client.get_model(model_id='abc')"


def test_uuid_arg_wrapped():
    out = render_python(_evt("scan", {
        "security_group_uuid": "8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2",
        "model_uri": "https://huggingface.co/openai-community/gpt2",
    }))
    assert "UUID('8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2')" in out
    assert "model_uri='https://huggingface.co/openai-community/gpt2'" in out


def test_int_arg_unquoted():
    out = render_python(_evt("list_scans", {"limit": 25}))
    assert out == "client.list_scans(limit=25)"
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `pytest app/backend/tests/test_codegen.py -v`
Expected: ImportError.

- [ ] **Step 3: Implement codegen**

Create `app/backend/codegen.py`:

```python
"""Render an SDKEvent as the equivalent `client.<method>(...)` Python call."""
import re
from app.backend.sdk_proxy import SDKEvent

_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def _repr_arg(value: object) -> str:
    if isinstance(value, str):
        if _UUID_RE.match(value):
            return f"UUID('{value}')"
        return repr(value)
    if isinstance(value, (int, float, bool)) or value is None:
        return repr(value)
    if isinstance(value, list):
        return "[" + ", ".join(_repr_arg(v) for v in value) + "]"
    if isinstance(value, dict):
        return "{" + ", ".join(f"{_repr_arg(k)}: {_repr_arg(v)}" for k, v in value.items()) + "}"
    return repr(value)


def render_python(event: SDKEvent) -> str:
    if not event.kwargs:
        return f"client.{event.method}()"
    parts = [f"{k}={_repr_arg(v)}" for k, v in event.kwargs.items()]
    return f"client.{event.method}({', '.join(parts)})"
```

- [ ] **Step 4: Re-run tests, confirm pass**

Run: `pytest app/backend/tests/test_codegen.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add app/backend/codegen.py app/backend/tests/test_codegen.py
git commit -m "m1: codegen — render SDKEvent as client.method(...) snippet"
```

---

## Task 5: FastAPI app skeleton + deps + WS log route

**Files:**
- Create: `app/backend/deps.py`
- Create: `app/backend/main.py`
- Create: `app/backend/routes/ws.py`

- [ ] **Step 1: Implement shared dependencies**

Create `app/backend/deps.py`:

```python
"""Process-wide singletons: the SDKProxy and WSHub instances FastAPI routes share."""
from functools import lru_cache
from model_security_client.api import ModelSecurityAPIClient
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub

BASE_URL = "https://api.sase.paloaltonetworks.com/aims"


@lru_cache(maxsize=1)
def get_hub() -> WSHub:
    return WSHub()


@lru_cache(maxsize=1)
def get_proxy() -> SDKProxy:
    client = ModelSecurityAPIClient(base_url=BASE_URL)
    return SDKProxy(client, get_hub())
```

- [ ] **Step 2: Implement WS log route**

Create `app/backend/routes/ws.py`:

```python
"""WebSocket route that streams SDK events to a connected client."""
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.backend.deps import get_hub

router = APIRouter()


@router.websocket("/api/ws/log")
async def ws_log(ws: WebSocket) -> None:
    await ws.accept()
    hub = get_hub()
    sub = hub.subscribe()
    try:
        while True:
            try:
                msg = await asyncio.wait_for(sub.get(), timeout=30.0)
                await ws.send_json(msg)
            except asyncio.TimeoutError:
                # Heartbeat so proxies don't kill idle connections.
                await ws.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        hub.unsubscribe(sub)
```

- [ ] **Step 3: Implement FastAPI app factory**

Create `app/backend/main.py`:

```python
"""FastAPI app for the Prisma AIRS Demo UI.

Run: `./run-app.sh` (preferred) or `uvicorn app.backend.main:app --reload`
"""
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.backend.routes import ws as ws_route

FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"


def create_app() -> FastAPI:
    app = FastAPI(title="Prisma AIRS Demo UI", version="0.1.0")
    app.include_router(ws_route.router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Routes added in later tasks are wired here:
    #   from app.backend.routes import env, groups, scans
    #   app.include_router(env.router); app.include_router(groups.router); app.include_router(scans.router)

    if FRONTEND_DIST.exists():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    return app


app = create_app()
```

- [ ] **Step 4: Smoke-test that uvicorn loads**

Run:
```bash
source .venv/bin/activate
set -a && source .env && set +a
uvicorn app.backend.main:app --port 8765 &
sleep 2
curl -s http://localhost:8765/api/health
kill %1 2>/dev/null
```
Expected: `{"status":"ok"}`.

- [ ] **Step 5: Commit**

```bash
git add app/backend/deps.py app/backend/main.py app/backend/routes/ws.py
git commit -m "m1: FastAPI skeleton + WS log streaming route"
```

---

## Task 6: /api/env route

**Files:**
- Create: `app/backend/routes/env.py`
- Modify: `app/backend/main.py`
- Create: `app/backend/tests/test_env_route.py`

- [ ] **Step 1: Write failing test**

Create `app/backend/tests/test_env_route.py`:

```python
from fastapi.testclient import TestClient
from app.backend.main import create_app


def test_env_returns_versions_and_methods():
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
```

- [ ] **Step 2: Run, confirm failure**

Run: `pytest app/backend/tests/test_env_route.py -v`
Expected: 404 or import error.

- [ ] **Step 3: Implement /api/env**

Create `app/backend/routes/env.py`:

```python
"""GET /api/env — versions, base URL, TSG, public SDK methods."""
import os
from importlib.metadata import version, PackageNotFoundError
from fastapi import APIRouter
from model_security_client.api import ModelSecurityAPIClient
from app.backend.deps import BASE_URL

router = APIRouter()


def _safe_version(pkg: str) -> str:
    try:
        return version(pkg)
    except PackageNotFoundError:
        return "unknown"


@router.get("/api/env")
def get_env() -> dict:
    methods = sorted(
        m for m in dir(ModelSecurityAPIClient)
        if not m.startswith("_") and callable(getattr(ModelSecurityAPIClient, m))
    )
    return {
        "sdk_version": _safe_version("model-security-client"),
        "airs_schemas_version": _safe_version("airs-schemas"),
        "base_url": BASE_URL,
        "tsg_id": os.environ.get("TSG_ID", ""),
        "methods": methods,
    }
```

- [ ] **Step 4: Wire route into the app**

Edit `app/backend/main.py`:

1. Update the top-level imports — replace the line `from app.backend.routes import ws as ws_route` with:
   ```python
   from app.backend.routes import ws as ws_route, env as env_route
   ```
2. Inside `create_app()`, after `app.include_router(ws_route.router)`, add:
   ```python
       app.include_router(env_route.router)
   ```

- [ ] **Step 5: Re-run test, confirm pass**

Run: `pytest app/backend/tests/test_env_route.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/backend/routes/env.py app/backend/main.py app/backend/tests/test_env_route.py
git commit -m "m1: /api/env route exposes SDK info"
```

---

## Task 7: /api/groups route

**Files:**
- Create: `app/backend/routes/groups.py`
- Modify: `app/backend/main.py`
- Create: `app/backend/tests/test_groups_route.py`

- [ ] **Step 1: Write failing test (with SDK mocked at the proxy level)**

Create `app/backend/tests/test_groups_route.py`:

```python
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeGroup(BaseModel):
    uuid: str
    name: str
    source_type: str
    description: str | None = None


class FakeList(BaseModel):
    security_groups: list[FakeGroup]


def _override_proxy(groups):
    fake_client = MagicMock()
    fake_client.list_security_groups = MagicMock(return_value=FakeList(security_groups=groups))
    return SDKProxy(fake_client, WSHub())


def test_groups_endpoint_returns_list():
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: _override_proxy([
        FakeGroup(uuid="u1", name="Default HF", source_type="HUGGING_FACE", description="d"),
        FakeGroup(uuid="u2", name="Default S3", source_type="S3"),
    ])
    client = TestClient(app)
    r = client.get("/api/groups")
    assert r.status_code == 200
    body = r.json()
    assert len(body["security_groups"]) == 2
    assert body["security_groups"][0]["name"] == "Default HF"
```

- [ ] **Step 2: Run, confirm failure**

Run: `pytest app/backend/tests/test_groups_route.py -v`
Expected: 404.

- [ ] **Step 3: Implement /api/groups**

Create `app/backend/routes/groups.py`:

```python
"""GET /api/groups — wraps client.list_security_groups()."""
from fastapi import APIRouter, Depends
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy

router = APIRouter()


@router.get("/api/groups")
def list_groups(proxy: SDKProxy = Depends(get_proxy)) -> dict:
    result = proxy.call("list_security_groups")
    # Pydantic v2 → JSON-safe dict.
    return result.model_dump(mode="json")
```

- [ ] **Step 4: Wire route**

Edit `app/backend/main.py`:

1. Update the top-level import line `from app.backend.routes import ws as ws_route, env as env_route` to:
   ```python
   from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route
   ```
2. Inside `create_app()`, after `app.include_router(env_route.router)`, add:
   ```python
       app.include_router(groups_route.router)
   ```

- [ ] **Step 5: Re-run, confirm pass**

Run: `pytest app/backend/tests/test_groups_route.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/backend/routes/groups.py app/backend/main.py app/backend/tests/test_groups_route.py
git commit -m "m1: /api/groups route"
```

---

## Task 8: /api/scans + /api/scan-jobs job runner

**Files:**
- Create: `app/backend/routes/scans.py`
- Modify: `app/backend/main.py`
- Create: `app/backend/tests/test_scans_route.py`

- [ ] **Step 1: Write failing tests**

Create `app/backend/tests/test_scans_route.py`:

```python
import time
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeScanResult(BaseModel):
    scan_id: str
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
        return_value=FakeScanResult(scan_id="s-1", eval_outcome="EvalOutcome.ALLOWED"),
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
    assert body["scan_id"] == "s-1"
    assert body["result"]["eval_outcome"] == "EvalOutcome.ALLOWED"


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
```

- [ ] **Step 2: Run, confirm failure**

Run: `pytest app/backend/tests/test_scans_route.py -v`
Expected: 404s.

- [ ] **Step 3: Implement scan job runner**

Create `app/backend/routes/scans.py`:

```python
"""POST /api/scans starts a scan as a background thread; GET /api/scan-jobs/:id polls it."""
import threading
import uuid as _uuid
from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy

router = APIRouter()


class ScanRequest(BaseModel):
    security_group_uuid: str
    model_uri: str = Field(..., min_length=1)


class JobStatus(BaseModel):
    job_id: str
    status: str  # "pending" | "done" | "error"
    scan_id: str | None = None
    result: dict[str, Any] | None = None
    error: str | None = None


_JOBS: dict[str, JobStatus] = {}
_LOCK = threading.Lock()


def _run_scan_job(job_id: str, proxy: SDKProxy, req: ScanRequest) -> None:
    try:
        result = proxy.call(
            "scan",
            security_group_uuid=UUID(req.security_group_uuid),
            model_uri=req.model_uri,
        )
        dumped = result.model_dump(mode="json") if hasattr(result, "model_dump") else None
        scan_id = getattr(result, "scan_id", None)
        if scan_id is None and isinstance(dumped, dict):
            scan_id = dumped.get("scan_id") or dumped.get("id")
        with _LOCK:
            _JOBS[job_id] = JobStatus(
                job_id=job_id, status="done",
                scan_id=str(scan_id) if scan_id else None,
                result=dumped,
            )
    except Exception as exc:
        with _LOCK:
            _JOBS[job_id] = JobStatus(job_id=job_id, status="error", error=str(exc))


@router.post("/api/scans")
def create_scan(req: ScanRequest, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    job_id = _uuid.uuid4().hex[:12]
    with _LOCK:
        _JOBS[job_id] = JobStatus(job_id=job_id, status="pending")
    t = threading.Thread(target=_run_scan_job, args=(job_id, proxy, req), daemon=True)
    t.start()
    return {"scan_job_id": job_id}


@router.get("/api/scan-jobs/{job_id}")
def get_scan_job(job_id: str) -> JobStatus:
    with _LOCK:
        job = _JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="unknown job")
    return job
```

- [ ] **Step 4: Wire route**

Edit `app/backend/main.py`:

1. Update the top-level import line to:
   ```python
   from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route
   ```
2. Inside `create_app()`, after `app.include_router(groups_route.router)`, add:
   ```python
       app.include_router(scans_route.router)
   ```

- [ ] **Step 5: Re-run, confirm pass**

Run: `pytest app/backend/tests/test_scans_route.py -v`
Expected: 3 passed.

- [ ] **Step 6: Run the whole backend test suite**

Run: `pytest -v`
Expected: All passing.

- [ ] **Step 7: Commit**

```bash
git add app/backend/routes/scans.py app/backend/main.py app/backend/tests/test_scans_route.py
git commit -m "m1: /api/scans background job runner + /api/scan-jobs/:id"
```

---

## Task 9: run-app.sh

**Files:**
- Create: `app/run-app.sh`

- [ ] **Step 1: Write the script**

Create `app/run-app.sh`:

```bash
#!/usr/bin/env bash
# Run the Prisma AIRS Demo UI. Activates the repo venv, loads .env,
# builds the frontend if needed, and starts uvicorn on localhost:8765.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  echo "ERROR: .venv missing — run ./setup-sdk.sh first." >&2
  exit 1
fi
# shellcheck disable=SC1091
source .venv/bin/activate

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing — copy .env.template and fill credentials." >&2
  exit 1
fi
set -a; source .env; set +a

if [[ ! -d app/frontend/dist ]]; then
  echo "==> Frontend not built. Running first-time setup (npm install + build)…"
  pushd app/frontend >/dev/null
  npm install
  npm run build
  popd >/dev/null
fi

PORT="${PORT:-8765}"
echo "==> Starting Prisma AIRS Demo UI on http://localhost:${PORT}"
(sleep 1 && python -c "import webbrowser; webbrowser.open('http://localhost:${PORT}')") &
exec uvicorn app.backend.main:app --host 127.0.0.1 --port "$PORT"
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x app/run-app.sh`

- [ ] **Step 3: Commit**

```bash
git add app/run-app.sh
git commit -m "m1: run-app.sh launcher"
```

---

## Task 10: Frontend scaffold — Vite + TS + Tailwind + shadcn

**Files:**
- Create: `app/frontend/package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `components.json`, `src/main.tsx`, `src/index.css`

- [ ] **Step 1: Scaffold a Vite React-TS project**

Run:
```bash
cd app
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

Expected: `app/frontend/` populated with a default Vite React-TS project.

- [ ] **Step 2: Install Tailwind + shadcn deps**

Run (still in `app/frontend/`):
```bash
npm install -D tailwindcss@^3.4 postcss autoprefixer @types/node
npx tailwindcss init -p
npm install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 3: Configure path alias**

Open `app/frontend/tsconfig.json`. Inside `compilerOptions`, add:

```json
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
```

Also add inside `compilerOptions`: `"types": ["vite/client"]` if not present.

Open `app/frontend/tsconfig.app.json` (if it exists) and add the same `baseUrl` + `paths`.

Replace `app/frontend/vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8765', changeOrigin: true, ws: true },
    },
  },
})
```

- [ ] **Step 4: Configure Tailwind**

Replace `app/frontend/tailwind.config.ts` with:

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: { DEFAULT: '#0a0b0d', raised: '#111216', subtle: '#16171c' },
        border: { DEFAULT: '#1f2024', strong: '#2a2c33' },
        fg: { DEFAULT: '#e6e7eb', dim: '#9aa0aa', faint: '#71727a' },
        accent: { DEFAULT: '#5b8def', muted: '#374a8a' },
        success: '#22d36f',
        danger: '#ff5d6c',
        warn: '#ffaa44',
      },
    },
  },
  plugins: [],
} satisfies Config
```

Replace `app/frontend/src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

html, body, #root { height: 100%; }
body { @apply bg-bg text-fg font-sans antialiased; }
*, *::before, *::after { @apply border-border; }
```

- [ ] **Step 5: Smoke-test the dev server**

Run:
```bash
cd app/frontend
npm run dev
```
Expected: Vite prints a local URL (typically http://localhost:5173). Open it. Default Vite page renders. Kill with Ctrl+C.

- [ ] **Step 6: Commit**

From repo root:
```bash
git add app/frontend/
git commit -m "m1: scaffold Vite + React + Tailwind frontend"
```

---

## Task 11: Frontend lib — types, api client, ws bus, hf validator

**Files:**
- Create: `app/frontend/src/lib/types.ts`
- Create: `app/frontend/src/lib/api.ts`
- Create: `app/frontend/src/lib/ws.ts`
- Create: `app/frontend/src/lib/hf.ts`
- Create: `app/frontend/src/__tests__/hf.test.ts`
- Install Vitest

- [ ] **Step 1: Install Vitest**

Run (in `app/frontend/`):
```bash
npm install -D vitest @vitest/ui
```

Add to `app/frontend/package.json` "scripts":
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: Write shared types**

Create `app/frontend/src/lib/types.ts`:

```typescript
export type SDKEvent = {
  id: string
  method: string
  kwargs: Record<string, unknown>
  status: 'pending' | 'ok' | 'error'
  started_at: number
  duration_ms: number | null
  response_summary: string | null
  response_full: unknown
  error: string | null
}

export type EnvInfo = {
  sdk_version: string
  airs_schemas_version: string
  base_url: string
  tsg_id: string
  methods: string[]
}

export type SecurityGroup = {
  uuid: string
  name: string
  source_type: string
  description: string | null
}

export type GroupsList = { security_groups: SecurityGroup[] }

export type ScanJob = {
  job_id: string
  status: 'pending' | 'done' | 'error'
  scan_id: string | null
  result: Record<string, unknown> | null
  error: string | null
}
```

- [ ] **Step 3: Write REST client**

Create `app/frontend/src/lib/api.ts`:

```typescript
import type { EnvInfo, GroupsList, ScanJob } from './types'

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(path)
  if (!r.ok) throw new Error(`${path} → ${r.status}`)
  return r.json() as Promise<T>
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${path} → ${r.status}`)
  return r.json() as Promise<T>
}

export const api = {
  env: () => jget<EnvInfo>('/api/env'),
  groups: () => jget<GroupsList>('/api/groups'),
  startScan: (body: { security_group_uuid: string; model_uri: string }) =>
    jpost<{ scan_job_id: string }>('/api/scans', body),
  scanJob: (jobId: string) => jget<ScanJob>(`/api/scan-jobs/${jobId}`),
}
```

- [ ] **Step 4: Write WS event bus**

Create `app/frontend/src/lib/ws.ts`:

```typescript
import type { SDKEvent } from './types'

type Listener = (event: SDKEvent | { type: 'ping' }) => void

class LogBus {
  private listeners = new Set<Listener>()
  private ws: WebSocket | null = null
  private reconnectMs = 1000

  connect(): void {
    if (this.ws && this.ws.readyState <= 1) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    this.ws = new WebSocket(`${proto}://${location.host}/api/ws/log`)
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.listeners.forEach((l) => l(data))
      } catch {
        // ignore malformed frames
      }
    }
    this.ws.onclose = () => {
      this.ws = null
      setTimeout(() => this.connect(), this.reconnectMs)
    }
    this.ws.onerror = () => this.ws?.close()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

export const logBus = new LogBus()
```

- [ ] **Step 5: Write HuggingFace URI validator + tests**

Create `app/frontend/src/lib/hf.ts`:

```typescript
// HF model URIs must include an org/author segment.
// Valid:   https://huggingface.co/openai-community/gpt2
// Invalid: https://huggingface.co/gpt2
const HF_RE = /^https:\/\/huggingface\.co\/([\w.\-]+)\/([\w.\-]+)\/?$/

export type HFValidation = { ok: true } | { ok: false; reason: string }

export function validateHuggingFaceUri(uri: string): HFValidation {
  if (!uri.startsWith('https://huggingface.co/')) {
    return { ok: false, reason: 'Must start with https://huggingface.co/' }
  }
  const tail = uri.slice('https://huggingface.co/'.length).replace(/\/$/, '')
  const parts = tail.split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return {
      ok: false,
      reason: 'Missing org/author segment. Use https://huggingface.co/<org>/<model> (e.g. openai-community/gpt2).',
    }
  }
  if (!HF_RE.test(uri.replace(/\/$/, ''))) {
    return { ok: false, reason: 'Unexpected characters in org or model name.' }
  }
  return { ok: true }
}
```

Create `app/frontend/src/__tests__/hf.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateHuggingFaceUri } from '@/lib/hf'

describe('validateHuggingFaceUri', () => {
  it('accepts an org/model URI', () => {
    expect(validateHuggingFaceUri('https://huggingface.co/openai-community/gpt2')).toEqual({ ok: true })
  })
  it('accepts trailing slash', () => {
    expect(validateHuggingFaceUri('https://huggingface.co/openai-community/gpt2/')).toEqual({ ok: true })
  })
  it('rejects single-segment (no org)', () => {
    const r = validateHuggingFaceUri('https://huggingface.co/gpt2')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/org\/author/)
  })
  it('rejects non-huggingface host', () => {
    const r = validateHuggingFaceUri('https://example.com/foo/bar')
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 6: Run tests**

Run (in `app/frontend/`): `npm test`
Expected: 4 passed.

- [ ] **Step 7: Commit**

From repo root:
```bash
git add app/frontend/src/lib app/frontend/src/__tests__ app/frontend/package.json app/frontend/package-lock.json
git commit -m "m1: frontend lib — types, api client, ws bus, hf validator"
```

---

## Task 12: App shell — Sidebar + AppShell + router + Drawer skeleton

**Files:**
- Modify: `app/frontend/package.json` (add react-router-dom)
- Modify: `app/frontend/src/main.tsx`
- Replace: `app/frontend/src/App.tsx`
- Create: `app/frontend/src/components/Sidebar.tsx`
- Create: `app/frontend/src/components/AppShell.tsx`
- Create: `app/frontend/src/components/Drawer/Drawer.tsx`
- Create: `app/frontend/src/components/Drawer/LogTab.tsx`

- [ ] **Step 1: Install react-router-dom**

Run (in `app/frontend/`):
```bash
npm install react-router-dom
```

- [ ] **Step 2: Replace main.tsx**

Replace `app/frontend/src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 3: Replace App.tsx with router shell**

Replace `app/frontend/src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { logBus } from '@/lib/ws'
import { AppShell } from '@/components/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { Scan } from '@/pages/Scan'
import { Environment } from '@/pages/Environment'

export default function App() {
  useEffect(() => { logBus.connect() }, [])
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/environment" element={<Environment />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
```

- [ ] **Step 4: Build Sidebar**

Create `app/frontend/src/components/Sidebar.tsx`:

```typescript
import { NavLink } from 'react-router-dom'
import { Home, ScanLine, Settings2 } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/scan', label: 'Run a scan', icon: ScanLine },
  { to: '/environment', label: 'Environment', icon: Settings2 },
]

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-raised flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <div className="text-sm font-semibold tracking-tight">Prisma AIRS</div>
        <div className="text-xs text-fg-faint">Model Security · Demo UI</div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-bg-subtle text-fg' : 'text-fg-dim hover:text-fg hover:bg-bg-subtle/60'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 text-[10px] text-fg-faint border-t border-border">
        localhost only · single tenant
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Build AppShell**

Create `app/frontend/src/components/AppShell.tsx`:

```typescript
import { ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Drawer } from './Drawer/Drawer'

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(true)
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-8 py-6">{children}</div>
        </main>
      </div>
      <Drawer open={drawerOpen} onToggle={() => setDrawerOpen((v) => !v)} />
    </div>
  )
}
```

- [ ] **Step 6: Build Drawer + LogTab**

Create `app/frontend/src/components/Drawer/Drawer.tsx`:

```typescript
import { ChevronDown, ChevronUp } from 'lucide-react'
import { LogTab } from './LogTab'

export function Drawer({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="border-t border-border bg-bg-raised">
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-fg-faint">Live</span>
          <span className="text-xs font-medium text-fg">Log</span>
          <span className="text-[10px] text-fg-faint">REPL · Code (coming in M4)</span>
        </div>
        <button onClick={onToggle} className="text-fg-dim hover:text-fg" aria-label="Toggle drawer">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="h-64 border-t border-border overflow-hidden">
          <LogTab />
        </div>
      )}
    </div>
  )
}
```

Create `app/frontend/src/components/Drawer/LogTab.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react'
import type { SDKEvent } from '@/lib/types'
import { logBus } from '@/lib/ws'

type Row = SDKEvent
const MAX_ROWS = 200

export function LogTab() {
  const [rows, setRows] = useState<Row[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return logBus.subscribe((msg) => {
      if ('type' in msg && msg.type === 'ping') return
      const event = msg as SDKEvent
      setRows((prev) => {
        // Update existing pending row when its ok/error arrives, else prepend.
        const i = prev.findIndex((r) => r.id === event.id)
        if (i >= 0) {
          const next = prev.slice()
          next[i] = event
          return next
        }
        return [event, ...prev].slice(0, MAX_ROWS)
      })
    })
  }, [])

  return (
    <div ref={scrollRef} className="h-full overflow-auto font-mono text-[11px]">
      <table className="w-full">
        <thead className="sticky top-0 bg-bg-raised text-fg-faint">
          <tr className="border-b border-border">
            <th className="text-left px-3 py-1.5 font-normal">Status</th>
            <th className="text-left px-3 py-1.5 font-normal">Method</th>
            <th className="text-left px-3 py-1.5 font-normal">Args</th>
            <th className="text-right px-3 py-1.5 font-normal">ms</th>
            <th className="text-left px-3 py-1.5 font-normal">Response / Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/40">
              <td className="px-3 py-1">
                <StatusPill status={r.status} />
              </td>
              <td className="px-3 py-1 text-fg">{r.method}</td>
              <td className="px-3 py-1 text-fg-dim truncate max-w-xs">{JSON.stringify(r.kwargs)}</td>
              <td className="px-3 py-1 text-right text-fg-faint">{r.duration_ms?.toFixed(0) ?? '·'}</td>
              <td className="px-3 py-1 text-fg-dim truncate max-w-md">
                {r.status === 'error' ? <span className="text-danger">{r.error}</span> : r.response_summary ?? '·'}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-4 text-fg-faint">Waiting for SDK activity…</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status }: { status: SDKEvent['status'] }) {
  const cls =
    status === 'ok' ? 'bg-success/20 text-success' :
    status === 'error' ? 'bg-danger/20 text-danger' :
    'bg-accent/20 text-accent'
  return <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${cls}`}>{status}</span>
}
```

- [ ] **Step 7: Create stub pages so router compiles**

Create three minimal files (real content arrives in later tasks):

`app/frontend/src/pages/Dashboard.tsx`:
```typescript
export function Dashboard() { return <div>Dashboard (stub)</div> }
```

`app/frontend/src/pages/Scan.tsx`:
```typescript
export function Scan() { return <div>Scan (stub)</div> }
```

`app/frontend/src/pages/Environment.tsx`:
```typescript
export function Environment() { return <div>Environment (stub)</div> }
```

- [ ] **Step 8: Smoke-test build**

Run (in `app/frontend/`):
```bash
npm run build
```
Expected: TypeScript compiles, Vite builds, output written to `dist/`.

- [ ] **Step 9: Commit**

From repo root:
```bash
git add app/frontend/
git commit -m "m1: app shell — sidebar, router, drawer + Log tab"
```

---

## Task 13: Dashboard page

**Files:**
- Replace: `app/frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Implement Dashboard**

Replace `app/frontend/src/pages/Dashboard.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EnvInfo, GroupsList } from '@/lib/types'
import { api } from '@/lib/api'
import { ScanLine } from 'lucide-react'

export function Dashboard() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [groups, setGroups] = useState<GroupsList | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.env(), api.groups()])
      .then(([e, g]) => { setEnv(e); setGroups(g) })
      .catch((e) => setErr(String(e)))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-fg-dim mt-1">Tenant snapshot and quick actions.</p>
      </div>

      {err && <div className="text-danger text-sm">{err}</div>}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="SDK version" value={env?.sdk_version ?? '…'} />
        <Stat label="airs-schemas" value={env?.airs_schemas_version ?? '…'} />
        <Stat label="Security groups" value={groups ? String(groups.security_groups.length) : '…'} />
      </div>

      <div className="bg-bg-raised border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Run a scan</div>
            <div className="text-xs text-fg-dim mt-0.5">HuggingFace · S3 · GCS · Azure · LOCAL</div>
          </div>
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 bg-accent text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent/90"
          >
            <ScanLine className="w-4 h-4" /> Start
          </Link>
        </div>
      </div>

      <div className="bg-bg-raised border border-border rounded-lg p-4">
        <div className="text-sm font-medium mb-3">Security groups</div>
        <div className="divide-y divide-border">
          {groups?.security_groups.map((g) => (
            <div key={g.uuid} className="flex justify-between py-2 text-sm">
              <div className="font-medium">{g.name}</div>
              <div className="font-mono text-xs text-fg-dim">{g.source_type}</div>
            </div>
          ))}
          {groups && groups.security_groups.length === 0 && (
            <div className="text-fg-faint text-sm">No groups found.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-raised border border-border rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="text-lg font-semibold mt-1 font-mono">{value}</div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke-test build**

Run (in `app/frontend/`): `npm run build`
Expected: builds cleanly.

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Dashboard.tsx
git commit -m "m1: Dashboard page"
```

---

## Task 14: Scan page (the headline demo)

**Files:**
- Replace: `app/frontend/src/pages/Scan.tsx`

- [ ] **Step 1: Implement Scan page**

Replace `app/frontend/src/pages/Scan.tsx`:

```typescript
import { useEffect, useState } from 'react'
import type { GroupsList, ScanJob, SecurityGroup } from '@/lib/types'
import { api } from '@/lib/api'
import { validateHuggingFaceUri } from '@/lib/hf'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type SourceType = 'HUGGING_FACE' | 'S3' | 'GCS' | 'AZURE' | 'LOCAL'

const SAMPLE_HF: { label: string; uri: string }[] = [
  { label: 'microsoft/DialoGPT-medium (expected clean)', uri: 'https://huggingface.co/microsoft/DialoGPT-medium' },
  { label: 'ykilcher/totally-harmless-model (known unsafe)', uri: 'https://huggingface.co/ykilcher/totally-harmless-model' },
]

export function Scan() {
  const [groups, setGroups] = useState<SecurityGroup[]>([])
  const [sourceType, setSourceType] = useState<SourceType>('HUGGING_FACE')
  const [groupUuid, setGroupUuid] = useState<string>('')
  const [uri, setUri] = useState<string>('')
  const [job, setJob] = useState<ScanJob | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api.groups().then((g: GroupsList) => setGroups(g.security_groups)).catch((e) => setErr(String(e)))
  }, [])

  const filteredGroups = groups.filter((g) => g.source_type.includes(sourceType))
  useEffect(() => {
    if (filteredGroups.length > 0 && !filteredGroups.find((g) => g.uuid === groupUuid)) {
      setGroupUuid(filteredGroups[0].uuid)
    }
  }, [sourceType, groups])

  const hfCheck = sourceType === 'HUGGING_FACE' && uri ? validateHuggingFaceUri(uri) : { ok: true as const }
  const canSubmit = !!groupUuid && !!uri && hfCheck.ok && (!job || job.status !== 'pending')

  async function submit() {
    setErr(null); setJob(null)
    try {
      const { scan_job_id } = await api.startScan({ security_group_uuid: groupUuid, model_uri: uri })
      pollJob(scan_job_id)
    } catch (e) { setErr(String(e)) }
  }

  function pollJob(jobId: string) {
    setJob({ job_id: jobId, status: 'pending', scan_id: null, result: null, error: null })
    const tick = async () => {
      try {
        const j = await api.scanJob(jobId)
        setJob(j)
        if (j.status === 'pending') setTimeout(tick, 600)
      } catch (e) { setErr(String(e)) }
    }
    setTimeout(tick, 600)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Run a scan</h1>
        <p className="text-sm text-fg-dim mt-1">Pick a source type and security group, paste a model URI, hit scan.</p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}

      <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-4">
        <Field label="Source type">
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full"
          >
            {(['HUGGING_FACE', 'S3', 'GCS', 'AZURE', 'LOCAL'] as SourceType[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Security group">
          <select
            value={groupUuid}
            onChange={(e) => setGroupUuid(e.target.value)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full"
          >
            {filteredGroups.map((g) => (
              <option key={g.uuid} value={g.uuid}>{g.name} ({g.uuid.slice(0, 8)}…)</option>
            ))}
            {filteredGroups.length === 0 && <option>No group for this source type</option>}
          </select>
        </Field>

        <Field label="Model URI">
          <input
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://huggingface.co/openai-community/gpt2"
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full font-mono"
          />
          {sourceType === 'HUGGING_FACE' && !hfCheck.ok && (
            <div className="text-warn text-xs mt-1">{hfCheck.reason}</div>
          )}
          {sourceType === 'HUGGING_FACE' && (
            <div className="text-fg-faint text-xs mt-2">
              Quick picks: {SAMPLE_HF.map((s) => (
                <button
                  key={s.uri}
                  onClick={() => setUri(s.uri)}
                  className="underline mr-3 hover:text-fg"
                >{s.label}</button>
              ))}
            </div>
          )}
        </Field>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {job?.status === 'pending' ? 'Scanning…' : 'Start scan'}
        </button>
      </div>

      {job && (
        <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <JobIcon status={job.status} />
            <span className="font-mono text-xs text-fg-dim">job {job.job_id}</span>
            <span className="text-fg-dim">·</span>
            <span className="text-fg">{job.status}</span>
          </div>
          {job.status === 'done' && (
            <>
              <Row k="Scan ID" v={job.scan_id ?? '—'} mono />
              <Row k="Verdict" v={String((job.result as any)?.eval_outcome ?? '—')} />
              <details className="text-xs">
                <summary className="text-fg-dim cursor-pointer">Raw response</summary>
                <pre className="mt-2 p-3 bg-bg-subtle rounded font-mono text-[11px] overflow-auto">
{JSON.stringify(job.result, null, 2)}
                </pre>
              </details>
              <div className="text-xs text-fg-faint">
                Detailed per-file findings live in Strata Cloud Manager → Insights → Prisma AIRS → Model Security → Scans
                {job.scan_id ? ` (scan ${job.scan_id})` : ''}.
              </div>
            </>
          )}
          {job.status === 'error' && <div className="text-danger text-sm font-mono">{job.error}</div>}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-border/40">
      <div className="text-fg-dim">{k}</div>
      <div className={mono ? 'font-mono text-xs' : 'text-fg'}>{v}</div>
    </div>
  )
}

function JobIcon({ status }: { status: ScanJob['status'] }) {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-success" />
  if (status === 'error') return <XCircle className="w-4 h-4 text-danger" />
  return <Loader2 className="w-4 h-4 text-accent animate-spin" />
}
```

- [ ] **Step 2: Build**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Scan.tsx
git commit -m "m1: Scan page with HF validator + job polling"
```

---

## Task 15: Environment page

**Files:**
- Replace: `app/frontend/src/pages/Environment.tsx`

- [ ] **Step 1: Implement Environment**

Replace `app/frontend/src/pages/Environment.tsx`:

```typescript
import { useEffect, useState } from 'react'
import type { EnvInfo } from '@/lib/types'
import { api } from '@/lib/api'

export function Environment() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { api.env().then(setEnv).catch((e) => setErr(String(e))) }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Environment</h1>
        <p className="text-sm text-fg-dim mt-1">SDK install info, tenant, and available client methods.</p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}

      <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-1">
        <Row k="SDK version" v={env?.sdk_version ?? '…'} />
        <Row k="airs-schemas version" v={env?.airs_schemas_version ?? '…'} />
        <Row k="Base URL" v={env?.base_url ?? '…'} />
        <Row k="TSG ID" v={env?.tsg_id || '(not set in process env)'} />
      </div>

      <div className="bg-bg-raised border border-border rounded-lg p-4">
        <div className="text-sm font-medium mb-2">ModelSecurityAPIClient methods</div>
        <div className="text-xs text-fg-faint mb-3">{env?.methods.length ?? 0} public methods</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
          {env?.methods.map((m) => (
            <div key={m} className="text-fg-dim">client.<span className="text-fg">{m}</span>()</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
      <div className="text-fg-dim">{k}</div>
      <div className="font-mono text-xs text-fg">{v}</div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Environment.tsx
git commit -m "m1: Environment page"
```

---

## Task 16: README + manual smoke test

**Files:**
- Create: `app/README.md`

- [ ] **Step 1: Write app/README.md**

Create `app/README.md`:

```markdown
# Prisma AIRS Demo UI

Local web app for demoing and exploring Prisma AIRS Model Security.

## Prerequisites

- Repo `.venv` set up via `./setup-sdk.sh` (root)
- Repo `.env` populated with `MODEL_SECURITY_CLIENT_ID`, `MODEL_SECURITY_CLIENT_SECRET`, `TSG_ID`
- Node 20+ (for the first-time frontend build)

## Run

```bash
./app/run-app.sh
```

Opens http://localhost:8765 in your default browser. First run installs and builds the frontend (slow); subsequent runs are fast.

## Development

Backend hot-reload:
```bash
source .venv/bin/activate
set -a && source .env && set +a
uvicorn app.backend.main:app --reload --port 8765
```

Frontend dev server (proxies `/api` to 8765):
```bash
cd app/frontend
npm run dev
```

## Tests

```bash
pytest                       # backend
cd app/frontend && npm test  # frontend
```

## Manual smoke test (M1)

1. Run `./app/run-app.sh`.
2. **Dashboard** loads, showing SDK + airs-schemas versions and a count of security groups.
3. **Environment** lists all `ModelSecurityAPIClient` public methods.
4. **Run a scan**: pick HUGGING_FACE → group auto-fills → click "microsoft/DialoGPT-medium" quick-pick → Start scan.
5. **Live drawer** at the bottom shows a `pending` row for `list_security_groups`, then `ok`. After scan submit, shows `pending` then `ok`/`error` for `scan`.
6. Scan result panel appears with verdict, scan ID, and a "raw response" details disclosure.

## Security note

This app is bound to `127.0.0.1` and holds full SDK credentials. Do not expose it on a non-loopback interface.
```

- [ ] **Step 2: Run the full backend suite once more**

```bash
source .venv/bin/activate
pytest -v
```
Expected: all backend tests pass.

- [ ] **Step 3: Run frontend tests + build**

```bash
cd app/frontend
npm test
npm run build
```
Expected: tests pass, build succeeds.

- [ ] **Step 4: Manual smoke test**

From repo root:
```bash
./app/run-app.sh
```

Walk through the 6-step manual smoke test above. Confirm each step works. If any fails, fix before committing.

- [ ] **Step 5: Commit**

```bash
git add app/README.md
git commit -m "m1: README + smoke test instructions"
```

---

## Final verification

- [ ] All Python tests pass (`pytest -v`)
- [ ] All frontend tests pass (`cd app/frontend && npm test`)
- [ ] Frontend builds (`cd app/frontend && npm run build`)
- [ ] Manual smoke test passes end-to-end
- [ ] `git status` clean
