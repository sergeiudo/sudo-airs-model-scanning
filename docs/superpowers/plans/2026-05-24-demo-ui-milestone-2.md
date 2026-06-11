# Demo UI — Milestone 2 Implementation Plan (Scans)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Scans surface of the Demo UI feel like a finished product: a polished verdict card, a scan history list, a per-scan detail page, advanced scan options, a side-by-side comparison view, and a real deep-link to Strata Cloud Manager. Replaces the current raw-JSON-dump output with a presentable verdict story for live demos.

**Architecture:** Adds two new REST routes (`GET /api/scans`, `GET /api/scans/:scan_uuid`) and three new frontend pages (`/scans`, `/scans/:id`, `/compare`). Reuses the existing `SDKProxy` chokepoint, WS log streaming, and dependency-injection test pattern from M1. No new external dependencies. SCM deep-links are produced by a single `scm_scan_url()` helper served from `/api/env` so the URL pattern lives in one place.

**Tech Stack:** Python 3.12 · FastAPI · pytest · React 19 · Vite · TypeScript · Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md`

**Previous milestone:** `docs/superpowers/plans/2026-05-23-demo-ui-milestone-1.md` (shipped — `/`, `/scan`, `/environment` with Log drawer).

**What's in M2:**
- Backend: `GET /api/scans` (`list_scans` wrapper, filters), `GET /api/scans/:uuid` (`get_scan` wrapper), advanced scan options on `POST /api/scans`, `scm_scan_url` helper, `scm_base` on `/api/env`.
- Frontend pages: `/scans` (history table with filters), `/scans/:id` (detail with verdict card + rules bar + model-format chips + file stats + SCM deep-link + raw JSON), `/compare` (pick two scans, render side-by-side).
- Frontend polish on existing surfaces: `/scan` gets a `VerdictCard`, an "Advanced options" accordion (allow/ignore patterns, polling), and an auto-redirect-to-detail toggle; `Dashboard` gets a tenant chip and a "last 5 scans" widget.
- Reusable display components: `VerdictCard`, `RulesSummary`, `ModelFormatsChips`, `FilesScannedStats`, `ScmDeepLink`.

**Explicitly NOT in M2 (deferred to M3/M4):**
- `/groups` detail with rules + rule instances (M3)
- `/models` browser (M3)
- REPL tab + Code tab in drawer (M4)
- Pydantic schema browser on `/environment` (M4)
- CI/CD YAML generator (M4)

---

## Pre-flight context for the implementer

Read these before starting:

- `CLAUDE.md` — proprietary SDK install notes; key SDK usage patterns; never pass credentials as args.
- `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md` — the design this milestone completes.
- `docs/superpowers/plans/2026-05-23-demo-ui-milestone-1.md` — the M1 plan whose conventions, file layout, and test patterns this plan extends.
- `app/backend/sdk_proxy.py`, `app/backend/ws_hub.py`, `app/backend/deps.py`, `app/backend/main.py`, `app/backend/routes/scans.py` — current state of backend.
- `app/frontend/src/pages/Scan.tsx`, `app/frontend/src/lib/{api.ts,types.ts}`, `app/frontend/src/components/Sidebar.tsx`, `app/frontend/src/components/Drawer/LogTab.tsx` — current state of frontend.
- `examples/scan_huggingface_model.py`, `notebooks/prisma-airs-interactive-model-security.ipynb` — show the SDK return shape (`.eval_outcome`, `.eval_summary.{rules_passed,rules_failed,total_rules}`, `.uuid`, `.model_formats`, `.total_files_scanned`, `.total_files_skipped`, `.scanner_version`).

**Conventions (unchanged from M1):**
- Paths relative to repo root unless prefixed with `app/`.
- Backend Python: type hints everywhere, Pydantic v2.
- Frontend: TypeScript strict, no `any` outside untyped boundaries.
- Tailwind tokens already defined in `tailwind.config.ts`: `bg`, `bg-raised`, `bg-subtle`, `border`, `fg`, `fg-dim`, `fg-faint`, `accent`, `success`, `danger`, `warn`. Use these — don't invent new colours.
- Commit after every passing task. Commit messages: `m2: <short description>`.

**SDK return shape (canonical names used in this plan):**
- `scan()` and `get_scan(UUID)` return an object with `.uuid` (the scan UUID — NOT `.scan_id`), `.eval_outcome` (serialises to bare string `"ALLOWED"`/`"BLOCKED"`/`"WARNING"` via `model_dump(mode="json")`), `.eval_summary.rules_passed`, `.eval_summary.rules_failed`, `.eval_summary.total_rules`, `.model_uri`, `.created_at`, `.updated_at`, `.scanner_version`, `.model_formats` (list of strings), `.total_files_scanned`, `.total_files_skipped`, `.security_group_uuid`, `.security_group_name`, `.source_type`, `.error_code`, `.error_message`.
- `list_scans(limit=N)` returns an object with `.scans` — each entry has the subset `.uuid`, `.model_uri`, `.eval_outcome`, `.eval_summary`, `.created_at`, `.source_type`.

The current `/api/scans` POST handler in `app/backend/routes/scans.py:38-47` looks for `.scan_id` and falls back to dict keys `"scan_id"`/`"id"`. Per the screenshot reality the field is `.uuid` — Task 1 fixes this.

---

## File map (what gets created or modified)

```
app/
├── backend/
│   ├── routes/
│   │   ├── env.py                  # MODIFY: add scm_base to /api/env response
│   │   ├── scans.py                # MODIFY: list/detail routes, scan_id->uuid fix, advanced options
│   │   └── scm.py                  # CREATE: scm_scan_url() helper (single source of SCM URL truth)
│   └── tests/
│       ├── test_env_route.py       # MODIFY: assert scm_base in payload
│       ├── test_scans_route.py     # MODIFY: cover list, detail, advanced options
│       └── test_scm.py             # CREATE: unit-test the URL helper
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts              # MODIFY: listScans, getScan
│   │   │   ├── types.ts            # MODIFY: ScanSummary, ScanDetail, EnvInfo gains scm_base
│   │   │   └── scm.ts              # CREATE: small client-side URL helper
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # MODIFY: add Scans + Compare links
│   │   │   ├── ScanResult/
│   │   │   │   ├── VerdictCard.tsx     # CREATE
│   │   │   │   ├── RulesSummary.tsx    # CREATE
│   │   │   │   ├── ModelFormatsChips.tsx # CREATE
│   │   │   │   ├── FilesScannedStats.tsx # CREATE
│   │   │   │   └── ScmDeepLink.tsx     # CREATE
│   │   │   └── ScansTable.tsx          # CREATE (used on /scans and /compare picker)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # MODIFY: tenant chip + last 5 scans
│   │   │   ├── Scan.tsx            # MODIFY: VerdictCard inline, advanced options, auto-redirect toggle
│   │   │   ├── ScansList.tsx       # CREATE  → /scans
│   │   │   ├── ScanDetail.tsx      # CREATE  → /scans/:id
│   │   │   └── Compare.tsx         # CREATE  → /compare
│   │   ├── App.tsx                 # MODIFY: wire the three new routes
│   │   └── __tests__/
│   │       └── verdict.test.tsx    # CREATE: VerdictCard render snapshot
└── README.md                       # MODIFY: smoke-test additions
app/README.md                        # MODIFY: smoke-test additions
```

---

## Task 1: Backend — fix scan_id resolution, accept advanced options on POST /api/scans

The current POST handler at `app/backend/routes/scans.py:31-50` extracts `scan_id` via `getattr(result, "scan_id", …)` which returns `None` for every real scan (the SDK field is `.uuid`). It also accepts only two fields in `ScanRequest`. This task fixes the resolution and adds the four advanced options the notebook surfaces (`allow_patterns`, `ignore_patterns`, `poll_interval_secs`, `poll_timeout_secs`).

**Files:**
- Modify: `app/backend/routes/scans.py`
- Modify: `app/backend/tests/test_scans_route.py`

- [ ] **Step 1: Update the failing test in test_scans_route.py**

Replace `app/backend/tests/test_scans_route.py` with:

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
```

