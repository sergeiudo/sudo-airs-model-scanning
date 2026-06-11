# Demo UI — Milestone 3 Implementation Plan (Groups, Rules, Models, Scan Enrichment)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "policy & catalog" surface to the Demo UI — show customers what the gate inspects (rules), how policy is configured per source type (security groups + rule instances), what models the scanner has seen (models / versions / files), and **what the violations actually were** for any blocked scan (with remediation steps). Replaces today's raw-JSON fallback on ScanDetail with rendered evidence.

**Architecture:** Six new REST routes (`GET /api/groups/{uuid}`, `GET /api/rules`, `GET /api/models`, `GET /api/models/{uuid}/versions`, `GET /api/model-versions/{uuid}/files`, plus two scan-detail enrichment endpoints `GET /api/scans/{uuid}/violations` and `GET /api/scans/{uuid}/evaluations`). Five new frontend pages (`/groups`, `/groups/:uuid`, `/rules`, `/models`, `/models/:modelUuid/versions/:versionUuid?`) and one major page enrichment (ScanDetail violations + evaluations sections). Reuses M1+M2 patterns (SDKProxy chokepoint, dependency-override testing, ScansTable-style reusable display components).

**Tech Stack:** Python 3.12 · FastAPI · pytest · React 19 · Vite · TypeScript · Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md`

**Previous milestones:** `docs/superpowers/plans/2026-05-23-demo-ui-milestone-1.md` (shipped — app shell + 3 pages + Log drawer) and `docs/superpowers/plans/2026-05-24-demo-ui-milestone-2.md` (shipped — scans surface).

**What's in M3:**
- Backend: 7 read-only routes wrapping `get_security_group`, `list_security_rules`, `list_models`, `list_model_versions`, `list_model_version_files`, `get_scan_violations`, `get_scan_evaluations`.
- Frontend: `/groups` (proper list page promoted from Dashboard widget), `/groups/:uuid` (rules + rule-instance detail), `/rules` (full catalog — the deck's "Coverage" slide), `/models` (browser with version + file drill-downs), enriched ScanDetail (violations + evaluations rendered as collapsible sections), Dashboard polish (model count stat + rules quick-link).
- Reusable display components for rules, rule instances, violations, evaluations.

**Explicitly NOT in M3 (deferred to M4):**
- REPL tab in drawer
- Code tab in drawer (`codegen.py` integration)
- `/environment` Pydantic schema browser
- CI/CD YAML generator
- Mutation endpoints (`update_rule_instance`, `create_security_group`, `set_scan_labels`, etc.) — UI stays read-only in v1 per spec

---

## Pre-flight context for the implementer

Read these before starting:

- `CLAUDE.md` — proprietary SDK install notes; SDK reads creds from env; **detailed per-file findings live in SCM** has been partially superseded — the SDK *does* expose `get_scan_violations` and `get_scan_evaluations`, so we can now render them in-app while still deep-linking to SCM for the full record.
- `docs/superpowers/specs/2026-05-23-prisma-airs-demo-ui-design.md` — design source.
- `docs/superpowers/plans/2026-05-24-demo-ui-milestone-2.md` — the M2 plan whose conventions, file layout, test patterns, and component library this plan extends.
- `app/backend/routes/scans.py`, `app/backend/routes/groups.py`, `app/backend/sdk_proxy.py` — current shape of backend.
- `app/frontend/src/pages/{Dashboard,ScanDetail,ScansList}.tsx`, `app/frontend/src/components/ScanResult/`, `app/frontend/src/lib/{types,api}.ts` — current shape of frontend.

**Conventions (unchanged from M1/M2):**
- Paths relative to repo root unless prefixed with `app/`.
- Backend Python: type hints, Pydantic v2, route handlers thin (call SDKProxy + dump).
- Frontend: TS strict, Tailwind tokens already defined, no `any` outside untyped boundaries.
- Commit messages: `m3: <short description>`.
- Test pattern (backend): `app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock_with_method, WSHub())`.
- SDKProxy.call accepts both positional and keyword args (Task 3 of M2 widened the signature).

**SDK return shapes** (from notebooks + scripts):
- `get_security_group(UUID)` → group object with `.uuid`, `.name`, `.source_type`, `.description`, `.rules` array (each rule has `.name`, `.enabled`, `.blocking`, possibly `.rule_uuid`, `.severity`).
- `list_security_rules()` → response with `.security_rules` array (full catalog, ~10 entries per the deck — Deserialization, Malicious Code, Neural Backdoor, etc.). Each rule has at least `.name`, `.description`, `.severity`, `.uuid`.
- `list_models()` → response with `.models` array; each entry has `.uuid`, `.name`, `.source_type`, `.uri`, plus possibly `.created_at`, `.author`, `.tags`.
- `list_model_versions(model_uuid=UUID)` → response with `.model_versions` array; each has `.uuid`, `.name`/`.tag`/`.version_id`, `.created_at`.
- `list_model_version_files(model_version_uuid=UUID)` → response with `.files` array; each has `.uuid`, `.name`/`.path`, `.size`, `.format`.
- `get_scan_violations(scan_uuid=UUID)` → response with `.violations` array; each violation has `.rule_name`, `.severity`, `.threat`/`.issue`, `.file`/`.file_path`, `.remediation` (with `.steps` array per `scan_huggingface_model.py`).
- `get_scan_evaluations(scan_uuid=UUID)` → response with `.evaluations` array; each evaluation has `.rule_name`, `.outcome` ("PASSED"/"FAILED"), `.severity`, possibly `.detail`.

**Important:** Field names above are best-guess from notebook/script evidence. **The implementer must inspect the actual response shape during Step 1 of each backend task** (the first scan against `ykilcher/totally-harmless-model` will produce real violations to introspect) and adjust the frontend rendering if the field names differ. The render-everything-with-fallbacks pattern from M2's ScanDetail (`{scan.security_group_name && <Row…>}`) is the safety net.

---

## File map (what gets created or modified)

```
app/
├── backend/
│   ├── routes/
│   │   ├── groups.py             # MODIFY: add GET /api/groups/{uuid}
│   │   ├── rules.py              # CREATE: GET /api/rules
│   │   ├── models.py             # CREATE: GET /api/models, /:uuid/versions, GET /api/model-versions/:uuid/files
│   │   └── scans.py              # MODIFY: add /api/scans/{uuid}/violations + /api/scans/{uuid}/evaluations
│   ├── main.py                   # MODIFY: include new routers
│   └── tests/
│       ├── test_groups_route.py  # MODIFY: cover detail
│       ├── test_rules_route.py   # CREATE
│       ├── test_models_route.py  # CREATE
│       └── test_scans_route.py   # MODIFY: cover violations + evaluations
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            # MODIFY: getGroup, listRules, listModels, listModelVersions, listFiles, getViolations, getEvaluations
│   │   │   └── types.ts          # MODIFY: SecurityRule, RuleInstance, GroupDetail, ModelSummary, ModelVersion, ModelFile, Violation, Evaluation
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # MODIFY: add Groups + Rules + Models entries
│   │   │   └── ScanResult/
│   │   │       ├── ViolationsList.tsx     # CREATE
│   │   │       └── EvaluationsTable.tsx   # CREATE
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # MODIFY: model count stat, rules quick-link
│   │   │   ├── ScanDetail.tsx    # MODIFY: render violations + evaluations
│   │   │   ├── Groups.tsx        # CREATE → /groups
│   │   │   ├── GroupDetail.tsx   # CREATE → /groups/:uuid
│   │   │   ├── Rules.tsx         # CREATE → /rules
│   │   │   └── Models.tsx        # CREATE → /models  (handles model + versions + files via nested routes)
│   │   └── App.tsx               # MODIFY: wire 5 new routes
└── (no docs changes)
```

---

## Task 1: Backend — GET /api/groups/{uuid} + GET /api/rules

Two read-only routes. `get_security_group` returns rules embedded in the group; `list_security_rules` returns the global catalog of rule definitions.

**Files:**
- Modify: `app/backend/routes/groups.py`
- Create: `app/backend/routes/rules.py`
- Modify: `app/backend/main.py`
- Modify: `app/backend/tests/test_groups_route.py`
- Create: `app/backend/tests/test_rules_route.py`

- [ ] **Step 1: Write failing tests**

Replace `app/backend/tests/test_groups_route.py`:

```python
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeGroupsList(BaseModel):
    security_groups: list[dict]


