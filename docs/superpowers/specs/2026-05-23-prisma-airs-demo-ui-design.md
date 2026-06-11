# Prisma AIRS Model Security — Demo UI

**Status:** Approved (design phase)
**Date:** 2026-05-23
**Owner:** Sergei SUDO

## Purpose

A local web app for running, exploring, and explaining Prisma AIRS Model Security to customers. Three audiences served by one tool:

1. **Demo** — polished UI to screen-share with a prospect.
2. **Setup** — sit next to a customer, configure groups/rules, run a live scan, show results in detail.
3. **Learning** — for the owner: see every SDK method, schema, request, and response so they become a domain expert.

Built on the existing repo, reusing its `.venv` and `.env`. Does not replace the existing `examples/` scripts or notebooks; lives alongside them.

## Non-goals

- Not a production product. Localhost-only, single user, no auth on the app itself (inherits the SDK's OAuth via `.env`).
- Not multi-tenant. One tenant per `.env` file.
- v1 is read-mostly: it can run scans, but it does not edit security groups or rule instances (no `create_security_group`, no `update_rule_instance` from the UI). Those are v2.
- Not a replacement for Strata Cloud Manager — detailed per-file findings live in SCM. The UI surfaces what the SDK returns and deep-links into SCM for the rest.

## Architecture

Single FastAPI process on `localhost:8765` that serves a built React frontend from `/` and JSON/WebSocket APIs from `/api/*`.

- **Backend:** FastAPI on the existing Python 3.12 `.venv`. One process. One shared `ModelSecurityAPIClient` instance, wrapped by a thin `SDKProxy` (see Command Echo).
- **Frontend:** React + Vite + TypeScript, Tailwind + shadcn/ui for the Linear/Vercel aesthetic. Inter for body, JetBrains Mono for code/data.
- **Live updates:** WebSocket from backend → frontend for (a) the persistent drawer's call log, (b) REPL output, (c) scan job progress. REST for everything else.
- **Launch:** `./run-app.sh` activates `.venv`, loads `.env`, runs `uvicorn`, opens the browser.

### Why React + Vite (not HTMX)

The REPL, the persistent drawer with streaming events, and the per-screen "equivalent Python" view all benefit from real component state and a single long-lived WS connection. HTMX would work for the static read pages but force awkward workarounds for the live bits. Accepting the Node build step is the cleaner trade.

## Screens

Left sidebar nav, main content area, persistent bottom drawer.

| Route | What |
|---|---|
| `/` | Dashboard: tenant chip (TSG ID, base URL), SDK + airs-schemas versions, counts (groups/rules/models/scans), "Run a scan" CTA, last 5 scans. |
| `/scan` | Single-page wizard: source type → group (filtered) → model URI (HF org/author validated) → submit → live progress → result + deep link to SCM. |
| `/scans` | Table of `list_scans()` with filters (source type, verdict, date). Row click → `/scans/:id`. |
| `/scans/:id` | Verdict, severity counts, evaluations, violations + remediation, files scanned, raw JSON tab, "Open in SCM" deep link. |
| `/groups` | Security groups list → drawer with rules + rule instances, showing enabled/disabled + blocking/non-blocking. Read-only in v1. |
| `/models` | `list_models` → click → versions → click → files (`list_model_version_files`). |
| `/environment` | The "show me everything" page: SDK version, `airs-schemas` version, PyPI URL (`get_pypi_url`), base URL, TSG ID, full method list of `ModelSecurityAPIClient` with signatures, browseable Pydantic schemas from `airs_schemas` as collapsible JSON-schema trees. |

## Persistent bottom drawer

Always present, collapsible. Three tabs:

- **Log** — live stream of every `SDKEvent` (method, args, status, duration, response preview, expandable raw JSON).
- **REPL** — Python input with `client` pre-imported and history; calls made here also appear in Log.
- **Code** — the current screen's equivalent Python script, regenerated whenever the screen's data dependencies change. Replaces the original "full-page mode toggle" idea — both views coexist instead of swapping.

### HuggingFace URI guard

The wizard validates that HF URIs include an org/author segment (`huggingface.co/<org>/<model>`) before submitting. `huggingface.co/gpt2` fails SDK validation; `huggingface.co/openai-community/gpt2` works. Per CLAUDE.md, this bites users often.

## Command echo (the SDKProxy chokepoint)

Every SDK call routes through a single wrapper:

```python
# app/backend/sdk_proxy.py
class SDKEvent(BaseModel):
    id: str
    method: str
    kwargs: dict[str, Any]   # JSON-safe
    status: Literal["pending", "ok", "error"]
    started_at: float
    duration_ms: float | None
    response_summary: str | None    # short repr
    response_full: dict | None      # raw JSON for drawer expansion
    error: str | None

class SDKProxy:
    def __init__(self, client: ModelSecurityAPIClient, hub: WSHub): ...
    def call(self, method: str, **kwargs) -> Any:
        # 1. emit SDKEvent(status="pending") to hub
        # 2. invoke getattr(client, method)(**kwargs)
        # 3. capture response/duration/error
        # 4. emit SDKEvent(status="ok"|"error") to hub
        # 5. return response to caller
```

Every FastAPI route calls `sdk.call("list_security_groups")` rather than `client.list_security_groups()`. Consequences:

- **Drawer Log** gets every event via WS — no per-route instrumentation.
- **Drawer Code** subscribes to events for the current screen and renders them as `client.{method}({k}={v!r}, ...)`. Each screen also has a static "intro" comment explaining the overall flow.
- **REPL** uses the same proxied `client`, so REPL calls also show in Log.

`SDKEvent.response_full` is captured by serialising the Pydantic response with `model_dump(mode="json")`.

## REPL

- Per-browser-session `code.InteractiveInterpreter` (two tabs don't share state). Session ID is generated client-side on first load, stored in `localStorage`, and sent as a query param on the REPL WS connect.
- Pre-imported: `client` (the proxied instance), `UUID`, `json`, `pprint`.
- Multi-line: Shift+Enter for newline, Enter to submit. Arrow-up history. Ctrl+L to clear.
- "Snippets" dropdown next to input with the example flows from `examples/list_security_groups.py` and `examples/scan_huggingface_model.py`.
- Localhost-only — no sandboxing. This is acceptable because:
  - the app already holds full SDK credentials,
  - the app is bound to `127.0.0.1`,
  - the README explicitly warns not to bind to a non-loopback interface.

## Scan execution

`client.scan()` is synchronous. The `/api/scans` POST handler queues the call into a `BackgroundTasks` job and returns `{ scan_job_id }`. Frontend polls `/api/scan-jobs/:id` and watches the WS log; when status is `done` or `error`, it auto-navigates to `/scans/:scan_id` (or shows the error inline).

The summary returned by the SDK is often thin (verdict only, with empty `violations` and no `aggregate_eval_summary` for some scans). The detail screen renders whatever's present, plus a prominent "Open in Strata Cloud Manager → Insights → Prisma AIRS → Model Security → Scans" link with the scan ID.

## Project layout

Everything new under `app/`. Existing files (`examples/`, `notebooks/`, `setup-sdk.sh`, etc.) untouched.

```
app/
├── backend/
│   ├── main.py              # FastAPI app, mounts static frontend, registers routes
│   ├── sdk_proxy.py         # SDKProxy + SDKEvent
│   ├── ws_hub.py            # WebSocket broadcaster (log/repl/scan-progress channels)
│   ├── codegen.py           # SDKEvent → Python snippet renderer
│   ├── routes/
│   │   ├── env.py           # /api/env (SDK info, schemas)
│   │   ├── groups.py        # /api/groups, /api/groups/:id, /api/rules
│   │   ├── models.py        # /api/models, versions, files
│   │   ├── scans.py         # /api/scans, /api/scans/:id, /api/scan-jobs
│   │   └── repl.py          # WS /api/repl + history
│   └── tests/               # pytest, SDK mocked at the client boundary
├── frontend/
│   ├── package.json         # React 18 + Vite + TS + Tailwind + shadcn/ui
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx, routes/, pages/, components/
│   │   ├── lib/api.ts       # typed REST client
│   │   ├── lib/ws.ts        # WebSocket connection + event bus
│   │   └── components/Drawer/  # Log, REPL, Code tabs
│   └── dist/                # built static assets, served by FastAPI
├── run-app.sh               # ./run-app.sh
└── README.md
```

## Build & install changes

- `requirements.txt` gains `fastapi`, `uvicorn[standard]`, `websockets`.
- `setup-sdk.sh` unchanged.
- `app/frontend/` has its own `package.json`. First run of `run-app.sh` does `npm install && npm run build` if `dist/` is missing.
- `.gitignore` gains `app/frontend/node_modules/`, `app/frontend/dist/`, `.superpowers/`.
- Node 20+ required for the frontend build (called out in `app/README.md`).

## Testing strategy

- **Backend:** pytest. `ModelSecurityAPIClient` is mocked at the client boundary (not at the HTTP layer) so tests don't hit the real API. SDKProxy tests verify event emission and error capture. Route tests verify shape of responses.
- **Frontend:** Vitest for `lib/` helpers (api client, ws event bus, codegen rendering for the Code tab if any client-side rendering remains). Component tests only for the drawer and the scan wizard's URI validator.
- **Manual smoke test:** documented checklist in `app/README.md` — run app, hit each route, run a scan against `microsoft/DialoGPT-medium`, verify drawer streams events, verify REPL executes `client.list_security_groups()`.

## Out of scope (v2 candidates)

- Editing security groups / rule instances from the UI.
- Multi-tenant `.env` switching.
- Scan diffing (compare two scans of the same model).
- Bulk scan submission.
- Export to PDF / customer-ready report.

## Open risks

- **SDK response variability:** the BLOCKED-with-no-violations behaviour we saw on baseline scans means the detail screen must render whatever fields are present (verdict, summary, violations, evaluations) and silently skip the ones that aren't. The raw-JSON tab is the always-correct fallback.
- **Frontend build complexity:** first-run `npm install` is slow and needs network. Acceptable for a developer tool; documented in `app/README.md`.
- **SDK version drift:** SDK install is dynamic via `get-pypi-url.sh` and not pinned in `requirements.txt`. The Dashboard and Environment page both display the installed version so version mismatches are visible.
- **Scan ID surfacing:** the design assumes `client.scan()` returns a result with a usable `scan_id` (the README and SCM deep link guidance imply one exists). If the returned object exposes the id under a different attribute, the route handler resolves it via best-effort attribute lookup; the raw JSON is always shown as fallback. Verify during implementation.