- [ ] **Step 2: Run tests, confirm two fail**

Run: `pytest app/backend/tests/test_scans_route.py -v`
Expected: `test_create_scan_job_returns_job_id_then_completes` fails (scan_id is `None`); `test_advanced_options_forwarded_to_sdk` fails (kwargs not forwarded).

- [ ] **Step 3: Update routes/scans.py to resolve uuid and forward options**

Replace `app/backend/routes/scans.py`:

```python
"""POST /api/scans starts a scan as a background thread; GET /api/scan-jobs/:id polls it.
GET /api/scans and /api/scans/:uuid are added in subsequent tasks."""
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
    allow_patterns: list[str] | None = None
    ignore_patterns: list[str] | None = None
    poll_interval_secs: int | None = None
    poll_timeout_secs: int | None = None


class JobStatus(BaseModel):
    job_id: str
    status: str  # "pending" | "done" | "error"
    scan_id: str | None = None
    result: dict[str, Any] | None = None
    error: str | None = None


_JOBS: dict[str, JobStatus] = {}
_LOCK = threading.Lock()


def _resolve_scan_uuid(result: Any, dumped: dict | None) -> str | None:
    """SDK returns `.uuid`. Fall back to legacy attribute/key names just in case."""
    for attr in ("uuid", "scan_id", "id"):
        v = getattr(result, attr, None)
        if v is not None:
            return str(v)
    if isinstance(dumped, dict):
        for k in ("uuid", "scan_id", "id"):
            if dumped.get(k):
                return str(dumped[k])
    return None


def _run_scan_job(job_id: str, proxy: SDKProxy, req: ScanRequest) -> None:
    try:
        kwargs: dict[str, Any] = {
            "security_group_uuid": UUID(req.security_group_uuid),
            "model_uri": req.model_uri,
        }
        if req.allow_patterns is not None:
            kwargs["allow_patterns"] = req.allow_patterns
        if req.ignore_patterns is not None:
            kwargs["ignore_patterns"] = req.ignore_patterns
        if req.poll_interval_secs is not None:
            kwargs["poll_interval_secs"] = req.poll_interval_secs
        if req.poll_timeout_secs is not None:
            kwargs["poll_timeout_secs"] = req.poll_timeout_secs

        result = proxy.call("scan", **kwargs)
        dumped = result.model_dump(mode="json") if hasattr(result, "model_dump") else None
        scan_id = _resolve_scan_uuid(result, dumped)
        with _LOCK:
            _JOBS[job_id] = JobStatus(
                job_id=job_id, status="done",
                scan_id=scan_id, result=dumped,
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

- [ ] **Step 4: Re-run tests, confirm pass**

Run: `pytest app/backend/tests/test_scans_route.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add app/backend/routes/scans.py app/backend/tests/test_scans_route.py
git commit -m "m2: resolve scan uuid + accept advanced scan options"
```

---

## Task 2: Backend — GET /api/scans (history list)

Wrap `client.list_scans(limit=N)`. Frontend filters happen client-side because the SDK does not expose verdict/source filters in `list_scans`; we just paginate by limit and the page filters in the table.

**Files:**
- Modify: `app/backend/routes/scans.py` (append the list route)
- Modify: `app/backend/tests/test_scans_route.py` (append list test)

- [ ] **Step 1: Append the failing list test**

Append to `app/backend/tests/test_scans_route.py`:

```python
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
```

- [ ] **Step 2: Run, confirm failure**

Run: `pytest app/backend/tests/test_scans_route.py -v -k list_scans`
Expected: 404 (route doesn't exist yet).

- [ ] **Step 3: Add the route**

Append to `app/backend/routes/scans.py` (after the existing `get_scan_job` handler):

```python
@router.get("/api/scans")
def list_scans(limit: int = 50, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    """Wrap client.list_scans(limit=N). Filtering happens client-side in the React table."""
    limit = max(1, min(limit, 200))
    result = proxy.call("list_scans", limit=limit)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"scans": []}
```

- [ ] **Step 4: Re-run tests, confirm pass**

Run: `pytest app/backend/tests/test_scans_route.py -v`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add app/backend/routes/scans.py app/backend/tests/test_scans_route.py
git commit -m "m2: GET /api/scans (list_scans wrapper)"
```

---

## Task 3: Backend — GET /api/scans/:scan_uuid (detail)

Wrap `client.get_scan(UUID(scan_uuid))`. Returns the full Pydantic dump. The notebook calls `get_scan` with a positional `UUID`, but the current `SDKProxy.call` signature is `(method, **kwargs)` only — no `*args`. This task widens `SDKProxy.call` to accept positional args as well, then uses that for `get_scan`.

**Files:**
- Modify: `app/backend/sdk_proxy.py`
- Modify: `app/backend/tests/test_sdk_proxy.py`
- Modify: `app/backend/routes/scans.py`
- Modify: `app/backend/tests/test_scans_route.py`

- [ ] **Step 1: Widen SDKProxy.call to accept positional args**

In `app/backend/sdk_proxy.py`, change the signature and forwarding of `call`. Replace the `def call(...)` block (the current method starts at the `def call(self, method: str, **kwargs: Any) -> Any:` line) with:

```python
    def call(self, method: str, *args: Any, **kwargs: Any) -> Any:
        event_id = _uuid.uuid4().hex[:12]
        safe_kwargs = {k: _json_safe(v) for k, v in kwargs.items()}
        # Positional args are folded into kwargs as arg0, arg1, … for log/codegen visibility.
        for i, a in enumerate(args):
            safe_kwargs.setdefault(f"arg{i}", _json_safe(a))
        started = time.time()

        pending = SDKEvent(
            id=event_id, method=method, kwargs=safe_kwargs,
            status="pending", started_at=started,
        )
        self._publish(pending)

        try:
            result = getattr(self._client, method)(*args, **kwargs)
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
```

Append a covering test at the end of `app/backend/tests/test_sdk_proxy.py`:

```python
async def test_call_forwards_positional_args(fake_client):
    fake_client.get_thing = lambda x: x * 2  # type: ignore[attr-defined]
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(fake_client, hub)
    result = proxy.call("get_thing", 21)
    assert result == 42
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    # Positional arg shows up in the log as arg0.
    assert events[0]["kwargs"] == {"arg0": 21}
```

Run: `pytest app/backend/tests/test_sdk_proxy.py -v`
Expected: all passed (including new one).

