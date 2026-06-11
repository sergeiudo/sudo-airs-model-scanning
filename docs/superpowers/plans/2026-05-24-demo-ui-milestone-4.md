# Demo UI — Milestone 4 Implementation Plan (REPL, Code tab, Schemas, CI/CD)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the original Demo UI design by activating the spec's signature mechanism — the bottom drawer with three tabs (Log/REPL/Code) — plus the "show me everything" surface (Pydantic schema browser on /environment) and the deck-aligned CI/CD YAML generator. After M4 ships, every page in the spec is built, the drawer has all three planned tabs, and the demo can answer "yes" to "can you show how to call this from my pipeline?".

**Architecture:** One new WS endpoint (`/api/ws/repl`) backed by a per-session `code.InteractiveInterpreter` registry; one new REST endpoint (`/api/schemas`) introspecting the `airs_schemas` package via `inspect`. Frontend gets a drawer tab switcher, a TypeScript port of the existing `app/backend/codegen.py` (so the Code tab can render SDKEvents → equivalent Python without round-tripping), a REPL tab with WS-backed input/output/history, a schemas browser on /environment, and a new `/cicd` page that templates YAML for 6+ CI platforms.

**Tech Stack:** Python 3.12 · FastAPI · websockets · `code` (stdlib) · pytest · React 19 · TypeScript · Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md`

**Previous milestones (all shipped):**
- M1 — app shell + Dashboard + Scan + Environment + Log drawer
- M2 — Scans surface (list, detail, compare, advanced options, SCM deep-link)
- M3 — Groups + Rules + Models + scan violations/evaluations enrichment

**What's in M4:**
- Backend: WS `/api/ws/repl?session_id=X` with per-session `code.InteractiveInterpreter` (pre-imports `client`, `UUID`, `json`, `pprint`); REST `GET /api/schemas` enumerating Pydantic models in `airs_schemas` with their JSON schemas.
- Frontend: Drawer tab switcher (Log / REPL / Code); TypeScript codegen helper that mirrors `app/backend/codegen.py`; **REPL tab** with input box (Enter to submit, Shift+Enter for newline, Up/Down for history, Ctrl+L to clear), Snippets dropdown sourced from `examples/`, live output; **Code tab** subscribes to `logBus` and renders the per-screen sequence of `client.method(...)` calls; **Schemas browser** on `/environment` with collapsible JSON-Schema trees; **`/cicd` page** with platform picker (GitHub Actions / GitLab CI / Jenkins / Azure DevOps / CircleCI / generic shell) that produces copy-paste YAML interpolating the user's actual TSG ID and a chosen security group UUID.
- Code-quality cleanup: extract `parse_uuid_or_400(raw, label)` helper from the 6 duplicate try/except blocks across `scans.py` and `groups.py` (M3 review follow-up).

**Explicitly NOT in M4:**
- Mutation endpoints (`update_rule_instance`, `create_security_group`, label-set ops, etc.) — out of scope per spec ("read-mostly in v1").
- Multi-tenant `.env` switching — explicitly out of scope per spec.
- Bulk scan submission, scan diffing across multiple — v2 candidates.

---

## Pre-flight context for the implementer

Read these before starting:

- `CLAUDE.md` — proprietary SDK install notes. The REPL gives users the SDK live; localhost-only binding is the only sandbox.
- `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md` — design source, especially the "REPL" and "Code echo" sections.
- `docs/superpowers/plans/2026-05-24-demo-ui-milestone-3.md` — M3 plan whose patterns (typed routes, dependency-override tests, lib helpers) this plan extends.
- `app/backend/codegen.py` — the existing Python codegen that the frontend will port to TypeScript. The behaviour and test suite (`test_codegen.py`) are the spec for the TS version.
- `app/backend/sdk_proxy.py` — every SDK call flows through `SDKProxy.call` and emits `SDKEvent`s. The REPL pre-imports `client = SDKProxy(...)` so REPL-issued calls also appear in the Log/Code tabs (this is a key pedagogical beat).
- `app/frontend/src/components/Drawer/Drawer.tsx`, `LogTab.tsx` — current drawer scaffold; the tab nav placeholder text in `Drawer.tsx:11` ("REPL · Code (coming in M4)") is what M4 makes real.

**Conventions (unchanged from M1/M2/M3):**
- Paths relative to repo root unless prefixed with `app/`.
- Backend Python: type hints, Pydantic v2, route handlers thin.
- Frontend: TS strict, Tailwind tokens already defined, no `any` outside boundaries.
- Commit messages: `m4: <short description>`.
- Test pattern (backend): `dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock, WSHub())`.

**REPL safety note:** The REPL is unsandboxed. This is acceptable because (a) the app already holds full SDK credentials, (b) the FastAPI server binds to `127.0.0.1` (see `run-app.sh`), (c) the README warns not to expose this to a non-loopback interface. Don't add sandboxing — it's explicitly approved in the spec for localhost-only use.

**SDK schema introspection:** `airs_schemas` exposes Pydantic models that mirror SDK request/response shapes. `import airs_schemas; inspect.getmembers(airs_schemas, lambda x: isinstance(x, type) and issubclass(x, BaseModel))` enumerates them. Each model has `.model_json_schema()` returning a standard JSON Schema dict. If `airs_schemas` doesn't expose models at the top level (they may be in submodules), walk submodules with `pkgutil.iter_modules(airs_schemas.__path__)`.

---

## File map (what gets created or modified)

```
app/
├── backend/
│   ├── repl.py                    # CREATE: REPLRegistry + ReplSession
│   ├── routes/
│   │   ├── repl.py                # CREATE: WS /api/ws/repl
│   │   ├── schemas.py             # CREATE: GET /api/schemas
│   │   ├── scans.py               # MODIFY: replace inline UUID parsing with parse_uuid_or_400
│   │   └── groups.py              # MODIFY: same
│   ├── _common.py                 # CREATE: parse_uuid_or_400(raw, label) helper
│   ├── main.py                    # MODIFY: include repl + schemas routers
│   └── tests/
│       ├── test_repl.py           # CREATE
│       ├── test_schemas_route.py  # CREATE
│       └── test_common.py         # CREATE
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts             # MODIFY: listSchemas, getSchema
│   │   │   ├── codegen.ts         # CREATE: TS port of backend codegen
│   │   │   ├── repl.ts            # CREATE: REPL WS client
│   │   │   └── types.ts           # MODIFY: SchemaSummary, SchemaDetail, ReplLine
│   │   ├── components/
│   │   │   └── Drawer/
│   │   │       ├── Drawer.tsx     # MODIFY: tab switcher
│   │   │       ├── CodeTab.tsx    # CREATE
│   │   │       ├── ReplTab.tsx    # CREATE
│   │   │       └── snippets.ts    # CREATE: hardcoded REPL examples
│   │   ├── pages/
│   │   │   ├── Environment.tsx    # MODIFY: schemas browser
│   │   │   └── CicdGenerator.tsx  # CREATE → /cicd
│   │   ├── components/Sidebar.tsx # MODIFY: add CI/CD entry
│   │   ├── App.tsx                # MODIFY: wire /cicd route
│   │   └── __tests__/
│   │       └── codegen.test.ts    # CREATE: parity with backend test_codegen.py
└── (README.md update in Task 11)
```

---

## Task 1: Backend — `parse_uuid_or_400` helper (M3 review follow-up)

The M3 final review flagged 6 duplications of the UUID-parse-or-400 pattern across `scans.py` (4×) and `groups.py` (1×). `models.py` already extracted it. This task creates a shared helper and uses it everywhere.

**Files:**
- Create: `app/backend/_common.py`
- Create: `app/backend/tests/test_common.py`
- Modify: `app/backend/routes/scans.py`
- Modify: `app/backend/routes/groups.py`
- Modify: `app/backend/routes/models.py`

- [ ] **Step 1: Write the helper + its test**

Create `app/backend/_common.py`:

```python
"""Shared helpers used by multiple route modules."""
from uuid import UUID
from fastapi import HTTPException