def test_list_groups_returns_dumped_payload():
    c = MagicMock()
    c.list_security_groups = MagicMock(return_value=FakeGroupsList(security_groups=[
        {"uuid": "g-1", "name": "Default HF", "source_type": "HUGGING_FACE", "description": None},
    ]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/groups")
    assert r.status_code == 200
    assert r.json()["security_groups"][0]["uuid"] == "g-1"


def test_get_group_returns_dumped_payload_and_calls_sdk_with_uuid():
    class FakeGroupDetail(BaseModel):
        uuid: str
        name: str
        source_type: str
        rules: list[dict]

    c = MagicMock()
    c.get_security_group = MagicMock(return_value=FakeGroupDetail(
        uuid="8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2",
        name="Default HF", source_type="HUGGING_FACE",
        rules=[{"name": "Malicious Code", "enabled": True, "blocking": True}],
    ))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/groups/8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2")
    assert r.status_code == 200
    body = r.json()
    assert body["uuid"] == "8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2"
    assert body["rules"][0]["name"] == "Malicious Code"
    args, kwargs = c.get_security_group.call_args
    arg = args[0] if args else (kwargs.get("security_group_uuid") or kwargs.get("uuid"))
    assert str(arg) == "8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2"


def test_get_group_rejects_invalid_uuid():
    app = create_app()
    client = TestClient(app)
    r = client.get("/api/groups/not-a-uuid")
    assert r.status_code == 400
```

Create `app/backend/tests/test_rules_route.py`:

```python
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.backend.main import create_app
from app.backend import deps
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub


class FakeRulesList(BaseModel):
    security_rules: list[dict]


def test_list_rules_returns_dumped_payload():
    c = MagicMock()
    c.list_security_rules = MagicMock(return_value=FakeRulesList(security_rules=[
        {"uuid": "r-1", "name": "Malicious Code", "severity": "HIGH", "description": "…"},
        {"uuid": "r-2", "name": "Neural Backdoor", "severity": "HIGH", "description": "…"},
    ]))
    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(c, WSHub())
    client = TestClient(app)
    r = client.get("/api/rules")
    assert r.status_code == 200
    body = r.json()
    assert len(body["security_rules"]) == 2
    c.list_security_rules.assert_called_once_with()
```

- [ ] **Step 2: Run tests, confirm two fail (groups detail, rules list)**

```bash
source .venv/bin/activate
pytest app/backend/tests/test_groups_route.py app/backend/tests/test_rules_route.py -v
```
Expected: existing list test passes (route exists from M1); new tests fail (no routes yet).

- [ ] **Step 3: Add the routes**

Replace `app/backend/routes/groups.py`:

```python
"""GET /api/groups — list; GET /api/groups/{uuid} — single group with rules."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy

router = APIRouter()


@router.get("/api/groups")
def list_groups(proxy: SDKProxy = Depends(get_proxy)) -> dict:
    result = proxy.call("list_security_groups")
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"security_groups": []}


@router.get("/api/groups/{group_uuid}")
def get_group_detail(group_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    try:
        parsed = UUID(group_uuid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid group uuid: {exc}") from exc
    result = proxy.call("get_security_group", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {}
```

Create `app/backend/routes/rules.py`:

```python
"""GET /api/rules — full catalog of security rules (the deck's 'Coverage' slide)."""
from fastapi import APIRouter, Depends
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy

router = APIRouter()


@router.get("/api/rules")
def list_rules(proxy: SDKProxy = Depends(get_proxy)) -> dict:
    result = proxy.call("list_security_rules")
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"security_rules": []}
```

Wire the new router in `app/backend/main.py`. The current `from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route` import line needs `, rules as rules_route` appended, and the corresponding `app.include_router(rules_route.router)` added.

Open `app/backend/main.py` and replace the imports + router includes block. Current shape:

```python
from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route
...
    app.include_router(ws_route.router)
    app.include_router(env_route.router)
    app.include_router(groups_route.router)
    app.include_router(scans_route.router)
```

Update to:

```python
from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route, rules as rules_route
...
    app.include_router(ws_route.router)
    app.include_router(env_route.router)
    app.include_router(groups_route.router)
    app.include_router(scans_route.router)
    app.include_router(rules_route.router)
```

- [ ] **Step 4: Re-run tests, confirm pass**

```bash
pytest app/backend/tests/test_groups_route.py app/backend/tests/test_rules_route.py -v
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add app/backend/routes/groups.py app/backend/routes/rules.py app/backend/main.py \
        app/backend/tests/test_groups_route.py app/backend/tests/test_rules_route.py
git commit -m "m3: GET /api/groups/:uuid + GET /api/rules"
```

---

## Task 2: Backend — Models browser routes

Three routes for the models hierarchy: list, versions of a model, files of a version. The version files endpoint is mounted at `/api/model-versions/{version_uuid}/files` (flat) because version UUIDs are globally unique and the deep-nested `/api/models/{mUuid}/versions/{vUuid}/files` makes route handlers fetch the model unnecessarily.

**Files:**
- Create: `app/backend/routes/models.py`
- Modify: `app/backend/main.py`
- Create: `app/backend/tests/test_models_route.py`

- [ ] **Step 1: Write failing tests**

Create `app/backend/tests/test_models_route.py`:

```python
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
    client = TestClient(app)
    r = client.get("/api/models/not-a-uuid/versions")
    assert r.status_code == 400


def test_list_version_files_rejects_invalid_uuid():
    app = create_app()
    client = TestClient(app)
    r = client.get("/api/model-versions/not-a-uuid/files")
    assert r.status_code == 400
```

- [ ] **Step 2: Run, confirm failure**

```bash
pytest app/backend/tests/test_models_route.py -v
```
Expected: all 404 / no route.

- [ ] **Step 3: Add the routes**

Create `app/backend/routes/models.py`:

```python
"""GET /api/models — model catalog;
GET /api/models/{uuid}/versions — versions for a model;
GET /api/model-versions/{uuid}/files — files for a version."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.backend.deps import get_proxy
from app.backend.sdk_proxy import SDKProxy

router = APIRouter()


def _parse(label: str, raw: str) -> UUID:
    try:
        return UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid {label} uuid: {exc}") from exc


@router.get("/api/models")
def list_models(limit: int = 50, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    limit = max(1, min(limit, 200))
    result = proxy.call("list_models", limit=limit)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"models": []}


@router.get("/api/models/{model_uuid}/versions")
def list_versions(model_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = _parse("model", model_uuid)
    result = proxy.call("list_model_versions", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"model_versions": []}


@router.get("/api/model-versions/{version_uuid}/files")
def list_files(version_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    parsed = _parse("model-version", version_uuid)
    result = proxy.call("list_model_version_files", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"files": []}
```

Wire in `app/backend/main.py`. Update the routes import line and add the include:

```python
from app.backend.routes import ws as ws_route, env as env_route, groups as groups_route, scans as scans_route, rules as rules_route, models as models_route
```

Add `app.include_router(models_route.router)` in the body alongside the other includes.

- [ ] **Step 4: Re-run tests, confirm pass**

```bash
pytest app/backend/tests/test_models_route.py -v
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add app/backend/routes/models.py app/backend/main.py app/backend/tests/test_models_route.py
git commit -m "m3: GET /api/models + versions + files routes"
```

---

## Task 3: Backend — Scan detail enrichment routes

`get_scan_violations` and `get_scan_evaluations` return the per-rule evidence that today's ScanDetail page can't render (it falls back to raw JSON because the M2 plan assumed the SDK only returned summary). They live under the scans router.

**Files:**
- Modify: `app/backend/routes/scans.py`
- Modify: `app/backend/tests/test_scans_route.py`

- [ ] **Step 1: Append failing tests to test_scans_route.py**

Append to `app/backend/tests/test_scans_route.py`:

```python
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
    client = TestClient(app)
    r = client.get("/api/scans/not-a-uuid/violations")
    assert r.status_code == 400


def test_evaluations_endpoint_rejects_invalid_uuid():
    app = create_app()
    client = TestClient(app)
    r = client.get("/api/scans/not-a-uuid/evaluations")
    assert r.status_code == 400
```

- [ ] **Step 2: Run, confirm failure**

```bash
pytest app/backend/tests/test_scans_route.py -v -k "violations or evaluations"
```
Expected: 404s.

- [ ] **Step 3: Add the routes**

Append to `app/backend/routes/scans.py` (after `get_scan_detail`):

```python
@router.get("/api/scans/{scan_uuid}/violations")
def get_scan_violations(scan_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    try:
        parsed = UUID(scan_uuid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid scan uuid: {exc}") from exc
    result = proxy.call("get_scan_violations", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"violations": []}


@router.get("/api/scans/{scan_uuid}/evaluations")
def get_scan_evaluations(scan_uuid: str, proxy: SDKProxy = Depends(get_proxy)) -> dict:
    try:
        parsed = UUID(scan_uuid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid scan uuid: {exc}") from exc
    result = proxy.call("get_scan_evaluations", parsed)
    return result.model_dump(mode="json") if hasattr(result, "model_dump") else {"evaluations": []}
```

- [ ] **Step 4: Re-run tests, confirm pass**

```bash
pytest app/backend/tests/test_scans_route.py -v
```
Expected: 12 passed (8 from M2 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add app/backend/routes/scans.py app/backend/tests/test_scans_route.py
git commit -m "m3: GET /api/scans/:uuid/violations + /evaluations"
```

---

## Task 4: Frontend — types + api client extensions

**Files:**
- Modify: `app/frontend/src/lib/types.ts`
- Modify: `app/frontend/src/lib/api.ts`

- [ ] **Step 1: Extend types**

Append to `app/frontend/src/lib/types.ts` (do NOT replace the file — only add):

```typescript
export type SecurityRule = {
  uuid: string
  name: string
  description?: string
  severity?: 'HIGH' | 'MEDIUM' | 'LOW' | string
  [extra: string]: unknown
}

export type SecurityRulesList = { security_rules: SecurityRule[] }

export type GroupRule = {
  name: string
  enabled?: boolean
  blocking?: boolean
  rule_uuid?: string
  severity?: string
  [extra: string]: unknown
}

export type GroupDetail = {
  uuid: string
  name: string
  source_type: string
  description?: string | null
  rules?: GroupRule[]
  [extra: string]: unknown
}

export type ModelSummary = {
  uuid: string
  name?: string
  uri?: string
  source_type?: string
  author?: string
  created_at?: string
  [extra: string]: unknown
}

export type ModelsList = { models: ModelSummary[] }

export type ModelVersion = {
  uuid: string
  name?: string
  version_id?: string
  tag?: string
  created_at?: string
  [extra: string]: unknown
}

export type ModelVersionsList = { model_versions: ModelVersion[] }

export type ModelFile = {
  uuid?: string
  name?: string
  path?: string
  size?: number
  format?: string
  [extra: string]: unknown
}

export type ModelFilesList = { files: ModelFile[] }

export type Violation = {
  rule_name?: string
  severity?: string
  threat?: string
  issue?: string
  file?: string
  file_path?: string
  remediation?: { steps?: string[]; [k: string]: unknown }
  [extra: string]: unknown
}

export type ViolationsList = { violations: Violation[] }

export type Evaluation = {
  rule_name?: string
  outcome?: 'PASSED' | 'FAILED' | string
  severity?: string
  detail?: string
  [extra: string]: unknown
}

export type EvaluationsList = { evaluations: Evaluation[] }
```

- [ ] **Step 2: Extend api client**

Replace `app/frontend/src/lib/api.ts`:

```typescript
import type {
  EnvInfo, GroupDetail, GroupsList, EvaluationsList, ModelFilesList,
  ModelsList, ModelVersionsList, ScanDetail, ScanJob, ScansList,
  ScanRequestAdvanced, SecurityRulesList, ViolationsList,
} from './types'

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
  getGroup: (uuid: string) => jget<GroupDetail>(`/api/groups/${uuid}`),
  listRules: () => jget<SecurityRulesList>('/api/rules'),
  listModels: (limit = 50) => jget<ModelsList>(`/api/models?limit=${limit}`),
  listModelVersions: (modelUuid: string) => jget<ModelVersionsList>(`/api/models/${modelUuid}/versions`),
  listVersionFiles: (versionUuid: string) => jget<ModelFilesList>(`/api/model-versions/${versionUuid}/files`),
  startScan: (body: { security_group_uuid: string; model_uri: string } & ScanRequestAdvanced) =>
    jpost<{ scan_job_id: string }>('/api/scans', body),
  scanJob: (jobId: string) => jget<ScanJob>(`/api/scan-jobs/${jobId}`),
  listScans: (limit = 50) => jget<ScansList>(`/api/scans?limit=${limit}`),
  getScan: (uuid: string) => jget<ScanDetail>(`/api/scans/${uuid}`),
  getScanViolations: (uuid: string) => jget<ViolationsList>(`/api/scans/${uuid}/violations`),
  getScanEvaluations: (uuid: string) => jget<EvaluationsList>(`/api/scans/${uuid}/evaluations`),
}
```

- [ ] **Step 3: Build**

```bash
cd app/frontend && npm run build
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/frontend/src/lib/types.ts app/frontend/src/lib/api.ts
git commit -m "m3: frontend types + api extensions for groups/rules/models/violations/evaluations"
```

---

## Task 5: Frontend — Sidebar + App.tsx wiring with page stubs

Get the navigation skeleton in place so Tasks 6–9 each replace a real route.

**Files:**
- Modify: `app/frontend/src/components/Sidebar.tsx`
- Modify: `app/frontend/src/App.tsx`
- Create: `app/frontend/src/pages/Groups.tsx` (stub; replaced in Task 6)
- Create: `app/frontend/src/pages/GroupDetail.tsx` (stub; replaced in Task 6)
- Create: `app/frontend/src/pages/Rules.tsx` (stub; replaced in Task 7)
- Create: `app/frontend/src/pages/Models.tsx` (stub; replaced in Task 8)

- [ ] **Step 1: Update Sidebar**

Replace `app/frontend/src/components/Sidebar.tsx`:

```typescript
import { NavLink } from 'react-router-dom'
import { Home, ScanLine, ListChecks, GitCompare, Layers, ShieldCheck, Box, Settings2 } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/scan', label: 'Run a scan', icon: ScanLine },
  { to: '/scans', label: 'Scans', icon: ListChecks },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/groups', label: 'Groups', icon: Layers },
  { to: '/rules', label: 'Rules', icon: ShieldCheck },
  { to: '/models', label: 'Models', icon: Box },
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

(`Layers`, `ShieldCheck`, `Box` are valid lucide-react exports.)

- [ ] **Step 2: Update App.tsx**

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
import { Groups } from '@/pages/Groups'
import { GroupDetail } from '@/pages/GroupDetail'
import { Rules } from '@/pages/Rules'
import { Models } from '@/pages/Models'
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
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:groupUuid" element={<GroupDetail />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/models" element={<Models />} />
        <Route path="/models/:modelUuid" element={<Models />} />
        <Route path="/models/:modelUuid/versions/:versionUuid" element={<Models />} />
        <Route path="/environment" element={<Environment />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
```

Note: `Models` renders for three nested routes. The page reads `useParams<{modelUuid?: string; versionUuid?: string}>` and dispatches internally between list / versions / files mode. That keeps related URLs in one file.

- [ ] **Step 3: Create stub pages**

Each stub is identical shape:

```bash
cat > app/frontend/src/pages/Groups.tsx <<'EOF'
export function Groups() { return <div /> }
EOF
cat > app/frontend/src/pages/GroupDetail.tsx <<'EOF'
export function GroupDetail() { return <div /> }
EOF
cat > app/frontend/src/pages/Rules.tsx <<'EOF'
export function Rules() { return <div /> }
EOF
cat > app/frontend/src/pages/Models.tsx <<'EOF'
export function Models() { return <div /> }
EOF
```

(Tasks 6, 7, 8 fully replace these.)

- [ ] **Step 4: Build**

```bash
cd app/frontend && npm run build
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/components/Sidebar.tsx app/frontend/src/App.tsx \
        app/frontend/src/pages/Groups.tsx app/frontend/src/pages/GroupDetail.tsx \
        app/frontend/src/pages/Rules.tsx app/frontend/src/pages/Models.tsx
git commit -m "m3: sidebar + routes for Groups, Rules, Models (page stubs)"
```

---

## Task 6: Frontend — /groups + /groups/:uuid

Two pages: list of groups (calls existing `api.groups()`), and group detail with rules + per-rule enabled/blocking badges.

**Files:**
- Replace: `app/frontend/src/pages/Groups.tsx`
- Replace: `app/frontend/src/pages/GroupDetail.tsx`

- [ ] **Step 1: Implement /groups**

Replace `app/frontend/src/pages/Groups.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GroupsList, SecurityGroup } from '@/lib/types'
import { api } from '@/lib/api'

export function Groups() {
  const [groups, setGroups] = useState<SecurityGroup[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    api.groups().then((r: GroupsList) => setGroups(r.security_groups)).catch((e) => setErr(String(e)))
  }, [])

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Security groups</h1>
        <p className="text-sm text-fg-dim mt-1">
          One group per source type (HuggingFace, S3, GCS, Azure, Local). Click a group to see its rules.
        </p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Name</th>
              <th className="text-left px-3 py-2 font-normal">Source type</th>
              <th className="text-left px-3 py-2 font-normal">UUID</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
                <td className="px-3 py-2"><Link to={`/groups/${g.uuid}`} className="hover:underline">{g.name}</Link></td>
                <td className="px-3 py-2 font-mono text-xs text-fg-dim">{g.source_type}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{g.uuid.slice(0, 8)}…</td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No groups.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement /groups/:uuid**

Replace `app/frontend/src/pages/GroupDetail.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { GroupDetail as GroupDetailT, GroupRule } from '@/lib/types'
import { api } from '@/lib/api'

export function GroupDetail() {
  const { groupUuid = '' } = useParams<{ groupUuid: string }>()
  const [group, setGroup] = useState<GroupDetailT | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setGroup(null); setErr(null)
    api.getGroup(groupUuid).then(setGroup).catch((e) => setErr(String(e)))
  }, [groupUuid])

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/groups" className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> All groups
      </Link>
      {err && <div className="text-danger text-sm">{err}</div>}
      {!group && !err && <div className="text-fg-faint text-sm">Loading group…</div>}
      {group && (
        <>
          <div>
            <h1 className="text-xl font-semibold">{group.name}</h1>
            <div className="text-xs text-fg-dim mt-1">
              <span className="font-mono">{group.source_type}</span>
              {group.description && <> · {group.description}</>}
            </div>
            <div className="text-[10px] font-mono text-fg-faint mt-1">{group.uuid}</div>
          </div>

          <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-medium">
              Rules <span className="text-fg-faint text-xs ml-2">{group.rules?.length ?? 0} total</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-normal">Rule</th>
                  <th className="text-left px-3 py-2 font-normal">Severity</th>
                  <th className="text-left px-3 py-2 font-normal">Enabled</th>
                  <th className="text-left px-3 py-2 font-normal">Blocking</th>
                </tr>
              </thead>
              <tbody>
                {(group.rules ?? []).map((r, i) => (
                  <RuleRow key={r.rule_uuid ?? `${i}-${r.name}`} rule={r} />
                ))}
                {(!group.rules || group.rules.length === 0) && (
                  <tr><td colSpan={4} className="px-3 py-4 text-fg-faint text-sm">No rules surfaced for this group.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <details className="text-xs">
            <summary className="text-fg-dim cursor-pointer">Raw response</summary>
            <pre className="mt-2 p-3 bg-bg-subtle rounded font-mono text-[11px] overflow-auto">
{JSON.stringify(group, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}

function RuleRow({ rule }: { rule: GroupRule }) {
  return (
    <tr className="border-b border-border/40">
      <td className="px-3 py-2 text-fg">{rule.name}</td>
      <td className="px-3 py-2 text-fg-dim text-xs font-mono">{rule.severity ?? '—'}</td>
      <td className="px-3 py-2">
        <Pill ok={rule.enabled !== false} okLabel="enabled" badLabel="disabled" />
      </td>
      <td className="px-3 py-2">
        <Pill ok={!!rule.blocking} okLabel="blocking" badLabel="non-blocking" okColour="danger" badColour="warn" />
      </td>
    </tr>
  )
}

function Pill({ ok, okLabel, badLabel, okColour = 'success', badColour = 'fg-faint' }:
  { ok: boolean; okLabel: string; badLabel: string; okColour?: string; badColour?: string }) {
  const cls = ok ? `bg-${okColour}/15 text-${okColour}` : `bg-bg-subtle text-${badColour}`
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>{ok ? okLabel : badLabel}</span>
}
```

(The `Pill` component uses dynamic Tailwind class names via template literals. Since Tailwind purges unused classes at build time, the strings used by Pill — `bg-success/15`, `text-success`, `bg-bg-subtle`, `text-fg-faint`, `bg-danger/15`, `text-danger`, `text-warn` — must already exist somewhere else in the codebase for the JIT compiler to keep them. They do — they're all used in M2 components. If a build warning appears about missing classes, the fix is to define them statically in this file's JSDoc or add a Tailwind safelist entry; only do that if you see actual missing styles in the running UI.)

- [ ] **Step 3: Build**

```bash
cd app/frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/frontend/src/pages/Groups.tsx app/frontend/src/pages/GroupDetail.tsx
git commit -m "m3: /groups list + /groups/:uuid detail with rules table"
```

---

## Task 7: Frontend — /rules catalog

The deck's "Coverage" slide rendered live: every security rule the platform supports, with severity + description.

**Files:**
- Replace: `app/frontend/src/pages/Rules.tsx`

- [ ] **Step 1: Implement /rules**

Replace `app/frontend/src/pages/Rules.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react'
import type { SecurityRule, SecurityRulesList } from '@/lib/types'
import { api } from '@/lib/api'

const SEVERITY_COLOUR: Record<string, string> = {
  HIGH: 'bg-danger/15 text-danger',
  MEDIUM: 'bg-warn/15 text-warn',
  LOW: 'bg-bg-subtle text-fg-dim',
}

export function Rules() {
  const [rules, setRules] = useState<SecurityRule[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.listRules().then((r: SecurityRulesList) => setRules(r.security_rules)).catch((e) => setErr(String(e)))
  }, [])

  const filtered = useMemo(() => rules.filter((r) =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.description ?? '').toLowerCase().includes(q.toLowerCase())
  ), [rules, q])

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Security rules</h1>
        <p className="text-sm text-fg-dim mt-1">
          The complete catalogue of rules the scanner evaluates. Each security group enables some subset of these.
        </p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}

      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or description…"
        className="bg-bg-subtle border border-border rounded-md px-2 py-1.5 text-xs w-full font-mono"
      />

      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Rule</th>
              <th className="text-left px-3 py-2 font-normal">Severity</th>
              <th className="text-left px-3 py-2 font-normal">Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const sev = (r.severity ?? '').toUpperCase()
              const colour = SEVERITY_COLOUR[sev] ?? 'bg-bg-subtle text-fg-dim'
              return (
                <tr key={r.uuid} className="border-b border-border/40 align-top">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${colour}`}>{sev || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-fg-dim text-xs">{r.description ?? '—'}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No rules match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-fg-faint">Showing {filtered.length} of {rules.length} rules.</div>
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
git add app/frontend/src/pages/Rules.tsx
git commit -m "m3: /rules catalog page (deck's Coverage slide, rendered live)"
```

---

## Task 8: Frontend — /models browser (list + versions + files)

One file handles three URL shapes:
- `/models` — list models
- `/models/:modelUuid` — list versions for that model (with a header showing the model)
- `/models/:modelUuid/versions/:versionUuid` — list files for that version (with a breadcrumb)

**Files:**
- Replace: `app/frontend/src/pages/Models.tsx`

- [ ] **Step 1: Implement**

Replace `app/frontend/src/pages/Models.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { ModelFile, ModelSummary, ModelVersion } from '@/lib/types'
import { api } from '@/lib/api'

export function Models() {
  const { modelUuid, versionUuid } = useParams<{ modelUuid?: string; versionUuid?: string }>()
  if (versionUuid && modelUuid) return <FilesView modelUuid={modelUuid} versionUuid={versionUuid} />
  if (modelUuid) return <VersionsView modelUuid={modelUuid} />
  return <ModelsList />
}

function ModelsList() {
  const [models, setModels] = useState<ModelSummary[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { api.listModels(100).then((r) => setModels(r.models)).catch((e) => setErr(String(e))) }, [])

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Models</h1>
        <p className="text-sm text-fg-dim mt-1">
          Every model the scanner has catalogued for this tenant. Click a row to see its versions and files.
        </p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Name</th>
              <th className="text-left px-3 py-2 font-normal">URI</th>
              <th className="text-left px-3 py-2 font-normal">Source</th>
              <th className="text-left px-3 py-2 font-normal">UUID</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
                <td className="px-3 py-2"><Link to={`/models/${m.uuid}`} className="hover:underline">{m.name ?? '(unnamed)'}</Link></td>
                <td className="px-3 py-2 font-mono text-xs truncate max-w-sm text-fg-dim">{m.uri ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-fg-dim">{m.source_type ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{m.uuid.slice(0, 8)}…</td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-fg-faint text-sm">No models catalogued yet — run a scan first.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VersionsView({ modelUuid }: { modelUuid: string }) {
  const [versions, setVersions] = useState<ModelVersion[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    setVersions([]); setErr(null)
    api.listModelVersions(modelUuid).then((r) => setVersions(r.model_versions)).catch((e) => setErr(String(e)))
  }, [modelUuid])
  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/models" className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> All models
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Versions</h1>
        <div className="text-[10px] font-mono text-fg-faint mt-1">model {modelUuid}</div>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Version</th>
              <th className="text-left px-3 py-2 font-normal">Created</th>
              <th className="text-left px-3 py-2 font-normal">UUID</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
                <td className="px-3 py-2">
                  <Link to={`/models/${modelUuid}/versions/${v.uuid}`} className="hover:underline">
                    {v.name ?? v.tag ?? v.version_id ?? '(unnamed)'}
                  </Link>
                </td>
                <td className="px-3 py-2 text-fg-dim text-xs">{v.created_at?.replace('T', ' ').slice(0, 19) ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{v.uuid.slice(0, 8)}…</td>
              </tr>
            ))}
            {versions.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No versions for this model.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilesView({ modelUuid, versionUuid }: { modelUuid: string; versionUuid: string }) {
  const [files, setFiles] = useState<ModelFile[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    setFiles([]); setErr(null)
    api.listVersionFiles(versionUuid).then((r) => setFiles(r.files)).catch((e) => setErr(String(e)))
  }, [versionUuid])
  return (
    <div className="space-y-4 max-w-4xl">
      <Link to={`/models/${modelUuid}`} className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> Versions
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Files</h1>
        <div className="text-[10px] font-mono text-fg-faint mt-1">version {versionUuid}</div>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Path</th>
              <th className="text-left px-3 py-2 font-normal">Format</th>
              <th className="text-right px-3 py-2 font-normal">Size (bytes)</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f, i) => (
              <tr key={f.uuid ?? `${i}-${f.name ?? f.path}`} className="border-b border-border/40">
                <td className="px-3 py-2 font-mono text-xs text-fg">{f.path ?? f.name ?? '(unnamed)'}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-fg-dim">{f.format ?? '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-fg-dim">{f.size?.toLocaleString() ?? '—'}</td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No files for this version.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
git add app/frontend/src/pages/Models.tsx
git commit -m "m3: /models browser (list + versions drill-down + files drill-down)"
```

---

## Task 9: Frontend — ScanDetail enrichment with violations + evaluations

Two reusable components + the ScanDetail update that fetches both endpoints and renders them under the verdict card.

**Files:**
- Create: `app/frontend/src/components/ScanResult/ViolationsList.tsx`
- Create: `app/frontend/src/components/ScanResult/EvaluationsTable.tsx`
- Modify: `app/frontend/src/pages/ScanDetail.tsx`

- [ ] **Step 1: ViolationsList**

Create `app/frontend/src/components/ScanResult/ViolationsList.tsx`:

```typescript
import type { Violation } from '@/lib/types'
import { ShieldAlert } from 'lucide-react'

const SEV: Record<string, string> = {
  HIGH: 'text-danger',
  MEDIUM: 'text-warn',
  LOW: 'text-fg-dim',
}

export function ViolationsList({ violations }: { violations: Violation[] }) {
  if (violations.length === 0) {
    return (
      <div className="bg-bg-raised border border-border rounded-lg p-4 text-xs text-fg-faint">
        No violations reported by the scanner.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {violations.map((v, i) => {
        const sev = (v.severity ?? '').toUpperCase()
        const sevColour = SEV[sev] ?? 'text-fg-dim'
        const steps = v.remediation?.steps ?? []
        return (
          <div key={i} className="bg-bg-raised border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${sevColour}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <div className="text-sm font-medium text-fg">{v.rule_name ?? 'Unknown rule'}</div>
                  {sev && <span className={`text-[10px] font-mono uppercase ${sevColour}`}>{sev}</span>}
                </div>
                {(v.threat || v.issue) && (
                  <div className="text-xs text-fg-dim mt-1">{v.threat ?? v.issue}</div>
                )}
                {(v.file || v.file_path) && (
                  <div className="text-[11px] font-mono text-fg-faint mt-1">{v.file ?? v.file_path}</div>
                )}
              </div>
            </div>
            {steps.length > 0 && (
              <div className="ml-7">
                <div className="text-[10px] uppercase tracking-wide text-fg-faint mb-1">Remediation</div>
                <ol className="text-xs text-fg-dim list-decimal list-inside space-y-0.5">
                  {steps.map((s, j) => <li key={j}>{s}</li>)}
                </ol>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: EvaluationsTable**

Create `app/frontend/src/components/ScanResult/EvaluationsTable.tsx`:

```typescript
import type { Evaluation } from '@/lib/types'

const OUTCOME: Record<string, string> = {
  PASSED: 'bg-success/15 text-success',
  FAILED: 'bg-danger/15 text-danger',
}

export function EvaluationsTable({ evaluations }: { evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return <div className="text-xs text-fg-faint p-4">No per-rule evaluations returned.</div>
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
        <tr className="border-b border-border">
          <th className="text-left px-3 py-2 font-normal">Rule</th>
          <th className="text-left px-3 py-2 font-normal">Outcome</th>
          <th className="text-left px-3 py-2 font-normal">Severity</th>
        </tr>
      </thead>
      <tbody>
        {evaluations.map((e, i) => {
          const out = (e.outcome ?? '').toUpperCase()
          const cls = OUTCOME[out] ?? 'bg-bg-subtle text-fg-dim'
          return (
            <tr key={i} className="border-b border-border/40">
              <td className="px-3 py-2 text-fg">{e.rule_name ?? 'Unknown'}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>{out || '—'}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-fg-dim">{e.severity ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Enrich ScanDetail**

Replace `app/frontend/src/pages/ScanDetail.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { EnvInfo, Evaluation, ScanDetail as ScanDetailT, Violation } from '@/lib/types'
import { api } from '@/lib/api'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'
import { RulesSummary } from '@/components/ScanResult/RulesSummary'
import { ModelFormatsChips } from '@/components/ScanResult/ModelFormatsChips'
import { FilesScannedStats } from '@/components/ScanResult/FilesScannedStats'
import { ScmDeepLink } from '@/components/ScanResult/ScmDeepLink'
import { ViolationsList } from '@/components/ScanResult/ViolationsList'
import { EvaluationsTable } from '@/components/ScanResult/EvaluationsTable'

export function ScanDetail() {
  const { scanUuid = '' } = useParams<{ scanUuid: string }>()
  const [scan, setScan] = useState<ScanDetailT | null>(null)
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [violations, setViolations] = useState<Violation[] | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setScan(null); setViolations(null); setEvaluations(null); setErr(null)
    Promise.all([
      api.getScan(scanUuid),
      api.env(),
      api.getScanViolations(scanUuid).then((r) => r.violations).catch(() => [] as Violation[]),
      api.getScanEvaluations(scanUuid).then((r) => r.evaluations).catch(() => [] as Evaluation[]),
    ])
      .then(([s, e, v, ev]) => { setScan(s); setEnv(e); setViolations(v); setEvaluations(ev) })
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

          {violations && violations.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Violations <span className="text-fg-faint text-xs ml-2">{violations.length}</span></div>
              <ViolationsList violations={violations} />
            </div>
          )}

          {evaluations && evaluations.length > 0 && (
            <details>
              <summary className="text-sm font-medium cursor-pointer">
                Per-rule evaluations <span className="text-fg-faint text-xs ml-2">{evaluations.length}</span>
              </summary>
              <div className="mt-2 bg-bg-raised border border-border rounded-lg overflow-hidden">
                <EvaluationsTable evaluations={evaluations} />
              </div>
            </details>
          )}

          <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-1">
            <Row k="Scan UUID" v={scan.uuid} mono />
            {scan.security_group_uuid && (
              <Row k="Security group"
                v={`${scan.security_group_name ?? ''} ${scan.security_group_uuid}`.trim()}
                link={`/groups/${scan.security_group_uuid}`} mono />
            )}
            {scan.source_type && <Row k="Source type" v={scan.source_type} />}
            {scan.enabled_rule_count_snapshot != null && <Row k="Enabled rule count (snapshot)" v={String(scan.enabled_rule_count_snapshot)} />}
            {scan.error_code && <Row k="Error code" v={scan.error_code} />}
            {scan.error_message && <Row k="Error message" v={scan.error_message} />}
          </div>

          <div className="flex items-center justify-between text-xs">
            <ScmDeepLink env={env} scanUuid={scan.uuid} />
            <Link to={`/compare?a=${encodeURIComponent(scan.uuid)}`} className="text-fg-dim hover:text-fg">
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

function Row({ k, v, mono = false, link }: { k: string; v: string; mono?: boolean; link?: string }) {
  const valueClass = mono ? 'font-mono text-xs text-fg text-right break-all' : 'text-fg text-right'
  return (
    <div className="flex justify-between gap-4 text-sm py-1 border-b border-border/40 last:border-0">
      <div className="text-fg-dim shrink-0">{k}</div>
      {link
        ? <Link to={link} className={`${valueClass} hover:underline`}>{v}</Link>
        : <div className={valueClass}>{v}</div>}
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
git add app/frontend/src/components/ScanResult/ViolationsList.tsx \
        app/frontend/src/components/ScanResult/EvaluationsTable.tsx \
        app/frontend/src/pages/ScanDetail.tsx
git commit -m "m3: ScanDetail enrichment — violations + evaluations rendered live"
```

---

## Task 10: Frontend — Dashboard polish (model count + rules link)

Add a 4th stat tile (model count) and a "What we check" card linking to /rules.

**Files:**
- Modify: `app/frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Implement**

Replace `app/frontend/src/pages/Dashboard.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EnvInfo, GroupsList, ScanSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { ScanLine, ExternalLink, ShieldCheck } from 'lucide-react'
import { ScansTable } from '@/components/ScansTable'

export function Dashboard() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [groups, setGroups] = useState<GroupsList | null>(null)
  const [scans, setScans] = useState<ScanSummary[] | null>(null)
  const [modelCount, setModelCount] = useState<number | null>(null)
  const [ruleCount, setRuleCount] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.env(),
      api.groups(),
      api.listScans(5),
      api.listModels(200).then((r) => r.models.length).catch(() => null),
      api.listRules().then((r) => r.security_rules.length).catch(() => null),
    ])
      .then(([e, g, s, m, ru]) => {
        setEnv(e); setGroups(g); setScans(s.scans); setModelCount(m); setRuleCount(ru)
      })
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

      <div className="grid grid-cols-4 gap-3">
        <Stat label="SDK version" value={env?.sdk_version ?? '…'} />
        <Stat label="Security groups" value={groups ? String(groups.security_groups.length) : '…'} to="/groups" />
        <Stat label="Models scanned" value={modelCount != null ? String(modelCount) : '…'} to="/models" />
        <Stat label="Rules enforced" value={ruleCount != null ? String(ruleCount) : '…'} to="/rules" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
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
        <div className="bg-bg-raised border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">What we check</div>
              <div className="text-xs text-fg-dim mt-0.5">Full rule catalogue + per-group instances</div>
            </div>
            <Link to="/rules" className="inline-flex items-center gap-2 border border-border text-fg text-sm font-medium px-3 py-1.5 rounded-md hover:bg-bg-subtle/60">
              <ShieldCheck className="w-4 h-4" /> Browse
            </Link>
          </div>
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
    </div>
  )
}

function Stat({ label, value, to }: { label: string; value: string; to?: string }) {
  const body = (
    <div className="bg-bg-raised border border-border rounded-lg p-4 h-full hover:bg-bg-subtle/40 transition-colors">
      <div className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="text-lg font-semibold mt-1 font-mono">{value}</div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}
```

(Drops the old "Security groups" list block at the bottom — the dedicated /groups page is the right home for it. The Stat tile labeled "Security groups" links there.)

- [ ] **Step 2: Build**

```bash
cd app/frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/frontend/src/pages/Dashboard.tsx
git commit -m "m3: Dashboard model + rules counts, dedicated groups page"
```

---

## Task 11: Smoke-test docs + final verification

**Files:**
- Modify: `app/README.md`

- [ ] **Step 1: Append M3 smoke test section**

Read `app/README.md` first. Append after the M2 smoke test section:

```markdown
### M3 smoke test additions

After `./restart.sh`:

1. **Sidebar** — Groups, Rules, Models entries appear with the right icons.
2. **Dashboard** — 4 stat tiles (SDK, Groups, Models, Rules) all populate with numbers; the Models and Rules tiles link through.
3. **/rules** — full catalogue lists every rule with severity pill; filter narrows results live.
4. **/groups** — table lists all source-type groups; click `Default HUGGING_FACE` and the rules table loads, with `enabled` / `blocking` pills per rule.
5. **/models** — table shows every catalogued model. Click one; versions appear. Click a version; files appear with size + format.
6. **/scans/<uuid>** for a BLOCKED scan (try `ykilcher/totally-harmless-model`) — under the verdict card, a Violations section appears with rule_name + severity + remediation steps; below it, "Per-rule evaluations" expands to a table of every rule with PASSED/FAILED outcomes. If the running scanner doesn't return that detail, both sections are silently omitted (graceful degradation).
7. **Security group link from scan detail** — the "Security group" row in the facts table is now a link to /groups/<uuid>.
```

- [ ] **Step 2: Full test suite green check**

```bash
source .venv/bin/activate
pytest app/backend/tests/ -v
cd app/frontend && npm test && cd -
```
Expected: ≥ 40 backend tests (28 from M2 + ≥ 12 from M3); ≥ 8 frontend tests still passing.

- [ ] **Step 3: Commit**

```bash
git add app/README.md
git commit -m "m3: README smoke test additions"
```

---

## Done — exit criteria

- Sidebar has 8 entries; every route is reachable and renders without error.
- `/groups/<uuid>` shows rules with enabled/blocking pills for a real tenant's `Default HUGGING_FACE`.
- `/rules` shows the full catalogue with severity colour-coding.
- `/models/<uuid>/versions/<vUuid>` shows the files of a real scanned model.
- `/scans/<uuid>` for `ykilcher/totally-harmless-model` shows violations + remediation steps rendered as a list, not raw JSON.
- All backend + frontend tests pass.

## Next milestone (planned separately)

- **M4 — Drawer completion + CI/CD generator:** REPL tab with per-session `code.InteractiveInterpreter` and `client` pre-imported, Code tab that subscribes to the SDKEvent stream and renders the equivalent Python via the existing `app/backend/codegen.py`, `/environment` upgrade with browseable `airs_schemas` Pydantic-schema trees, and a CI/CD YAML generator (pick GitHub Actions / GitLab CI / Jenkins → copy-paste workflow using the live security-group UUID).