- [ ] **Step 2: Append the failing detail-route test**

Append to `app/backend/tests/test_scans_route.py`:

```python
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
    app = create_app()
    client = TestClient(app)
    r = client.get("/api/scans/not-a-uuid")
    assert r.status_code == 400
```

- [ ] **Step 3: Run, confirm failure**

Run: `pytest app/backend/tests/test_scans_route.py -v -k get_scan`
Expected: 404 / NotImplemented.

- [ ] **Step 4: Add the route**

Append to `app/backend/routes/scans.py`:

```python
@router.get("/api/scans/{scan_uuid}")
def get_scan_detail(scan_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    try:
        parsed = UUID(scan_uuid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid scan uuid: {exc}") from exc
    result = proxy.call("get_scan", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {}
```

Note: The SDK's `get_scan` accepts a positional `UUID`. If your SDK build only takes a keyword argument, change `proxy.call("get_scan", parsed)` to `proxy.call("get_scan", scan_uuid=parsed)` (the test asserts on either pattern).

- [ ] **Step 5: Re-run tests, confirm pass**

Run: `pytest app/backend/tests/test_scans_route.py -v`
Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
git add app/backend/sdk_proxy.py app/backend/tests/test_sdk_proxy.py \
        app/backend/routes/scans.py app/backend/tests/test_scans_route.py
git commit -m "m2: GET /api/scans/:uuid (get_scan wrapper) + SDKProxy *args support"
```

---

## Task 4: Backend — SCM URL helper + expose scm_base on /api/env

One file owns the SCM URL pattern so changing it later is a one-line edit. The base URL is published via `/api/env` so the frontend `ScmDeepLink` component reads it on first load.

**Files:**
- Create: `app/backend/routes/scm.py`
- Create: `app/backend/tests/test_scm.py`
- Modify: `app/backend/routes/env.py`
- Modify: `app/backend/tests/test_env_route.py`

- [ ] **Step 1: Write the failing helper test**

Create `app/backend/tests/test_scm.py`:

```python
from app.backend.routes.scm import scm_scan_url, SCM_BASE


def test_base_is_strata_paloalto():
    assert SCM_BASE.startswith("https://strata.paloaltonetworks.com")


def test_scan_url_includes_uuid_and_base():
    url = scm_scan_url("d110c5a5-27a0-459e-9556-eda7196c6ac3")
    assert url.startswith(SCM_BASE)
    assert "d110c5a5-27a0-459e-9556-eda7196c6ac3" in url


def test_scan_url_rejects_empty():
    import pytest
    with pytest.raises(ValueError):
        scm_scan_url("")
```

- [ ] **Step 2: Run, confirm failure**

Run: `pytest app/backend/tests/test_scm.py -v`
Expected: ImportError.

- [ ] **Step 3: Implement helper**

Create `app/backend/routes/scm.py`:

```python
"""Single source of truth for Strata Cloud Manager deep-link URLs.

The path pattern below is the user-facing UI route for an individual model-security
scan as of M2. If Palo Alto rearranges Strata, this is the only place to update."""

SCM_BASE = "https://strata.paloaltonetworks.com"
SCM_SCAN_PATH = "/dashboard/aims/insights/prisma-airs/model-security/scans/{uuid}"


def scm_scan_url(scan_uuid: str) -> str:
    if not scan_uuid:
        raise ValueError("scan_uuid is required")
    return SCM_BASE + SCM_SCAN_PATH.format(uuid=scan_uuid)
```

- [ ] **Step 4: Re-run helper tests, confirm pass**

Run: `pytest app/backend/tests/test_scm.py -v`
Expected: 3 passed.

- [ ] **Step 5: Update env route + its test to expose scm_base**

Replace `app/backend/routes/env.py`:

```python
"""GET /api/env — versions, base URL, TSG, SCM deep-link base, public SDK methods."""
import os
from importlib.metadata import version, PackageNotFoundError
from fastapi import APIRouter
from model_security_client.api import ModelSecurityAPIClient
from app.backend.deps import BASE_URL
from app.backend.routes.scm import SCM_BASE, SCM_SCAN_PATH

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
        "scm_base": SCM_BASE,
        "scm_scan_path": SCM_SCAN_PATH,
        "methods": methods,
    }
```

Replace `app/backend/tests/test_env_route.py`:

```python
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
```

- [ ] **Step 6: Re-run env tests, confirm pass**

Run: `pytest app/backend/tests/test_env_route.py app/backend/tests/test_scm.py -v`
Expected: all passed.

- [ ] **Step 7: Commit**

```bash
git add app/backend/routes/scm.py app/backend/tests/test_scm.py app/backend/routes/env.py app/backend/tests/test_env_route.py
git commit -m "m2: SCM deep-link helper + expose scm_base on /api/env"
```

---

## Task 5: Frontend — types, api client, SCM helper

**Files:**
- Modify: `app/frontend/src/lib/types.ts`
- Modify: `app/frontend/src/lib/api.ts`
- Create: `app/frontend/src/lib/scm.ts`

- [ ] **Step 1: Extend types**

Replace `app/frontend/src/lib/types.ts`:

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
  scm_base: string
  scm_scan_path: string  // contains "{uuid}" placeholder
  methods: string[]
}

export type SecurityGroup = {
  uuid: string
  name: string
  source_type: string
  description: string | null
}

export type GroupsList = { security_groups: SecurityGroup[] }

export type EvalSummary = {
  rules_passed: number
  rules_failed: number
  total_rules: number
}

export type EvalOutcome = 'ALLOWED' | 'BLOCKED' | 'WARNING' | 'ERROR' | string

export type ScanSummary = {
  uuid: string
  model_uri: string
  eval_outcome: EvalOutcome
  eval_summary?: EvalSummary
  created_at: string
  source_type?: string
}

export type ScanDetail = ScanSummary & {
  updated_at?: string
  scanner_version?: string
  model_formats?: string[]
  total_files_scanned?: number
  total_files_skipped?: number
  enabled_rule_count_snapshot?: number
  security_group_uuid?: string
  security_group_name?: string
  error_code?: string | null
  error_message?: string | null
  // Anything else the SDK adds is preserved as raw JSON in the detail view.
  [extra: string]: unknown
}

export type ScansList = { scans: ScanSummary[] }

export type ScanJob = {
  job_id: string
  status: 'pending' | 'done' | 'error'
  scan_id: string | null
  result: ScanDetail | null
  error: string | null
}

export type ScanRequestAdvanced = {
  allow_patterns?: string[]
  ignore_patterns?: string[]
  poll_interval_secs?: number
  poll_timeout_secs?: number
}
```

- [ ] **Step 2: Extend api client**

Replace `app/frontend/src/lib/api.ts`:

```typescript
import type { EnvInfo, GroupsList, ScanDetail, ScanJob, ScansList, ScanRequestAdvanced } from './types'

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
  startScan: (body: { security_group_uuid: string; model_uri: string } & ScanRequestAdvanced) =>
    jpost<{ scan_job_id: string }>('/api/scans', body),
  scanJob: (jobId: string) => jget<ScanJob>(`/api/scan-jobs/${jobId}`),
  listScans: (limit = 50) => jget<ScansList>(`/api/scans?limit=${limit}`),
  getScan: (uuid: string) => jget<ScanDetail>(`/api/scans/${uuid}`),
}
```