def parse_uuid_or_400(raw: str, label: str = "uuid") -> UUID:
    """Parse `raw` as a UUID; raise 400 with a clear message if it isn't one."""
    try:
        return UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid {label}: {exc}") from exc
```

Create `app/backend/tests/test_common.py`:

```python
import pytest
from uuid import UUID
from fastapi import HTTPException
from app.backend._common import parse_uuid_or_400


def test_parses_valid_uuid():
    parsed = parse_uuid_or_400("d110c5a5-27a0-459e-9556-eda7196c6ac3")
    assert isinstance(parsed, UUID)
    assert str(parsed) == "d110c5a5-27a0-459e-9556-eda7196c6ac3"


def test_raises_400_on_invalid():
    with pytest.raises(HTTPException) as exc_info:
        parse_uuid_or_400("not-a-uuid")
    assert exc_info.value.status_code == 400
    assert "invalid uuid" in exc_info.value.detail


def test_label_appears_in_error_message():
    with pytest.raises(HTTPException) as exc_info:
        parse_uuid_or_400("not-a-uuid", label="scan uuid")
    assert "scan uuid" in exc_info.value.detail
```

- [ ] **Step 2: Run, confirm pass**

```bash
source .venv/bin/activate
pytest app/backend/tests/test_common.py -v
```
Expected: 3 passed.

- [ ] **Step 3: Refactor scans.py**

Edit `app/backend/routes/scans.py`. Find each block matching:

```python
    try:
        parsed = UUID(scan_uuid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid scan uuid: {exc}") from exc
```

Replace each (there are 3 of them — in `get_scan_detail`, `get_scan_violations`, `get_scan_evaluations`) with:

```python
    parsed = parse_uuid_or_400(scan_uuid, "scan uuid")
```

At the top of the file, add the import:

```python
from app.backend._common import parse_uuid_or_400
```

The `UUID(req.security_group_uuid)` inside `_run_scan_job` (used to wrap the security-group UUID before passing to the SDK) is NOT a 400-on-error case — leave it as a plain `UUID(...)` call.

- [ ] **Step 4: Refactor groups.py**

Edit `app/backend/routes/groups.py`. Find the block in `get_group_detail`:

```python
    try:
        parsed = UUID(group_uuid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid group uuid: {exc}") from exc
```

Replace with:

```python
    parsed = parse_uuid_or_400(group_uuid, "group uuid")
```

Add the import:

```python
from app.backend._common import parse_uuid_or_400
```

Remove the now-unused `HTTPException` import if no other handler in the file still uses it (check first).

- [ ] **Step 5: Refactor models.py**

Edit `app/backend/routes/models.py`. The file already has a local `_parse(label, raw)` helper. Replace it with calls to the shared helper.

Replace:

```python
def _parse(label: str, raw: str) -> UUID:
    try:
        return UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid {label} uuid: {exc}") from exc
```

with: (delete the function entirely)

Add the import:

```python
from app.backend._common import parse_uuid_or_400
```

In the route handlers, change every `_parse("model", model_uuid)` to `parse_uuid_or_400(model_uuid, "model uuid")` and `_parse("model-version", version_uuid)` to `parse_uuid_or_400(version_uuid, "model-version uuid")`.

Remove `HTTPException` and `UUID` imports if no longer used in the file.

- [ ] **Step 6: Re-run the full backend suite, confirm all green**

```bash
pytest app/backend/tests/ -v
```
Expected: ≥ 44 tests passing (41 from M3 + 3 new in test_common). No regressions.

- [ ] **Step 7: Commit**

```bash
git add app/backend/_common.py app/backend/tests/test_common.py \
        app/backend/routes/scans.py app/backend/routes/groups.py app/backend/routes/models.py
git commit -m "m4: extract parse_uuid_or_400 helper (cleanup from M3 review)"
```

---

## Task 2: Backend — Schemas introspection endpoint

`GET /api/schemas` enumerates Pydantic models in `airs_schemas` (walking submodules if needed) and returns each one's name + JSON Schema. The frontend renders them as a collapsible tree on /environment.

**Files:**
- Create: `app/backend/routes/schemas.py`
- Modify: `app/backend/main.py`
- Create: `app/backend/tests/test_schemas_route.py`

- [ ] **Step 1: Write failing tests**

Create `app/backend/tests/test_schemas_route.py`:

```python
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
```

- [ ] **Step 2: Run, confirm failure (404)**

```bash
pytest app/backend/tests/test_schemas_route.py -v
```
Expected: all 404.

- [ ] **Step 3: Implement the route**

Create `app/backend/routes/schemas.py`:

```python
"""GET /api/schemas — enumerate Pydantic models in the airs_schemas package.

Walks the package's submodules and returns each top-level BaseModel subclass
with its JSON schema. The frontend renders these as collapsible JSON trees
on /environment so customers can see the full surface they're integrating with."""
import importlib
import inspect
import pkgutil
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


def _collect_models() -> dict[str, type[BaseModel]]:
    """Find every BaseModel subclass defined inside the airs_schemas package."""
    found: dict[str, type[BaseModel]] = {}
    try:
        pkg = importlib.import_module("airs_schemas")
    except ImportError:
        return found

    def _scan_module(mod: Any) -> None:
        for name, obj in inspect.getmembers(mod):
            if isinstance(obj, type) and issubclass(obj, BaseModel) and obj is not BaseModel:
                if obj.__module__.startswith("airs_schemas"):
                    found.setdefault(obj.__name__, obj)

    _scan_module(pkg)
    if hasattr(pkg, "__path__"):
        for sub in pkgutil.walk_packages(pkg.__path__, prefix=pkg.__name__ + "."):
            try:
                _scan_module(importlib.import_module(sub.name))
            except Exception:
                # Some submodules might fail to import standalone; skip them.
                continue
    return found


@router.get("/api/schemas")
def list_schemas() -> dict:
    models = _collect_models()
    entries = []
    for name in sorted(models):
        cls = models[name]
        try:
            entries.append({"name": name, "module": cls.__module__, "schema": cls.model_json_schema()})
        except Exception as exc:
            entries.append({"name": name, "module": cls.__module__, "schema": {}, "error": str(exc)})
    return {"schemas": entries}
```

- [ ] **Step 4: Wire the router**

Edit `app/backend/main.py`. The current imports include several routers. Add `schemas` to the import line and add the include:

```python
from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route, rules as rules_route, models as models_route, schemas as schemas_route
```

Add `app.include_router(schemas_route.router)` inside `create_app()` alongside the other includes.

- [ ] **Step 5: Re-run tests, confirm pass**

```bash
pytest app/backend/tests/test_schemas_route.py -v
```
Expected: 3 passed. If `airs_schemas` truly exposes no Pydantic models (very unlikely — the SDK is built on it), the first test will fail with "len > 0". Investigate the package shape with `python -c "import airs_schemas; help(airs_schemas)"` and adjust the model-walking logic if needed.

- [ ] **Step 6: Commit**

```bash
git add app/backend/routes/schemas.py app/backend/main.py app/backend/tests/test_schemas_route.py
git commit -m "m4: GET /api/schemas (introspect airs_schemas Pydantic models)"
```

---

## Task 3: Backend — REPL endpoint + per-session interpreter

Per-session `code.InteractiveInterpreter` registry. Each WS connection presents a `session_id` from `localStorage`; the registry holds one interpreter per id. Interpreter locals include `client` (the proxied SDK), `UUID`, `json`, `pprint`. Output is captured via `contextlib.redirect_stdout` / `redirect_stderr` and sent back over the WS as `output` messages. Input continues across lines using `code.compile_command` (the standard "more?" indicator).

**Files:**
- Create: `app/backend/repl.py`
- Create: `app/backend/routes/repl.py`
- Modify: `app/backend/main.py`
- Create: `app/backend/tests/test_repl.py`

- [ ] **Step 1: Write failing tests for the session manager**

Create `app/backend/tests/test_repl.py`:

```python
from unittest.mock import MagicMock
from app.backend.repl import ReplRegistry, ReplSession
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


def _make_session() -> ReplSession:
    proxy = SDKProxy(MagicMock(), WSHub())
    return ReplSession(proxy=proxy)


def test_session_executes_simple_expression():
    s = _make_session()
    result = s.execute("1 + 2")
    assert result.ok
    assert result.more is False
    # Repr of bare expression is printed by the interactive interpreter.
    assert "3" in result.output


def test_session_executes_print_statement():
    s = _make_session()
    result = s.execute("print('hello')")
    assert result.ok
    assert "hello" in result.output


def test_session_keeps_state_across_calls():
    s = _make_session()
    s.execute("x = 42")
    result = s.execute("x * 2")
    assert "84" in result.output


def test_session_handles_syntax_error():
    s = _make_session()
    result = s.execute("def broken(:")
    # broken syntax is a complete error (not an incomplete statement waiting for more).
    assert result.ok is False
    assert result.more is False
    assert "SyntaxError" in result.output or "invalid syntax" in result.output.lower()


def test_session_handles_runtime_error():
    s = _make_session()
    result = s.execute("1/0")
    assert result.ok is False
    assert "ZeroDivisionError" in result.output


def test_session_detects_incomplete_statement():
    s = _make_session()
    # An incomplete `def` body — the interpreter should ask for more.
    result = s.execute("def f():")
    assert result.more is True
    # Completing it should succeed.
    result2 = s.execute("def f():\n    return 7\n")
    assert result2.ok
    result3 = s.execute("f()")
    assert "7" in result3.output


def test_session_exposes_client_in_locals():
    proxy = SDKProxy(MagicMock(), WSHub())
    s = ReplSession(proxy=proxy)
    result = s.execute("type(client).__name__")
    assert "SDKProxy" in result.output


def test_registry_returns_same_session_for_same_id():
    proxy = SDKProxy(MagicMock(), WSHub())
    reg = ReplRegistry(proxy=proxy)
    a = reg.session_for("abc")
    b = reg.session_for("abc")
    assert a is b


def test_registry_isolates_sessions_by_id():
    proxy = SDKProxy(MagicMock(), WSHub())
    reg = ReplRegistry(proxy=proxy)
    a = reg.session_for("abc")
    b = reg.session_for("xyz")
    a.execute("x = 1")
    res = b.execute("'x' in dir()")
    assert "False" in res.output
```

- [ ] **Step 2: Run, confirm failure (ImportError)**

```bash
pytest app/backend/tests/test_repl.py -v
```

- [ ] **Step 3: Implement the session manager**

Create `app/backend/repl.py`:

```python
"""Per-session Python REPL backed by code.InteractiveInterpreter.

A ReplRegistry holds one ReplSession per `session_id` so multiple browser tabs
can share state if they reuse the id (or stay isolated if they don't). Each
session pre-imports `client` (the SDKProxy instance), `UUID`, `json`, `pprint`.

Output is captured via contextlib.redirect_stdout/stderr; multi-line input is
detected with code.compile_command (the standard "more?" indicator)."""
import code
import io
import json as _json
import pprint as _pprint
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import dataclass
from threading import Lock
from typing import Any
from uuid import UUID as _UUID


@dataclass
class ExecResult:
    ok: bool         # True = ran cleanly; False = error
    more: bool       # True = input was incomplete, expecting continuation
    output: str      # captured stdout + stderr


class ReplSession:
    """A single InteractiveInterpreter with persistent locals and captured output."""

    def __init__(self, proxy: Any) -> None:
        # `proxy` is whatever the registry was given (typically an SDKProxy).
        # It is exposed in the REPL as `client` so REPL-issued calls flow
        # through the same chokepoint as UI-issued calls.
        self._locals: dict[str, Any] = {
            "client": proxy,
            "UUID": _UUID,
            "json": _json,
            "pprint": _pprint,
        }
        self._interp = code.InteractiveInterpreter(self._locals)
        self._buffer = ""  # incomplete-statement accumulator

    def execute(self, source: str) -> ExecResult:
        """Feed one chunk of source to the interpreter.

        Returns ExecResult.more=True when the statement is incomplete and the
        next call should be the continuation."""
        combined = (self._buffer + source) if self._buffer else source
        out, err = io.StringIO(), io.StringIO()
        try:
            with redirect_stdout(out), redirect_stderr(err):
                compiled = code.compile_command(combined, "<repl>", "single")
        except (SyntaxError, OverflowError, ValueError):
            # showsyntaxerror writes to sys.stderr inside the redirect.
            with redirect_stdout(out), redirect_stderr(err):
                self._interp.showsyntaxerror("<repl>")
            self._buffer = ""
            return ExecResult(ok=False, more=False, output=out.getvalue() + err.getvalue())

        if compiled is None:
            # Incomplete; wait for more input. Preserve the buffer + a newline.
            self._buffer = combined if combined.endswith("\n") else combined + "\n"
            return ExecResult(ok=True, more=True, output="")

        # Complete statement. Reset buffer, run, capture.
        self._buffer = ""
        try:
            with redirect_stdout(out), redirect_stderr(err):
                self._interp.runcode(compiled)
        except SystemExit:
            return ExecResult(ok=False, more=False, output=out.getvalue() + err.getvalue() + "\n[SystemExit suppressed]")

        captured = out.getvalue() + err.getvalue()
        # Heuristic: if stderr is non-empty, treat as not-ok.
        ok = err.getvalue() == ""
        return ExecResult(ok=ok, more=False, output=captured)


class ReplRegistry:
    """Maps session_id → ReplSession. One registry per FastAPI process."""

    def __init__(self, proxy: Any) -> None:
        self._proxy = proxy
        self._sessions: dict[str, ReplSession] = {}
        self._lock = Lock()

    def session_for(self, session_id: str) -> ReplSession:
        with self._lock:
            sess = self._sessions.get(session_id)
            if sess is None:
                sess = ReplSession(proxy=self._proxy)
                self._sessions[session_id] = sess
            return sess
```

- [ ] **Step 4: Re-run tests, confirm pass**

```bash
pytest app/backend/tests/test_repl.py -v
```
Expected: 9 passed.

- [ ] **Step 5: Add the WS route**

Create `app/backend/routes/repl.py`:

```python
"""WS /api/ws/repl?session_id=X — bidirectional REPL stream.

Client sends JSON: {"source": "1 + 2"}
Server replies: {"ok": true, "more": false, "output": "3\n"}"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.backend.deps import get_hub, get_proxy
from app.backend.repl import ReplRegistry

router = APIRouter()

_REGISTRY: ReplRegistry | None = None


def _registry() -> ReplRegistry:
    global _REGISTRY
    if _REGISTRY is None:
        # Lazy init so dependency_overrides on get_proxy take effect.
        _REGISTRY = ReplRegistry(proxy=get_proxy())
    return _REGISTRY


@router.websocket("/api/ws/repl")
async def ws_repl(ws: WebSocket, session_id: str = "default") -> None:
    await ws.accept()
    session = _registry().session_for(session_id)
    try:
        while True:
            msg = await ws.receive_json()
            source = msg.get("source", "")
            result = session.execute(source)
            await ws.send_json({
                "ok": result.ok,
                "more": result.more,
                "output": result.output,
            })
    except WebSocketDisconnect:
        pass

    # Note on hub: the REPL doesn't subscribe to the WSHub directly because
    # the REPL's `client` is the same SDKProxy that publishes to the hub —
    # so REPL calls automatically show up in the Log tab.
    _ = get_hub
```

Wire it in `app/backend/main.py`. The imports already include `ws as ws_route`; add `repl as repl_route`:

```python
from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route, rules as rules_route, models as models_route, schemas as schemas_route, repl as repl_route
```

Add `app.include_router(repl_route.router)` inside `create_app()`.

- [ ] **Step 6: Smoke-test the WS handler via TestClient**

Append to `app/backend/tests/test_repl.py`:

```python
from fastapi.testclient import TestClient
from app.backend.main import create_app
from app.backend import deps
from app.backend.routes import repl as repl_route


def test_ws_repl_evaluates_expression(monkeypatch):
    # Reset the route-level registry singleton so tests stay hermetic.
    monkeypatch.setattr(repl_route, "_REGISTRY", None)

    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    with client.websocket_connect("/api/ws/repl?session_id=test1") as ws:
        ws.send_json({"source": "21 * 2"})
        reply = ws.receive_json()
        assert reply["ok"]
        assert reply["more"] is False
        assert "42" in reply["output"]


def test_ws_repl_keeps_session_state(monkeypatch):
    monkeypatch.setattr(repl_route, "_REGISTRY", None)

    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    with client.websocket_connect("/api/ws/repl?session_id=stateful") as ws:
        ws.send_json({"source": "x = 7"})
        ws.receive_json()  # discard
        ws.send_json({"source": "x + 1"})
        reply = ws.receive_json()
        assert "8" in reply["output"]
```

Run: `pytest app/backend/tests/test_repl.py -v`
Expected: 11 passed.

- [ ] **Step 7: Commit**

```bash
git add app/backend/repl.py app/backend/routes/repl.py app/backend/main.py app/backend/tests/test_repl.py
git commit -m "m4: REPL WS endpoint + per-session InteractiveInterpreter"
```

---

## Task 4: Frontend — types + api extensions + drawer tab nav refactor

Lay the groundwork before building the new drawer tabs in Tasks 5–6.

**Files:**
- Modify: `app/frontend/src/lib/types.ts`
- Modify: `app/frontend/src/lib/api.ts`
- Modify: `app/frontend/src/components/Drawer/Drawer.tsx`

- [ ] **Step 1: Extend types**

Append to `app/frontend/src/lib/types.ts`:

```typescript
export type SchemaEntry = {
  name: string
  module: string
  schema: Record<string, unknown>
  error?: string
}

export type SchemasList = { schemas: SchemaEntry[] }

export type ReplLine =
  | { kind: 'in'; text: string }
  | { kind: 'out'; text: string; ok: boolean; more: boolean }
```

- [ ] **Step 2: Extend api client**

Replace `app/frontend/src/lib/api.ts` — add `listSchemas` to the exported `api` object. Read the current file first; the change is to add one line inside the `api = { ... }` block:

```typescript
  listSchemas: () => jget<SchemasList>('/api/schemas'),
```

And update the import line at the top to include `SchemasList`:

```typescript
import type {
  EnvInfo, GroupDetail, GroupsList, EvaluationsList, ModelFilesList,
  ModelsList, ModelVersionsList, ScanDetail, ScanJob, ScansList,
  ScanRequestAdvanced, SchemasList, SecurityRulesList, ViolationsList,
} from './types'
```

- [ ] **Step 3: Refactor Drawer.tsx to have a tab switcher**

Replace `app/frontend/src/components/Drawer/Drawer.tsx`:

```typescript
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { LogTab } from './LogTab'
import { CodeTab } from './CodeTab'
import { ReplTab } from './ReplTab'

type Tab = 'log' | 'repl' | 'code'

export function Drawer({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<Tab>('log')
  return (
    <div className="border-t border-border bg-bg-raised">
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-fg-faint">Live</span>
          <TabButton label="Log" active={tab === 'log'} onClick={() => setTab('log')} />
          <TabButton label="REPL" active={tab === 'repl'} onClick={() => setTab('repl')} />
          <TabButton label="Code" active={tab === 'code'} onClick={() => setTab('code')} />
        </div>
        <button onClick={onToggle} className="text-fg-dim hover:text-fg" aria-label="Toggle drawer">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="h-64 border-t border-border overflow-hidden">
          {tab === 'log' && <LogTab />}
          {tab === 'repl' && <ReplTab />}
          {tab === 'code' && <CodeTab />}
        </div>
      )}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-2 py-0.5 rounded ${
        active ? 'text-fg bg-bg-subtle' : 'text-fg-dim hover:text-fg'
      }`}
    >
      {label}
    </button>
  )
}
```

The two new components (`CodeTab`, `ReplTab`) are created in Tasks 5 and 6. To make the build pass before then, create stubs now:

```bash
cat > app/frontend/src/components/Drawer/CodeTab.tsx <<'EOF'
export function CodeTab() {
  return <div className="p-4 text-xs text-fg-faint">Code tab — implementation in Task 5.</div>
}
EOF
cat > app/frontend/src/components/Drawer/ReplTab.tsx <<'EOF'
export function ReplTab() {
  return <div className="p-4 text-xs text-fg-faint">REPL tab — implementation in Task 6.</div>
}
EOF
```

- [ ] **Step 4: Build**

```bash
cd app/frontend && npm run build
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/lib/types.ts app/frontend/src/lib/api.ts \
        app/frontend/src/components/Drawer/Drawer.tsx \
        app/frontend/src/components/Drawer/CodeTab.tsx \
        app/frontend/src/components/Drawer/ReplTab.tsx
git commit -m "m4: types + drawer tab switcher (Code + REPL stubs)"
```

---

## Task 5: Frontend — Code tab (TS codegen + log subscription)

Port the backend `app/backend/codegen.py` to TypeScript so the Code tab can render `SDKEvent`s as Python snippets without a round-trip. Then build the tab that subscribes to `logBus` and renders the running list.

**Files:**
- Create: `app/frontend/src/lib/codegen.ts`
- Create: `app/frontend/src/__tests__/codegen.test.ts`
- Replace: `app/frontend/src/components/Drawer/CodeTab.tsx`

- [ ] **Step 1: Write failing tests (parity with backend test_codegen.py)**

Create `app/frontend/src/__tests__/codegen.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderPython } from '@/lib/codegen'

function evt(method: string, kwargs: Record<string, unknown>) {
  return {
    id: 'x', method, kwargs,
    status: 'ok' as const, started_at: 0, duration_ms: 10,
    response_summary: null, response_full: null, error: null,
  }
}

describe('renderPython', () => {
  it('no args', () => {
    expect(renderPython(evt('list_security_groups', {}))).toBe('client.list_security_groups()')
  })

  it('string arg quoted', () => {
    expect(renderPython(evt('get_model', { model_id: 'abc' })))
      .toBe("client.get_model(model_id='abc')")
  })

  it('uuid arg wrapped', () => {
    const out = renderPython(evt('scan', {
      security_group_uuid: '8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2',
      model_uri: 'https://huggingface.co/openai-community/gpt2',
    }))
    expect(out).toContain("UUID('8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2')")
    expect(out).toContain("model_uri='https://huggingface.co/openai-community/gpt2'")
  })

  it('int arg unquoted', () => {
    expect(renderPython(evt('list_scans', { limit: 25 })))
      .toBe('client.list_scans(limit=25)')
  })

  it('list arg', () => {
    expect(renderPython(evt('scan', { allow_patterns: ['*.bin', '*.json'] })))
      .toBe("client.scan(allow_patterns=['*.bin', '*.json'])")
  })

  it('positional arg encoded as arg0', () => {
    expect(renderPython(evt('get_scan', { arg0: 'd110c5a5-27a0-459e-9556-eda7196c6ac3' })))
      .toContain("UUID('d110c5a5-27a0-459e-9556-eda7196c6ac3')")
  })
})
```

- [ ] **Step 2: Implement codegen**

Create `app/frontend/src/lib/codegen.ts`:

```typescript
import type { SDKEvent } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function reprArg(value: unknown): string {
  if (typeof value === 'string') {
    return UUID_RE.test(value) ? `UUID('${value}')` : `'${value.replace(/'/g, "\\'")}'`
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value === null ? 'None' : value === true ? 'True' : value === false ? 'False' : String(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(reprArg).join(', ') + ']'
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${reprArg(k)}: ${reprArg(v)}`)
    return '{' + entries.join(', ') + '}'
  }
  return String(value)
}

/** Render an SDK event as the equivalent client.method(...) call. */
export function renderPython(event: SDKEvent): string {
  const args = Object.entries(event.kwargs)
  if (args.length === 0) return `client.${event.method}()`
  const parts = args.map(([k, v]) => {
    // Positional args from SDKProxy.call(*args) are recorded as arg0, arg1, …
    // Render those without the keyword prefix to match Python call shape.
    if (/^arg\d+$/.test(k)) return reprArg(v)
    return `${k}=${reprArg(v)}`
  })
  return `client.${event.method}(${parts.join(', ')})`
}
```

- [ ] **Step 3: Run tests, confirm pass**

```bash
cd app/frontend && npm test -- codegen
```
Expected: 6 passed.

- [ ] **Step 4: Implement CodeTab**

Replace `app/frontend/src/components/Drawer/CodeTab.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { SDKEvent } from '@/lib/types'
import { renderPython } from '@/lib/codegen'
import { logBus } from '@/lib/ws'

type Line = { event: SDKEvent; rendered: string }
const MAX_LINES = 200

export function CodeTab() {
  const [lines, setLines] = useState<Line[]>([])
  const seen = useRef(new Set<string>())
  const { pathname } = useLocation()

  // Clear the rendered script when navigating to a new screen.
  useEffect(() => {
    setLines([])
    seen.current = new Set()
  }, [pathname])

  useEffect(() => {
    return logBus.subscribe((msg) => {
      if ('type' in msg && msg.type === 'ping') return
      const event = msg as SDKEvent
      // Only render OK events. The pending/ok pair would otherwise produce
      // duplicate lines; OK is the authoritative one (kwargs are identical).
      if (event.status !== 'ok') return
      if (seen.current.has(event.id)) return
      seen.current.add(event.id)
      const rendered = renderPython(event)
      setLines((prev) => [...prev, { event, rendered }].slice(-MAX_LINES))
    })
  }, [])

  return (
    <div className="h-full overflow-auto font-mono text-[11px] p-3 space-y-1">
      <div className="text-fg-faint text-[10px] uppercase tracking-wide mb-2">
        Equivalent Python for the current screen — every UI action becomes one line here.
      </div>
      {lines.length === 0 && (
        <div className="text-fg-faint">Interact with the page to populate this view.</div>
      )}
      {lines.map((l, i) => (
        <div key={`${l.event.id}-${i}`} className="text-fg whitespace-pre">{l.rendered}</div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Build**

```bash
cd app/frontend && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/frontend/src/lib/codegen.ts \
        app/frontend/src/__tests__/codegen.test.ts \
        app/frontend/src/components/Drawer/CodeTab.tsx
git commit -m "m4: Code tab — TS codegen + live SDK-event rendering"
```

---

## Task 6: Frontend — REPL tab

Persistent session_id in `localStorage`. WS connection sends `{source}`, receives `{ok, more, output}`. Input box: Enter to submit, Shift+Enter for newline, Up/Down to navigate history, Ctrl+L to clear output.

**Files:**
- Create: `app/frontend/src/lib/repl.ts`
- Create: `app/frontend/src/components/Drawer/snippets.ts`
- Replace: `app/frontend/src/components/Drawer/ReplTab.tsx`

- [ ] **Step 1: REPL WS client**

Create `app/frontend/src/lib/repl.ts`:

```typescript
type Listener = (msg: { ok: boolean; more: boolean; output: string }) => void

const STORAGE_KEY = 'prisma-airs-repl-session'

function ensureSessionId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = `s-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

class ReplClient {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private queue: string[] = []
  private reconnectMs = 1000

  connect(): void {
    if (this.ws && this.ws.readyState <= 1) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const id = ensureSessionId()
    this.ws = new WebSocket(`${proto}://${location.host}/api/ws/repl?session_id=${encodeURIComponent(id)}`)
    this.ws.onopen = () => {
      const pending = this.queue.splice(0)
      pending.forEach((src) => this.ws?.send(JSON.stringify({ source: src })))
    }
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.listeners.forEach((l) => l(data))
      } catch {
        // ignore
      }
    }
    this.ws.onclose = () => {
      this.ws = null
      setTimeout(() => this.connect(), this.reconnectMs)
    }
    this.ws.onerror = () => this.ws?.close()
  }

  send(source: string): void {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ source }))
    } else {
      this.queue.push(source)
      this.connect()
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

export const repl = new ReplClient()
```

- [ ] **Step 2: Snippets**

Create `app/frontend/src/components/Drawer/snippets.ts`:

```typescript
export const SNIPPETS: { label: string; code: string }[] = [
  {
    label: 'list_security_groups',
    code: 'r = client.call("list_security_groups")\npprint.pprint(r.model_dump(mode="json"))',
  },
  {
    label: 'scan a HuggingFace model',
    code: [
      'groups = client.call("list_security_groups").security_groups',
      'hf = next(g for g in groups if "HUGGING_FACE" in str(g.source_type))',
      'r = client.call("scan",',
      '    security_group_uuid=hf.uuid,',
      '    model_uri="https://huggingface.co/microsoft/DialoGPT-medium")',
      'print(r.eval_outcome)',
    ].join('\n'),
  },
  {
    label: 'recent scans',
    code: 'for s in client.call("list_scans", limit=5).scans:\n    print(s.eval_outcome, s.model_uri)',
  },
  {
    label: 'inspect a violation',
    code: [
      'scan = client.call("list_scans", limit=20).scans[0]',
      'vs = client.call("get_scan_violations", UUID(scan.uuid)).violations',
      'pprint.pprint([v.model_dump() for v in vs])',
    ].join('\n'),
  },
]
```

Note: SDKProxy doesn't actually expose `.call(name, ...)` to user code — `client` in the REPL IS the SDKProxy and the user can call `client.list_security_groups()` directly. Adjust the snippets to call methods directly rather than through `.call(...)`:

```typescript
export const SNIPPETS: { label: string; code: string }[] = [
  {
    label: 'list_security_groups',
    code: 'r = client.call("list_security_groups")\npprint.pprint(r.model_dump(mode="json"))',
  },
  // ...
]
```

Wait — re-check. SDKProxy is defined in `app/backend/sdk_proxy.py`. It has a `call(method, *args, **kwargs)` method. It does NOT proxy direct attribute access. So `client.list_security_groups()` in the REPL would fail with AttributeError — the user must use `client.call("list_security_groups")`.

Final snippet shape (the version above is correct: uses `client.call("…")`).

- [ ] **Step 3: REPL tab**

Replace `app/frontend/src/components/Drawer/ReplTab.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react'
import { repl } from '@/lib/repl'
import { SNIPPETS } from './snippets'
import type { ReplLine } from '@/lib/types'

export function ReplTab() {
  const [lines, setLines] = useState<ReplLine[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number | null>(null)
  const [more, setMore] = useState(false) // last reply asked for more input
  const taRef = useRef<HTMLTextAreaElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    repl.connect()
    return repl.subscribe((msg) => {
      setLines((prev) => [...prev, { kind: 'out', text: msg.output, ok: msg.ok, more: msg.more }])
      setMore(msg.more)
    })
  }, [])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
  }, [lines])

  function submit() {
    if (!input.trim() && !more) return
    setLines((prev) => [...prev, { kind: 'in', text: input }])
    repl.send(input + (input.endsWith('\n') ? '' : '\n'))
    setHistory((h) => (input ? [...h, input] : h))
    setHistoryIdx(null)
    setInput('')
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
      return
    }
    if (e.key === 'ArrowUp' && !e.shiftKey && input.indexOf('\n') === -1) {
      if (history.length === 0) return
      e.preventDefault()
      const next = historyIdx == null ? history.length - 1 : Math.max(0, historyIdx - 1)
      setHistoryIdx(next)
      setInput(history[next] ?? '')
    }
    if (e.key === 'ArrowDown' && historyIdx != null) {
      e.preventDefault()
      const next = historyIdx + 1
      if (next >= history.length) {
        setHistoryIdx(null); setInput('')
      } else {
        setHistoryIdx(next); setInput(history[next])
      }
    }
  }

  return (
    <div className="h-full flex flex-col font-mono text-[11px]">
      <div ref={outputRef} className="flex-1 overflow-auto p-3 space-y-0.5">
        <div className="text-fg-faint text-[10px] uppercase tracking-wide mb-2">
          Python REPL — `client` is the SDKProxy. Calls go through it: <span className="text-fg">client.call("list_security_groups")</span>
        </div>
        {lines.length === 0 && (
          <div className="text-fg-faint">Type a command, Enter to run. Shift+Enter for newline. ↑/↓ for history. Ctrl+L to clear.</div>
        )}
        {lines.map((l, i) => l.kind === 'in' ? (
          <div key={i} className="text-accent whitespace-pre">{'>>> '}{l.text}</div>
        ) : (
          <div key={i} className={`whitespace-pre ${l.ok ? 'text-fg' : 'text-danger'}`}>{l.text}</div>
        ))}
      </div>
      <div className="border-t border-border p-2 flex items-end gap-2">
        <select
          onChange={(e) => { if (e.target.value) { setInput(e.target.value); e.target.value = '' } }}
          defaultValue=""
          className="bg-bg-subtle border border-border rounded text-[10px] text-fg-dim px-1 py-0.5"
        >
          <option value="" disabled>Snippets…</option>
          {SNIPPETS.map((s) => <option key={s.label} value={s.code}>{s.label}</option>)}
        </select>
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={more ? '... continue' : '>>> '}
          rows={input.split('\n').length}
          className="flex-1 bg-bg-subtle border border-border rounded px-2 py-1 text-xs font-mono resize-none focus:outline-none focus:border-accent"
          spellCheck={false}
        />
        <button
          onClick={submit}
          className="text-xs bg-accent text-white px-2 py-1 rounded hover:bg-accent/90"
        >Run</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build**

```bash
cd app/frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/lib/repl.ts \
        app/frontend/src/components/Drawer/snippets.ts \
        app/frontend/src/components/Drawer/ReplTab.tsx
git commit -m "m4: REPL tab — input + history + WS connection + snippets"
```

---

## Task 7: Frontend — /environment schemas browser

Replace the bare /environment page with the full "show me everything" surface: existing version info + methods + a browseable Pydantic schema tree.

**Files:**
- Replace: `app/frontend/src/pages/Environment.tsx`

- [ ] **Step 1: Implement**

Replace `app/frontend/src/pages/Environment.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react'
import type { EnvInfo, SchemaEntry, SchemasList } from '@/lib/types'
import { api } from '@/lib/api'
import { ChevronRight } from 'lucide-react'

export function Environment() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [schemas, setSchemas] = useState<SchemaEntry[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.env().then(setEnv).catch((e) => setErr(String(e)))
    api.listSchemas().then((r: SchemasList) => setSchemas(r.schemas)).catch(() => {})
  }, [])

  const filteredSchemas = useMemo(
    () => schemas.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())),
    [schemas, q]
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Environment</h1>
        <p className="text-sm text-fg-dim mt-1">SDK install info, client methods, and Pydantic schema browser.</p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}

      <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-1">
        <Row k="SDK version" v={env?.sdk_version ?? '…'} />
        <Row k="airs-schemas version" v={env?.airs_schemas_version ?? '…'} />
        <Row k="Base URL" v={env?.base_url ?? '…'} />
        <Row k="TSG ID" v={env?.tsg_id || '(not set in process env)'} />
        <Row k="SCM base" v={env?.scm_base ?? '…'} />
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

      <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-medium">airs_schemas Pydantic models</div>
          <div className="text-xs text-fg-faint">{filteredSchemas.length} of {schemas.length}</div>
        </div>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter schemas by name…"
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs w-full font-mono"
        />
        <div className="divide-y divide-border">
          {filteredSchemas.map((s) => <SchemaItem key={s.name + s.module} entry={s} />)}
          {filteredSchemas.length === 0 && (
            <div className="text-xs text-fg-faint py-2">
              {schemas.length === 0 ? 'No schemas loaded — check /api/schemas.' : 'No schemas match the filter.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SchemaItem({ entry }: { entry: SchemaEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-2">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left w-full">
        <ChevronRight className={`w-3 h-3 text-fg-dim transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="font-mono text-xs text-fg">{entry.name}</span>
        <span className="font-mono text-[10px] text-fg-faint">{entry.module}</span>
      </button>
      {open && (
        <pre className="mt-2 p-3 bg-bg-subtle rounded font-mono text-[10px] overflow-auto max-h-96">
{JSON.stringify(entry.schema, null, 2)}
        </pre>
      )}
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

```bash
cd app/frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Environment.tsx
git commit -m "m4: Environment page — Pydantic schemas browser with collapsible tree"
```

---

## Task 8: Frontend — /cicd YAML generator

Deck 2's "one CLI, one exit code, every platform" pitch turned into a working generator. User picks platform + security group; gets a copy-paste workflow using their actual security_group_uuid.

**Files:**
- Create: `app/frontend/src/pages/CicdGenerator.tsx`
- Modify: `app/frontend/src/components/Sidebar.tsx`
- Modify: `app/frontend/src/App.tsx`

- [ ] **Step 1: Sidebar entry**

Replace `app/frontend/src/components/Sidebar.tsx` items array to insert a new "CI/CD" entry after "Rules":

```typescript
import { NavLink } from 'react-router-dom'
import { Home, ScanLine, ListChecks, GitCompare, Layers, ShieldCheck, Workflow, Box, Settings2 } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/scan', label: 'Run a scan', icon: ScanLine },
  { to: '/scans', label: 'Scans', icon: ListChecks },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/groups', label: 'Groups', icon: Layers },
  { to: '/rules', label: 'Rules', icon: ShieldCheck },
  { to: '/models', label: 'Models', icon: Box },
  { to: '/cicd', label: 'CI/CD', icon: Workflow },
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

- [ ] **Step 2: Route**

Edit `app/frontend/src/App.tsx`. Add the import + route:

```typescript
import { CicdGenerator } from '@/pages/CicdGenerator'
```

Add inside the `<Routes>`:

```typescript
        <Route path="/cicd" element={<CicdGenerator />} />
```

(The route can go anywhere in the list, but for readability put it after `/models/.../files`.)

- [ ] **Step 3: Implement the generator page**

Create `app/frontend/src/pages/CicdGenerator.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react'
import type { GroupsList, SecurityGroup } from '@/lib/types'
import { api } from '@/lib/api'
import { Copy, Check } from 'lucide-react'

type Platform = 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circleci' | 'shell'

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'github', label: 'GitHub Actions' },
  { id: 'gitlab', label: 'GitLab CI' },
  { id: 'jenkins', label: 'Jenkins' },
  { id: 'azure', label: 'Azure DevOps' },
  { id: 'circleci', label: 'CircleCI' },
  { id: 'shell', label: 'Plain shell (bash)' },
]

export function CicdGenerator() {
  const [groups, setGroups] = useState<SecurityGroup[]>([])
  const [groupUuid, setGroupUuid] = useState<string>('')
  const [modelUri, setModelUri] = useState<string>('https://huggingface.co/openai-community/gpt2')
  const [platform, setPlatform] = useState<Platform>('github')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.groups().then((r: GroupsList) => {
      setGroups(r.security_groups)
      if (r.security_groups.length > 0) setGroupUuid(r.security_groups[0].uuid)
    })
  }, [])

  const yaml = useMemo(() => renderWorkflow(platform, groupUuid, modelUri), [platform, groupUuid, modelUri])

  function copy() {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">CI/CD generator</h1>
        <p className="text-sm text-fg-dim mt-1">
          Pick a platform, security group, and model URI. Copy the result into your repository.
          The verdict's exit code is the gate — non-zero blocks the build.
        </p>
      </div>

      <div className="bg-bg-raised border border-border rounded-lg p-4 grid grid-cols-3 gap-3">
        <Field label="Platform">
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full">
            {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Security group">
          <select value={groupUuid} onChange={(e) => setGroupUuid(e.target.value)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full">
            {groups.map((g) => <option key={g.uuid} value={g.uuid}>{g.name} ({g.source_type})</option>)}
          </select>
        </Field>
        <Field label="Model URI">
          <input value={modelUri} onChange={(e) => setModelUri(e.target.value)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full font-mono" />
        </Field>
      </div>

      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="text-xs text-fg-faint">
            {platform === 'github' && '.github/workflows/model-scan.yml'}
            {platform === 'gitlab' && '.gitlab-ci.yml'}
            {platform === 'jenkins' && 'Jenkinsfile'}
            {platform === 'azure' && 'azure-pipelines.yml'}
            {platform === 'circleci' && '.circleci/config.yml'}
            {platform === 'shell' && 'scripts/scan-model.sh'}
          </div>
          <button onClick={copy} className="text-xs text-fg-dim hover:text-fg inline-flex items-center gap-1">
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
        <pre className="p-4 font-mono text-[11px] overflow-auto bg-bg-subtle/40">{yaml}</pre>
      </div>

      <div className="text-xs text-fg-faint">
        Set <span className="font-mono text-fg-dim">MODEL_SECURITY_CLIENT_ID</span>,
        <span className="font-mono text-fg-dim"> MODEL_SECURITY_CLIENT_SECRET</span>, and
        <span className="font-mono text-fg-dim"> TSG_ID</span> as secrets in your CI provider.
        The CLI authenticates via those env vars.
      </div>
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

function renderWorkflow(platform: Platform, groupUuid: string, modelUri: string): string {
  const g = groupUuid || '<security-group-uuid>'
  const m = modelUri || 'https://huggingface.co/openai-community/gpt2'
  switch (platform) {
    case 'github':
      return `name: model-scan
on:
  pull_request:
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    env:
      MODEL_SECURITY_CLIENT_ID: \${{ secrets.MODEL_SECURITY_CLIENT_ID }}
      MODEL_SECURITY_CLIENT_SECRET: \${{ secrets.MODEL_SECURITY_CLIENT_SECRET }}
      TSG_ID: \${{ secrets.TSG_ID }}
    steps:
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - name: Install model-security CLI
        run: pip install model-security --extra-index-url $(curl -s https://...auth-endpoint)
      - name: Scan model
        run: |
          model-security scan \\
            --security-group-uuid ${g} \\
            --model-uri ${m} \\
            --block-on-errors
`
    case 'gitlab':
      return `stages: [scan]

model-security-scan:
  stage: scan
  image: python:3.12
  variables:
    MODEL_SECURITY_CLIENT_ID: $MODEL_SECURITY_CLIENT_ID
    MODEL_SECURITY_CLIENT_SECRET: $MODEL_SECURITY_CLIENT_SECRET
    TSG_ID: $TSG_ID
  script:
    - pip install model-security --extra-index-url $(curl -s https://...auth-endpoint)
    - >
      model-security scan
      --security-group-uuid ${g}
      --model-uri ${m}
      --block-on-errors
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_PIPELINE_SOURCE == "schedule"
`
    case 'jenkins':
      return `pipeline {
  agent any
  environment {
    MODEL_SECURITY_CLIENT_ID = credentials('MODEL_SECURITY_CLIENT_ID')
    MODEL_SECURITY_CLIENT_SECRET = credentials('MODEL_SECURITY_CLIENT_SECRET')
    TSG_ID = credentials('TSG_ID')
  }
  stages {
    stage('Install') {
      steps {
        sh 'pip install model-security --extra-index-url $(curl -s https://...auth-endpoint)'
      }
    }
    stage('Scan') {
      steps {
        sh """
          model-security scan \\\\
            --security-group-uuid ${g} \\\\
            --model-uri ${m} \\\\
            --block-on-errors
        """
      }
    }
  }
}
`
    case 'azure':
      return `trigger: [main]

pool:
  vmImage: 'ubuntu-latest'

variables:
  MODEL_SECURITY_CLIENT_ID: $(MODEL_SECURITY_CLIENT_ID)
  MODEL_SECURITY_CLIENT_SECRET: $(MODEL_SECURITY_CLIENT_SECRET)
  TSG_ID: $(TSG_ID)

steps:
  - task: UsePythonVersion@0
    inputs: { versionSpec: '3.12' }
  - script: pip install model-security --extra-index-url $(curl -s https://...auth-endpoint)
    displayName: Install CLI
  - script: |
      model-security scan \\
        --security-group-uuid ${g} \\
        --model-uri ${m} \\
        --block-on-errors
    displayName: Scan model
`
    case 'circleci':
      return `version: 2.1

jobs:
  scan:
    docker:
      - image: cimg/python:3.12
    environment:
      MODEL_SECURITY_CLIENT_ID: $MODEL_SECURITY_CLIENT_ID
      MODEL_SECURITY_CLIENT_SECRET: $MODEL_SECURITY_CLIENT_SECRET
      TSG_ID: $TSG_ID
    steps:
      - checkout
      - run: pip install model-security --extra-index-url $(curl -s https://...auth-endpoint)
      - run: |
          model-security scan \\
            --security-group-uuid ${g} \\
            --model-uri ${m} \\
            --block-on-errors

workflows:
  version: 2
  build_and_scan:
    jobs: [scan]
`
    case 'shell':
      return `#!/usr/bin/env bash
# Set these as exported env vars or fetch from a secret manager:
#   MODEL_SECURITY_CLIENT_ID, MODEL_SECURITY_CLIENT_SECRET, TSG_ID
set -euo pipefail

pip install model-security --extra-index-url $(curl -s https://...auth-endpoint)

model-security scan \\
  --security-group-uuid ${g} \\
  --model-uri ${m} \\
  --block-on-errors

# Exit code is the gate: 0 = ALLOWED, non-zero = BLOCKED or ERROR.
`
  }
}
```

Note on the auth URL: the snippet uses `$(curl -s https://...auth-endpoint)` as a placeholder for the actual `get-pypi-url.sh` flow. In a real customer workflow this would be the curl token-exchange (matching `get-pypi-url.sh`). The placeholder is acceptable for a generator — users will substitute their own auth shell snippet. Add a comment in each template noting this if you want, but the prevailing approach in real CI templates is "paste the auth dance from the docs", so leaving the placeholder is faithful.

- [ ] **Step 4: Build**

```bash
cd app/frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/pages/CicdGenerator.tsx \
        app/frontend/src/components/Sidebar.tsx \
        app/frontend/src/App.tsx
git commit -m "m4: /cicd page — YAML generator for 6 CI platforms"
```

---

## Task 9: Smoke-test docs + final verification

**Files:**
- Modify: `app/README.md`

- [ ] **Step 1: Append M4 smoke test section**

Read `app/README.md`. Append after the M3 smoke test section:

```markdown
### M4 smoke test additions

After `./restart.sh`:

1. **Drawer tabs** — Log, REPL, Code visible as clickable tabs. Switch between them.
2. **Log tab** — Continues to populate as you click around (no regression).
3. **Code tab** — Navigate to /scans. The Code tab should show `client.list_scans(limit=…)`. Navigate to /scan and pick a model — Code tab should show the scan call. Refresh the page and Code clears (correctly).
4. **REPL tab** — Type `1 + 2` and Enter; see `3` in the output. Type `client.call("list_security_groups")` and Enter; see the response. Press ↑ to recall history.
5. **REPL multi-line** — Type `def f():` and Enter; should switch to continuation mode. Type `    return 7` and Enter twice; then `f()` and Enter — should print `7`.
6. **REPL appears in Log** — Calls issued from the REPL should also stream into the Log tab (the SDKProxy emits the events).
7. **/environment** — SDK info + methods + Pydantic schema browser. Filter for a schema (e.g. "Scan"), click to expand its JSON Schema tree.
8. **/cicd** — pick GitHub Actions, pick a security group, type a HuggingFace URI. Verify the YAML contains your group's UUID. Click Copy and paste into a text editor — content matches.
```

- [ ] **Step 2: Final full-suite green check**

```bash
source .venv/bin/activate
pytest app/backend/tests/ -v
cd app/frontend && npm test && cd -
```
Expected: ≥ 55 backend tests (41 from M3 + ≥ 14 from M4: 3 _common + 3 schemas + ≥ 11 repl); ≥ 14 frontend tests (8 from M2 + 6 from M4 codegen).

- [ ] **Step 3: Commit**

```bash
git add app/README.md
git commit -m "m4: README smoke test additions"
```

---

## Done — exit criteria

- Drawer has 3 functional tabs: Log, REPL, Code.
- REPL executes `1 + 2` → `3`; multi-line defs work; ↑/↓ navigates history; calls flow through the SDKProxy chokepoint so they also appear in Log.
- Code tab shows the per-screen sequence of `client.method(...)` calls; clears on navigation.
- /environment shows the SDK info + methods + a collapsible list of every Pydantic model in airs_schemas.
- /cicd renders correct YAML for 6 platforms with the user's real security_group_uuid interpolated.
- All previous M1+M2+M3 functionality still works.
- All backend tests + frontend tests pass.

## Next milestones

None — M4 completes the original Demo UI spec. Future enhancements (mutation endpoints, multi-tenant `.env` switching, scan diffing, export to PDF) are v2 candidates per the original spec's "Out of scope (v2)" section.
