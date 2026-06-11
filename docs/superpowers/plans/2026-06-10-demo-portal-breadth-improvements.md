# Demo Portal Breadth & Q&A Improvements

**Date:** 2026-06-10
**Goal:** Make the portal cover *all* Prisma AIRS Model Security use cases, answer *any*
customer question, and give *exact* enablement steps per environment.

## Context

The portal (`app/`) is already mature: onboarding wizard, printable setup guide, scan
flow, scans/compare, groups/rules/models browsers, CI/CD generator, SDK/CLI snippets,
environment/schema browser, REPL, codegen drawer. Tests green (61 backend, 14 frontend).
Gaps are about *breadth* (sources beyond HuggingFace) and *Q&A depth* (FAQ, threats,
policy, positioning), plus doc-front-door drift.

All new reference pages are static content built from existing UI primitives
(`Card`, `Callout`, `CodeBlock`, `Badge`, `SectionHeader`/`Eyebrow`, `Stepper`). No new
backend endpoints required except where noted.

## Workstreams

### A. Multi-source coverage (S3 / GCS / Azure / Local)
- `app/frontend/src/lib/sources.ts` — canonical per-source metadata: label, URI scheme,
  example URI, format hints, how the scanner authenticates/reaches the source, enablement
  steps. Single source of truth for Scan page + Sources page + snippets.
- `Scan.tsx` — per-source example URIs/quick-picks + URI hint + validation; replace the
  HF-only quick picks block with source-aware guidance.
- `integrationSnippets.ts` — add per-source scan snippets (s3://, gs://, azure, local path).
- New page `Sources.tsx` (`/sources`) — one card per source: URI format, sample, exact
  enablement steps (S3 bucket/cross-account access, GCS SA, Azure SAS/identity, local).
- `examples/` — add `scan_s3_model.py`, `scan_local_model.py`, `batch_scan.py`,
  `ci_gate.py` (CLI-style gate). Keep HF example as canonical.

### B. FAQ / customer Q&A
- New page `Faq.tsx` (`/faq`) — searchable accordion grouped by theme: Data handling &
  privacy (where model is downloaded, retention, residency), Licensing/cost, Limits &
  performance (scan time, rate limits, size), Network (egress endpoints, proxy, air-gap),
  Verdicts (ALLOWED/BLOCKED/WARNING, false positives), Formats matrix, Positioning vs
  open-source (modelscan/picklescan) and HF scanning.
- `faqData.ts` — content array so it's easy to extend.

### C. Threat catalog + sample-model gallery
- New page `Threats.tsx` (`/threats`) — threat categories with PAIT codes, attack
  scenario, affected formats, remediation. Cross-link to Rules.
- `sampleModels.ts` + a gallery section (on Threats or Scan) — curated known-good/known-bad
  models per format with expected verdict and one-click "scan this".

### D. Policy & rule customization
- New page `Policy.tsx` (`/policy`) — how security groups + rules map to policy; changing
  severity (WARNING↔BLOCKING), allowlisting publishers, creating custom groups; exact SCM
  navigation; note SDK read vs SCM-managed write.

### E. Resources hub
- New page `Resources.tsx` (`/resources`) — link the two decks + the PDF + notebooks +
  external docs. Serve the decks/pdf statically via backend so they open in-app.
- Commit the two untracked decks.

### F. Docs cleanup
- README "Repository Structure" — add `app/` portal, `docs/`, decks; add a "Demo portal"
  section pointing at `./app/run-app.sh`.
- De-dupe/cross-link OVERVIEW/QUICK-START/INSTALLATION-GUIDE/SDK-TLDR (light: add pointers,
  fix the hardcoded SDK `0.1.1` references to say "see Environment page / pip show").

### G. Quick technical wins
- `main.py` — migrate `@app.on_event("startup")` → lifespan; remove dead scaffold comments.
- Sidebar/App routes — wire new pages into nav under sensible headings.

## Sequencing
1. F-README + G (fast, low-risk) → 2. A sources → 3. C threats+gallery → 4. B FAQ →
5. D policy → 6. E resources. Run `pytest` and `npm test`/`tsc` after each FE/BE change.

## Acceptance
- Scan page gives real guidance for all 5 sources.
- `/faq`, `/threats`, `/sources`, `/policy`, `/resources` exist, in nav, build clean.
- README front door reflects the portal.
- Backend + frontend tests still green; `tsc` clean.
