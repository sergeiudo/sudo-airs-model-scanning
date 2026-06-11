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

> Tip: `./restart.sh` (from the repo root) kills whatever's bound to port 8765 and then execs `app/run-app.sh`. Saves a step when iterating on backend changes.

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

### M2 smoke test additions

After `./run-app.sh` opens the app:

1. **Dashboard** — verify the tenant chip in the top-right shows your TSG and base URL, and "Recent scans" lists your last 5 scans (or shows the empty state).
2. **Run a scan** — pick `microsoft/DialoGPT-medium` from quick picks, scan, watch the Log drawer flip from `pending` to `ok`, then verify the page auto-navigates to `/scans/<uuid>` and the verdict card is green.
3. **Run a poisoned scan** — pick `ykilcher/totally-harmless-model`, scan, verify the verdict card is red and the rules bar shows the failed count in red.
4. **Scan detail** — confirm `Open in Strata Cloud Manager` is a clickable link that opens a new tab pointing at your scan UUID. If the URL 404s in SCM, the path needs adjustment in `app/backend/routes/scm.py` (single source of truth — change it there and rerun `./restart.sh`).
5. **Scans list (`/scans`)** — change the verdict filter to `BLOCKED`, then back to `ALL`. Type into the model-URI filter; the table narrows immediately.
6. **Advanced options** — on `/scan`, open the accordion, set `allow_patterns` to `*.bin, *.json`, kick off a scan, then expand the Log drawer entry for `scan` — `kwargs` should include those patterns verbatim.
7. **Compare** — go to `/compare`, pick the safe and poisoned scans, verify the side-by-side view renders both verdict cards and shows the "verdicts differ" hint.

### M3 smoke test additions

After `./restart.sh`:

1. **Sidebar** — Groups, Rules, Models entries appear with the right icons.
2. **Dashboard** — 4 stat tiles (SDK, Groups, Models, Rules) all populate with numbers; the Models and Rules tiles link through.
3. **/rules** — full catalogue lists every rule with severity pill; filter narrows results live.
4. **/groups** — table lists all source-type groups; click `Default HUGGING_FACE` and the rules table loads, with `enabled` / `blocking` pills per rule.
5. **/models** — table shows every catalogued model. Click one; versions appear. Click a version; files appear with size + format.
6. **/scans/<uuid>** for a BLOCKED scan (try `ykilcher/totally-harmless-model`) — under the verdict card, a Violations section appears with rule_name + severity + remediation steps; below it, "Per-rule evaluations" expands to a table of every rule with PASSED/FAILED outcomes. If the running scanner doesn't return that detail, both sections are silently omitted (graceful degradation).
7. **Security group link from scan detail** — the "Security group" row in the facts table is now a link to /groups/<uuid>.

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

### M5 smoke test additions (breadth & Q&A)

After `./restart.sh`:

1. **Sidebar** — new entries appear: `Threats`, `Sources` (Explore), `Policy` (Integrate),
   and a `Learn` group with `FAQ` + `Resources`.
2. **/scan** — switch Source type to `S3`/`GCS`/`AZURE`/`LOCAL`; the URI hint, scheme line, and
   placeholder update per source, and "Use example URI" fills a valid sample.
3. **/sources** — five cards with URI format, example, access model, and enablement steps; each has
   a per-source SDK snippet.
4. **/threats** — threat cards sorted by severity with format chips + remediation; the demo gallery
   links one-click to `/scan?uri=…` with expected verdict pills.
5. **/faq** — type in the search box; questions/answers filter live across themes.
6. **/policy** — SCM navigation for severity/blocking changes, allowlists, and custom groups.
7. **/resources** — deck + PDF cards open via `/api/assets/*`; external links work.

## Security note

This app is bound to `127.0.0.1` and holds full SDK credentials. Do not expose it on a non-loopback interface.