- [ ] **Step 3: Create the SCM helper**

Create `app/frontend/src/lib/scm.ts`:

```typescript
import type { EnvInfo } from './types'

/** Build a Strata Cloud Manager deep-link to a scan, using the live env config. */
export function scmScanUrl(env: EnvInfo | null, scanUuid: string | null): string | null {
  if (!env?.scm_base || !env?.scm_scan_path || !scanUuid) return null
  const path = env.scm_scan_path.replace('{uuid}', encodeURIComponent(scanUuid))
  return env.scm_base + path
}
```

- [ ] **Step 4: Sanity-build**

Run (in `app/frontend/`): `npm run build`
Expected: builds without TS errors.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/lib/types.ts app/frontend/src/lib/api.ts app/frontend/src/lib/scm.ts
git commit -m "m2: frontend types + api extensions + SCM URL helper"
```

---

## Task 6: VerdictCard component

The colour-coded card that replaces today's `String(eval_outcome)` rendering. Used on the scan detail page, on the scan wizard's inline result, and on the compare page.

**Files:**
- Create: `app/frontend/src/components/ScanResult/VerdictCard.tsx`
- Create: `app/frontend/src/__tests__/verdict.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `app/frontend/src/__tests__/verdict.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'

describe('VerdictCard', () => {
  it('renders ALLOWED with a positive label', () => {
    render(<VerdictCard outcome="ALLOWED" />)
    expect(screen.getByText(/allowed/i)).toBeInTheDocument()
  })

  it('renders BLOCKED with a negative label', () => {
    render(<VerdictCard outcome="BLOCKED" />)
    expect(screen.getByText(/blocked/i)).toBeInTheDocument()
  })

  it('shows the headline if provided', () => {
    render(<VerdictCard outcome="ALLOWED" headline="microsoft/DialoGPT-medium" />)
    expect(screen.getByText('microsoft/DialoGPT-medium')).toBeInTheDocument()
  })

  it('falls back gracefully on unknown outcomes', () => {
    render(<VerdictCard outcome="UNKNOWN_STATE" />)
    expect(screen.getByText(/unknown_state/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Add testing-library + jsdom**

Update `app/frontend/package.json` devDependencies (append):

```json
"@testing-library/react": "^16.1.0",
"@testing-library/jest-dom": "^6.6.3",
"jsdom": "^25.0.1"
```

Replace `app/frontend/vite.config.ts` with:

```typescript
/// <reference types="vitest" />
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

Create `app/frontend/src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest'
```

Install:

```bash
cd app/frontend && npm install
```

- [ ] **Step 3: Run, confirm failure**

Run (in `app/frontend/`): `npm test -- verdict`
Expected: module not found / import error for `VerdictCard`.

- [ ] **Step 4: Implement VerdictCard**

Create `app/frontend/src/components/ScanResult/VerdictCard.tsx`:

```typescript
import { CheckCircle2, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react'
import type { EvalOutcome } from '@/lib/types'

const STYLES: Record<string, { border: string; bg: string; text: string; Icon: typeof CheckCircle2; label: string }> = {
  ALLOWED: { border: 'border-success/40', bg: 'bg-success/10', text: 'text-success', Icon: CheckCircle2, label: 'Allowed' },
  BLOCKED: { border: 'border-danger/40', bg: 'bg-danger/10', text: 'text-danger', Icon: ShieldAlert, label: 'Blocked' },
  WARNING: { border: 'border-warn/40', bg: 'bg-warn/10', text: 'text-warn', Icon: AlertTriangle, label: 'Warning' },
}

function normalise(raw: EvalOutcome | undefined | null): string {
  if (!raw) return 'UNKNOWN'
  return String(raw).replace(/^EvalOutcome\./, '').toUpperCase()
}

export function VerdictCard({
  outcome, headline, sub,
}: { outcome: EvalOutcome | undefined | null; headline?: string; sub?: string }) {
  const key = normalise(outcome)
  const s = STYLES[key] ?? { border: 'border-border', bg: 'bg-bg-subtle', text: 'text-fg', Icon: HelpCircle, label: key }
  const { Icon } = s
  return (
    <div className={`border ${s.border} ${s.bg} rounded-lg p-5 flex items-start gap-4`}>
      <Icon className={`w-8 h-8 ${s.text} shrink-0 mt-0.5`} />
      <div className="min-w-0">
        <div className={`text-2xl font-semibold ${s.text}`}>{s.label}</div>
        {headline && <div className="text-sm font-mono text-fg mt-1 truncate">{headline}</div>}
        {sub && <div className="text-xs text-fg-dim mt-1">{sub}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Re-run, confirm pass**

Run (in `app/frontend/`): `npm test -- verdict`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/package.json app/frontend/package-lock.json \
        app/frontend/vite.config.ts \
        app/frontend/src/__tests__/setup.ts \
        app/frontend/src/components/ScanResult/VerdictCard.tsx \
        app/frontend/src/__tests__/verdict.test.tsx
git commit -m "m2: VerdictCard component + vitest jsdom setup"
```

---

## Task 7: RulesSummary, ModelFormatsChips, FilesScannedStats, ScmDeepLink

Four small display components that sit under `VerdictCard` on the detail page.

**Files:**
- Create: `app/frontend/src/components/ScanResult/RulesSummary.tsx`
- Create: `app/frontend/src/components/ScanResult/ModelFormatsChips.tsx`
- Create: `app/frontend/src/components/ScanResult/FilesScannedStats.tsx`
- Create: `app/frontend/src/components/ScanResult/ScmDeepLink.tsx`

- [ ] **Step 1: RulesSummary**

Create `app/frontend/src/components/ScanResult/RulesSummary.tsx`:

```typescript
import type { EvalSummary } from '@/lib/types'

export function RulesSummary({ summary }: { summary?: EvalSummary }) {
  if (!summary) return null
  const { rules_passed: p, rules_failed: f, total_rules: t } = summary
  const pct = t > 0 ? Math.round((p / t) * 100) : 0
  const failPct = t > 0 ? Math.round((f / t) * 100) : 0
  return (
    <div className="bg-bg-raised border border-border rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-medium">Rules</div>
        <div className="text-xs text-fg-dim font-mono">{p} / {t} passed · {pct}%</div>
      </div>
      <div className="h-2 rounded bg-bg-subtle overflow-hidden flex">
        <div className="bg-success h-full" style={{ width: `${pct}%` }} />
        <div className="bg-danger h-full" style={{ width: `${failPct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-fg-faint mt-2 font-mono">
        <span className="text-success">{p} passed</span>
        <span className="text-danger">{f} failed</span>
        <span>{t} total</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ModelFormatsChips**

Create `app/frontend/src/components/ScanResult/ModelFormatsChips.tsx`:

```typescript
export function ModelFormatsChips({ formats }: { formats?: string[] }) {
  if (!formats || formats.length === 0) return null
  return (
    <div className="bg-bg-raised border border-border rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-fg-faint mb-2">Model formats detected</div>
      <div className="flex flex-wrap gap-1.5">
        {formats.map((f) => (
          <span key={f} className="px-2 py-0.5 rounded bg-bg-subtle text-fg-dim text-[11px] font-mono border border-border">
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: FilesScannedStats**

Create `app/frontend/src/components/ScanResult/FilesScannedStats.tsx`:

```typescript
export function FilesScannedStats({
  scanned, skipped, scannerVersion,
}: { scanned?: number; skipped?: number; scannerVersion?: string }) {
  if (scanned == null && skipped == null && !scannerVersion) return null
  return (
    <div className="bg-bg-raised border border-border rounded-lg p-4 grid grid-cols-3 gap-3">
      <Cell k="Files scanned" v={scanned ?? '—'} />
      <Cell k="Files skipped" v={skipped ?? '—'} />
      <Cell k="Scanner version" v={scannerVersion ?? '—'} />
    </div>
  )
}

function Cell({ k, v }: { k: string; v: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-fg-faint">{k}</div>
      <div className="text-lg font-mono mt-0.5">{v}</div>
    </div>
  )
}
```

- [ ] **Step 4: ScmDeepLink**

Create `app/frontend/src/components/ScanResult/ScmDeepLink.tsx`:

```typescript
import { ExternalLink } from 'lucide-react'
import type { EnvInfo } from '@/lib/types'
import { scmScanUrl } from '@/lib/scm'

export function ScmDeepLink({ env, scanUuid }: { env: EnvInfo | null; scanUuid: string | null }) {
  const url = scmScanUrl(env, scanUuid)
  if (!url) {
    return (
      <div className="text-xs text-fg-faint">
        Per-file findings live in Strata Cloud Manager → Insights → Prisma AIRS → Model Security → Scans.
      </div>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
    >
      Open in Strata Cloud Manager
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  )
}
```

- [ ] **Step 5: Build to verify TypeScript**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/src/components/ScanResult/
git commit -m "m2: RulesSummary + ModelFormatsChips + FilesScannedStats + ScmDeepLink"
```

---

## Task 8: /scans list page + ScansTable component

`/scans` is the history view: fetch `list_scans(limit=50)`, render a sortable table with verdict pill, click-through to detail. The same `ScansTable` is used inside the Compare picker.

**Files:**
- Create: `app/frontend/src/components/ScansTable.tsx`
- Create: `app/frontend/src/pages/ScansList.tsx`
- Modify: `app/frontend/src/App.tsx`
- Modify: `app/frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create ScansTable**

Create `app/frontend/src/components/ScansTable.tsx`:

```typescript
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { ScanSummary } from '@/lib/types'

const OUTCOME_COLOUR: Record<string, string> = {
  ALLOWED: 'bg-success/15 text-success',
  BLOCKED: 'bg-danger/15 text-danger',
  WARNING: 'bg-warn/15 text-warn',
}

export function ScansTable({
  scans,
  rowAction,
  emptyMessage = 'No scans yet.',
}: {
  scans: ScanSummary[]
  rowAction?: (scan: ScanSummary) => ReactNode
  emptyMessage?: string
}) {
  if (scans.length === 0) {
    return <div className="text-sm text-fg-faint p-4">{emptyMessage}</div>
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
        <tr className="border-b border-border">
          <th className="text-left px-3 py-2 font-normal">Verdict</th>
          <th className="text-left px-3 py-2 font-normal">Model URI</th>
          <th className="text-left px-3 py-2 font-normal">Rules</th>
          <th className="text-left px-3 py-2 font-normal">Created</th>
          <th className="text-left px-3 py-2 font-normal">Scan UUID</th>
          {rowAction && <th className="text-right px-3 py-2 font-normal">·</th>}
        </tr>
      </thead>
      <tbody>
        {scans.map((s) => {
          const key = String(s.eval_outcome ?? '').replace(/^EvalOutcome\./, '').toUpperCase()
          const colour = OUTCOME_COLOUR[key] ?? 'bg-bg-subtle text-fg-dim'
          const summary = s.eval_summary
          return (
            <tr key={s.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${colour}`}>{key || '—'}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs truncate max-w-sm">
                <Link to={`/scans/${s.uuid}`} className="hover:underline">{s.model_uri}</Link>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-fg-dim">
                {summary ? `${summary.rules_passed}/${summary.total_rules}` : '—'}
              </td>
              <td className="px-3 py-2 text-fg-dim text-xs">{s.created_at?.replace('T', ' ').slice(0, 19) ?? '—'}</td>
              <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{s.uuid.slice(0, 8)}…</td>
              {rowAction && <td className="px-3 py-2 text-right">{rowAction(s)}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Create ScansList page**

Create `app/frontend/src/pages/ScansList.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react'
import type { ScanSummary, ScansList as ScansListT } from '@/lib/types'
import { api } from '@/lib/api'
import { ScansTable } from '@/components/ScansTable'
import { RefreshCw } from 'lucide-react'

const OUTCOMES = ['ALL', 'ALLOWED', 'BLOCKED', 'WARNING'] as const
type OutcomeFilter = typeof OUTCOMES[number]

export function ScansList() {
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)
  const [outcome, setOutcome] = useState<OutcomeFilter>('ALL')
  const [q, setQ] = useState('')

  function fetchScans() {
    setLoading(true); setErr(null)
    api.listScans(limit).then((r: ScansListT) => setScans(r.scans))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchScans() }, [limit])

  const filtered = useMemo(() => scans.filter((s) => {
    const key = String(s.eval_outcome ?? '').replace(/^EvalOutcome\./, '').toUpperCase()
    if (outcome !== 'ALL' && key !== outcome) return false
    if (q && !s.model_uri.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [scans, outcome, q])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Scans</h1>
        <p className="text-sm text-fg-dim mt-1">Recent scans for this tenant. Filter, then click a row for full detail.</p>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <select
          value={outcome} onChange={(e) => setOutcome(e.target.value as OutcomeFilter)}
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs"
        >
          {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter model URI…"
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs flex-1 font-mono"
        />
        <select
          value={limit} onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs"
        >
          {[20, 50, 100, 200].map((n) => <option key={n} value={n}>Last {n}</option>)}
        </select>
        <button onClick={fetchScans} className="text-fg-dim hover:text-fg" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <ScansTable scans={filtered} emptyMessage={loading ? 'Loading…' : 'No scans match the filters.'} />
      </div>
      <div className="text-[11px] text-fg-faint">Showing {filtered.length} of {scans.length} scans.</div>
    </div>
  )
}
```

- [ ] **Step 3: Wire route + sidebar entry**

Replace `app/frontend/src/components/Sidebar.tsx`:

```typescript
import { NavLink } from 'react-router-dom'
import { Home, ScanLine, ListChecks, GitCompare, Settings2 } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/scan', label: 'Run a scan', icon: ScanLine },
  { to: '/scans', label: 'Scans', icon: ListChecks },
  { to: '/compare', label: 'Compare', icon: GitCompare },
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
            key={to} to={to} end={to === '/'}
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

Replace `app/frontend/src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { logBus } from '@/lib/ws'
import { AppShell } from '@/components/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { Scan } from '@/pages/Scan'
import { ScansList } from '@/pages/ScansList'
import { ScanDetail } from '@/pages/ScanDetail'
import { Compare } from '@/pages/Compare'
import { Environment } from '@/pages/Environment'

export default function App() {
  useEffect(() => { logBus.connect() }, [])
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/scans" element={<ScansList />} />
        <Route path="/scans/:scanUuid" element={<ScanDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/environment" element={<Environment />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
```

`ScanDetail` and `Compare` don't exist yet — Tasks 9 and 12 create them. For now, create stub files so the build succeeds:

```bash
cat > app/frontend/src/pages/ScanDetail.tsx <<'EOF'
export function ScanDetail() { return <div /> }
EOF
cat > app/frontend/src/pages/Compare.tsx <<'EOF'
export function Compare() { return <div /> }
EOF
```

(These will be overwritten in Tasks 9 and 12.)

- [ ] **Step 4: Build**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/components/ScansTable.tsx \
        app/frontend/src/pages/ScansList.tsx \
        app/frontend/src/pages/ScanDetail.tsx \
        app/frontend/src/pages/Compare.tsx \
        app/frontend/src/components/Sidebar.tsx \
        app/frontend/src/App.tsx
git commit -m "m2: /scans list page + ScansTable + sidebar wiring"
```

---

## Task 9: /scans/:id detail page

The headline of M2: pull the scan, show the VerdictCard, RulesSummary, ModelFormatsChips, FilesScannedStats, ScmDeepLink, and a raw-JSON fallback.

**Files:**
- Replace: `app/frontend/src/pages/ScanDetail.tsx`

- [ ] **Step 1: Implement**

Replace `app/frontend/src/pages/ScanDetail.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { EnvInfo, ScanDetail as ScanDetailT } from '@/lib/types'
import { api } from '@/lib/api'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'
import { RulesSummary } from '@/components/ScanResult/RulesSummary'
import { ModelFormatsChips } from '@/components/ScanResult/ModelFormatsChips'
import { FilesScannedStats } from '@/components/ScanResult/FilesScannedStats'
import { ScmDeepLink } from '@/components/ScanResult/ScmDeepLink'

export function ScanDetail() {
  const { scanUuid = '' } = useParams<{ scanUuid: string }>()
  const [scan, setScan] = useState<ScanDetailT | null>(null)
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setScan(null); setErr(null)
    Promise.all([api.getScan(scanUuid), api.env()])
      .then(([s, e]) => { setScan(s); setEnv(e) })
      .catch((e) => setErr(String(e)))
  }, [scanUuid])

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/scans" className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> All scans
      </Link>

      {err && <div className="text-danger text-sm">{err}</div>}
      {!scan && !err && <div className="text-fg-faint text-sm">Loading scan…</div>}

      {scan && (
        <>
          <VerdictCard
            outcome={scan.eval_outcome}
            headline={scan.model_uri}
            sub={`Scanned ${scan.created_at?.replace('T', ' ').slice(0, 19) ?? ''}${
              scan.security_group_name ? ` · ${scan.security_group_name}` : ''
            }`}
          />

          <div className="grid md:grid-cols-2 gap-3">
            <RulesSummary summary={scan.eval_summary} />
            <FilesScannedStats
              scanned={scan.total_files_scanned}
              skipped={scan.total_files_skipped}
              scannerVersion={scan.scanner_version}
            />
          </div>

          <ModelFormatsChips formats={scan.model_formats} />

          <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-1">
            <Row k="Scan UUID" v={scan.uuid} mono />
            {scan.security_group_uuid && <Row k="Security group" v={`${scan.security_group_name ?? ''} ${scan.security_group_uuid}`.trim()} mono />}
            {scan.source_type && <Row k="Source type" v={scan.source_type} />}
            {scan.enabled_rule_count_snapshot != null && <Row k="Enabled rule count (snapshot)" v={String(scan.enabled_rule_count_snapshot)} />}
            {scan.error_code && <Row k="Error code" v={scan.error_code} />}
            {scan.error_message && <Row k="Error message" v={scan.error_message} />}
          </div>

          <div className="flex items-center justify-between text-xs">
            <ScmDeepLink env={env} scanUuid={scan.uuid} />
            <Link
              to={`/compare?a=${encodeURIComponent(scan.uuid)}`}
              className="text-fg-dim hover:text-fg"
            >
              Compare with another scan →
            </Link>
          </div>

          <details className="text-xs">
            <summary className="text-fg-dim cursor-pointer">Raw response</summary>
            <pre className="mt-2 p-3 bg-bg-subtle rounded font-mono text-[11px] overflow-auto">
{JSON.stringify(scan, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1 border-b border-border/40 last:border-0">
      <div className="text-fg-dim shrink-0">{k}</div>
      <div className={mono ? 'font-mono text-xs text-fg text-right break-all' : 'text-fg text-right'}>{v}</div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/ScanDetail.tsx
git commit -m "m2: /scans/:uuid detail page (verdict card + rules + formats + SCM link)"
```

---

## Task 10: Polish Scan.tsx — VerdictCard inline + advanced options + auto-redirect

Three changes to `app/frontend/src/pages/Scan.tsx`:
1. After a scan completes, render `VerdictCard` and the supporting widgets instead of the raw JSON dump.
2. Add an "Advanced options" accordion (`allow_patterns`, `ignore_patterns`, `poll_interval_secs`, `poll_timeout_secs`).
3. Default-on "Open detail when done" toggle that redirects to `/scans/:uuid`.

**Files:**
- Replace: `app/frontend/src/pages/Scan.tsx`

- [ ] **Step 1: Replace Scan.tsx**

Replace `app/frontend/src/pages/Scan.tsx`:

```typescript
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { EnvInfo, GroupsList, ScanJob, ScanRequestAdvanced, SecurityGroup } from '@/lib/types'
import { api } from '@/lib/api'
import { validateHuggingFaceUri } from '@/lib/hf'
import { ChevronDown, ChevronUp, Loader2, XCircle } from 'lucide-react'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'
import { RulesSummary } from '@/components/ScanResult/RulesSummary'
import { ScmDeepLink } from '@/components/ScanResult/ScmDeepLink'

type SourceType = 'HUGGING_FACE' | 'S3' | 'GCS' | 'AZURE' | 'LOCAL'

const SAMPLE_HF: { label: string; uri: string }[] = [
  { label: 'microsoft/DialoGPT-medium (expected clean)', uri: 'https://huggingface.co/microsoft/DialoGPT-medium' },
  { label: 'ykilcher/totally-harmless-model (known unsafe)', uri: 'https://huggingface.co/ykilcher/totally-harmless-model' },
]

export function Scan() {
  const nav = useNavigate()
  const [groups, setGroups] = useState<SecurityGroup[]>([])
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>('HUGGING_FACE')
  const [groupUuid, setGroupUuid] = useState<string>('')
  const [uri, setUri] = useState<string>('')
  const [job, setJob] = useState<ScanJob | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState<ScanRequestAdvanced>({})
  const [autoNav, setAutoNav] = useState(true)

  useEffect(() => {
    api.groups().then((g: GroupsList) => setGroups(g.security_groups)).catch((e) => setErr(String(e)))
    api.env().then(setEnv).catch(() => {})
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
      const { scan_job_id } = await api.startScan({
        security_group_uuid: groupUuid, model_uri: uri, ...adv,
      })
      pollJob(scan_job_id)
    } catch (e) { setErr(String(e)) }
  }

  function pollJob(jobId: string) {
    setJob({ job_id: jobId, status: 'pending', scan_id: null, result: null, error: null })
    const tick = async () => {
      try {
        const j = await api.scanJob(jobId)
        setJob(j)
        if (j.status === 'pending') { setTimeout(tick, 600); return }
        if (j.status === 'done' && j.scan_id && autoNav) nav(`/scans/${j.scan_id}`)
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
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full">
            {(['HUGGING_FACE', 'S3', 'GCS', 'AZURE', 'LOCAL'] as SourceType[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Security group">
          <select value={groupUuid} onChange={(e) => setGroupUuid(e.target.value)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full">
            {filteredGroups.map((g) => (
              <option key={g.uuid} value={g.uuid}>{g.name} ({g.uuid.slice(0, 8)}…)</option>
            ))}
            {filteredGroups.length === 0 && <option>No group for this source type</option>}
          </select>
        </Field>

        <Field label="Model URI">
          <input value={uri} onChange={(e) => setUri(e.target.value)}
            placeholder="https://huggingface.co/openai-community/gpt2"
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full font-mono" />
          {sourceType === 'HUGGING_FACE' && !hfCheck.ok && (
            <div className="text-warn text-xs mt-1">{hfCheck.reason}</div>
          )}
          {sourceType === 'HUGGING_FACE' && (
            <div className="text-fg-faint text-xs mt-2">
              Quick picks: {SAMPLE_HF.map((s) => (
                <button key={s.uri} onClick={() => setUri(s.uri)} className="underline mr-3 hover:text-fg">{s.label}</button>
              ))}
            </div>
          )}
        </Field>

        <div>
          <button onClick={() => setAdvOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
            {advOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced options
          </button>
          {advOpen && (
            <div className="mt-3 grid grid-cols-2 gap-3 bg-bg-subtle/40 border border-border rounded p-3">
              <PatternList
                label="allow_patterns"
                values={adv.allow_patterns ?? []}
                onChange={(v) => setAdv((a) => ({ ...a, allow_patterns: v.length ? v : undefined }))}
                placeholder="*.bin"
              />
              <PatternList
                label="ignore_patterns"
                values={adv.ignore_patterns ?? []}
                onChange={(v) => setAdv((a) => ({ ...a, ignore_patterns: v.length ? v : undefined }))}
                placeholder=".gitattributes"
              />
              <NumberField label="poll_interval_secs" value={adv.poll_interval_secs}
                onChange={(n) => setAdv((a) => ({ ...a, poll_interval_secs: n }))} />
              <NumberField label="poll_timeout_secs" value={adv.poll_timeout_secs}
                onChange={(n) => setAdv((a) => ({ ...a, poll_timeout_secs: n }))} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={submit} disabled={!canSubmit}
            className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed">
            {job?.status === 'pending' ? 'Scanning…' : 'Start scan'}
          </button>
          <label className="text-xs text-fg-dim flex items-center gap-2">
            <input type="checkbox" checked={autoNav} onChange={(e) => setAutoNav(e.target.checked)} />
            Open detail when done
          </label>
        </div>
      </div>

      {job?.status === 'pending' && (
        <div className="bg-bg-raised border border-border rounded-lg p-4 flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-accent animate-spin" />
          <span>Scanning… polling the SDK in a background thread. Watch the Log drawer for live events.</span>
        </div>
      )}

      {job?.status === 'error' && (
        <div className="bg-bg-raised border border-border rounded-lg p-4 flex items-center gap-3 text-sm">
          <XCircle className="w-4 h-4 text-danger" />
          <span className="font-mono text-xs text-danger">{job.error}</span>
        </div>
      )}

      {job?.status === 'done' && job.result && !autoNav && (
        <div className="space-y-3">
          <VerdictCard outcome={job.result.eval_outcome} headline={uri} />
          <RulesSummary summary={job.result.eval_summary} />
          <div className="flex items-center justify-between text-xs">
            <ScmDeepLink env={env} scanUuid={job.scan_id} />
            {job.scan_id && (
              <a href={`/scans/${job.scan_id}`} className="text-accent hover:underline">Open full detail →</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function PatternList({ label, values, onChange, placeholder }:
  { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</label>
      <input
        value={values.join(', ')}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.split(',').map((p) => p.trim()).filter(Boolean))}
        className="mt-1 bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs w-full font-mono"
      />
      <div className="text-[10px] text-fg-faint mt-1">comma-separated</div>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (n: number | undefined) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</label>
      <input
        type="number" min={1}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="mt-1 bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs w-full font-mono"
      />
      <div className="text-[10px] text-fg-faint mt-1">leave blank for SDK default</div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Scan.tsx
git commit -m "m2: Scan page polish — VerdictCard inline, advanced options, auto-redirect"
```

---

## Task 11: Dashboard — tenant chip + last 5 scans

The spec calls for "tenant chip (TSG ID, base URL)" plus "last 5 scans" on the Dashboard. M1 shipped neither.

**Files:**
- Replace: `app/frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Implement**

Replace `app/frontend/src/pages/Dashboard.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EnvInfo, GroupsList, ScanSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { ScanLine, ExternalLink } from 'lucide-react'
import { ScansTable } from '@/components/ScansTable'

export function Dashboard() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [groups, setGroups] = useState<GroupsList | null>(null)
  const [scans, setScans] = useState<ScanSummary[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.env(), api.groups(), api.listScans(5)])
      .then(([e, g, s]) => { setEnv(e); setGroups(g); setScans(s.scans) })
      .catch((e) => setErr(String(e)))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-fg-dim mt-1">Tenant snapshot and quick actions.</p>
        </div>
        {env && (
          <div className="bg-bg-raised border border-border rounded-md px-3 py-1.5 text-[11px] font-mono">
            <div className="text-fg-faint">TSG</div>
            <div className="text-fg">{env.tsg_id || '(not set)'}</div>
            <div className="text-fg-faint mt-1">Base URL</div>
            <div className="text-fg">{env.base_url}</div>
          </div>
        )}
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
          <Link to="/scan" className="inline-flex items-center gap-2 bg-accent text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent/90">
            <ScanLine className="w-4 h-4" /> Start
          </Link>
        </div>
      </div>

      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-medium">Recent scans</div>
          <Link to="/scans" className="text-xs text-fg-dim hover:text-fg inline-flex items-center gap-1">
            All scans <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <ScansTable scans={scans ?? []} emptyMessage={scans == null ? 'Loading…' : 'No scans yet — try running one.'} />
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

- [ ] **Step 2: Build**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Dashboard.tsx
git commit -m "m2: Dashboard tenant chip + last 5 scans widget"
```

---

## Task 12: /compare — side-by-side comparison

Two modes:
- `/compare` (no params) — pick two scans from a recent-scans table.
- `/compare?a=<uuid>&b=<uuid>` — render both VerdictCards + RulesSummaries + key facts side-by-side.

This is the pedagogical "show me a clean and a poisoned scan next to each other" view, lifted from the notebook.

**Files:**
- Replace: `app/frontend/src/pages/Compare.tsx`

- [ ] **Step 1: Implement**

Replace `app/frontend/src/pages/Compare.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { EnvInfo, ScanDetail, ScanSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'
import { RulesSummary } from '@/components/ScanResult/RulesSummary'
import { ModelFormatsChips } from '@/components/ScanResult/ModelFormatsChips'
import { FilesScannedStats } from '@/components/ScanResult/FilesScannedStats'
import { ScmDeepLink } from '@/components/ScanResult/ScmDeepLink'
import { ScansTable } from '@/components/ScansTable'

export function Compare() {
  const [params, setParams] = useSearchParams()
  const a = params.get('a')
  const b = params.get('b')

  if (a && b) return <Side a={a} b={b} />
  return <Picker selected={[a, b].filter(Boolean) as string[]} onPick={(uuid) => {
    const cur = [a, b].filter(Boolean) as string[]
    if (cur.includes(uuid)) return
    const next = [...cur, uuid].slice(0, 2)
    const sp = new URLSearchParams()
    if (next[0]) sp.set('a', next[0])
    if (next[1]) sp.set('b', next[1])
    setParams(sp)
  }} />
}

function Picker({ selected, onPick }: { selected: string[]; onPick: (uuid: string) => void }) {
  const [scans, setScans] = useState<ScanSummary[]>([])
  useEffect(() => { api.listScans(50).then((r) => setScans(r.scans)) }, [])
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Compare scans</h1>
        <p className="text-sm text-fg-dim mt-1">
          Pick two scans to render side-by-side. Pair a clean model with a poisoned one to make the gate's job obvious.
        </p>
      </div>
      <div className="text-xs text-fg-dim">Picked: {selected.length}/2</div>
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <ScansTable
          scans={scans}
          rowAction={(s) => {
            const picked = selected.includes(s.uuid)
            return (
              <button
                onClick={() => onPick(s.uuid)}
                disabled={picked || selected.length >= 2}
                className="text-xs px-2 py-0.5 rounded border border-border bg-bg-subtle hover:bg-bg-subtle/70 disabled:opacity-40"
              >
                {picked ? 'picked' : 'pick'}
              </button>
            )
          }}
        />
      </div>
    </div>
  )
}

function Side({ a, b }: { a: string; b: string }) {
  const [sa, setSa] = useState<ScanDetail | null>(null)
  const [sb, setSb] = useState<ScanDetail | null>(null)
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setSa(null); setSb(null); setErr(null)
    Promise.all([api.getScan(a), api.getScan(b), api.env()])
      .then(([x, y, e]) => { setSa(x); setSb(y); setEnv(e) })
      .catch((e) => setErr(String(e)))
  }, [a, b])

  const verdictsDiffer = useMemo(() => {
    if (!sa || !sb) return false
    return String(sa.eval_outcome) !== String(sb.eval_outcome)
  }, [sa, sb])

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Compare scans</h1>
        <Link to="/compare" className="text-xs text-fg-dim hover:text-fg">Pick different scans →</Link>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      {verdictsDiffer && (
        <div className="border border-warn/40 bg-warn/5 text-warn text-xs px-3 py-2 rounded">
          The two scans returned different verdicts. That's exactly the kind of contrast a customer demo wants to make visible.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Column scan={sa} env={env} />
        <Column scan={sb} env={env} />
      </div>
    </div>
  )
}

function Column({ scan, env }: { scan: ScanDetail | null; env: EnvInfo | null }) {
  if (!scan) return <div className="text-fg-faint text-sm">Loading…</div>
  return (
    <div className="space-y-3">
      <VerdictCard outcome={scan.eval_outcome} headline={scan.model_uri} sub={scan.created_at?.replace('T', ' ').slice(0, 19)} />
      <RulesSummary summary={scan.eval_summary} />
      <FilesScannedStats
        scanned={scan.total_files_scanned}
        skipped={scan.total_files_skipped}
        scannerVersion={scan.scanner_version}
      />
      <ModelFormatsChips formats={scan.model_formats} />
      <div className="flex items-center justify-between text-xs">
        <ScmDeepLink env={env} scanUuid={scan.uuid} />
        <Link to={`/scans/${scan.uuid}`} className="text-fg-dim hover:text-fg">Full detail →</Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run (in `app/frontend/`): `npm run build`
Expected: builds.

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Compare.tsx
git commit -m "m2: /compare page (side-by-side scan comparison)"
```

---

## Task 13: Smoke-test docs + final verification

Document the M2-specific manual smoke test in `app/README.md` so the next person can verify the demo end-to-end.

**Files:**
- Modify: `app/README.md`

- [ ] **Step 1: Append M2 smoke test section**

Read `app/README.md` first. Append after the existing smoke-test list:

```markdown
### M2 smoke test additions

After `./run-app.sh` opens the app:

1. **Dashboard** — verify the tenant chip in the top-right shows your TSG and base URL, and "Recent scans" lists your last 5 scans (or shows the empty state).
2. **Run a scan** — pick `microsoft/DialoGPT-medium` from quick picks, scan, watch the Log drawer flip from `pending` to `ok`, then verify the page auto-navigates to `/scans/<uuid>` and the verdict card is green.
3. **Run a poisoned scan** — pick `ykilcher/totally-harmless-model`, scan, verify the verdict card is red and the rules bar shows the failed count in red.
4. **Scan detail** — confirm `Open in Strata Cloud Manager` is a clickable link that opens a new tab pointing at your scan UUID. If the URL 404s in SCM, the path needs adjustment in `app/backend/routes/scm.py` (single source of truth — change it there and rerun `./restart.sh`).
5. **Scans list (`/scans`)** — change the verdict filter to `BLOCKED`, then back to `ALL`. Type into the model-URI filter; the table narrows immediately.
6. **Advanced options** — on `/scan`, open the accordion, set `allow_patterns` to `*.bin, *.json`, kick off a scan, then expand the Log drawer entry for `scan` — `kwargs` should include those patterns verbatim.
7. **Compare** — go to `/compare`, pick the safe and poisoned scans, verify the side-by-side view renders both verdict cards and shows the "verdicts differ" hint.
```

- [ ] **Step 2: Run the full test suite once**

```bash
source .venv/bin/activate
pytest app/backend/tests/ -v
cd app/frontend && npm test && cd -
```
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add app/README.md
git commit -m "m2: README smoke test additions"
```

---

## Done — exit criteria

- `/`, `/scan`, `/scans`, `/scans/:uuid`, `/compare`, `/environment` all reachable from the sidebar.
- Running a HuggingFace scan auto-redirects to its detail page; that page shows a green verdict card for `microsoft/DialoGPT-medium` and a red one for `ykilcher/totally-harmless-model`.
- `Open in Strata Cloud Manager` on the detail page is a real anchor with the scan UUID in the path.
- The Log drawer continues to populate for every SDK call across every page.
- `pytest app/backend/tests/ -v` shows ≥ 15 passing tests. `npm test` in `app/frontend/` shows ≥ 4 passing tests.

## Next milestones (planned separately)

- **M3 — Groups & Models:** `/groups` (rules + rule instances drawer), `/models` (versions, files), Dashboard tweaks for source-type breakdown.
- **M4 — Drawer completion + CI/CD generator:** REPL tab (per-session `code.InteractiveInterpreter`, snippets), Code tab (frontend renderer for the existing `app/backend/codegen.py`), `/environment` Pydantic schema browser, CI/CD YAML generator using the live security-group UUID.
