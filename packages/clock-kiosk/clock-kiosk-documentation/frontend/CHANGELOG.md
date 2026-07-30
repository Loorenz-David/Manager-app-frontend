# CHANGELOG — clock kiosk capability

Every modification to the kiosk (any zone in `INDEX.md`'s coverage) appends
one entry here **in the same session as the change**, newest first. This file
is what makes the documentation trustworthy over time — an undocumented
change is an incomplete change.

## Entry format

```
## YYYY-MM-DD — <one-line what> (<agent/author>)
- Change: <what changed, file-level>
- Why: <intent / finding / user request>
- Impact: <seams touched per IMPACT_MAP; "none beyond zone" if contained>
- Docs updated: <zone docs + IMPACT_MAP rows touched, or "stamps only">
- Validation: <commands run + results>
```

---

## 2026-07-30 — Session-id generation survives insecure contexts (Claude Fable)

- Change: `kiosk-flow.store.ts` `createSessionId()` — `crypto.randomUUID` →
  fallback chain (`getRandomValues` hex → time+random) with a comment stating
  uniqueness-not-cryptography intent.
- Why: F6 physical-device rehearsal (operator) crashed at `KioskProvider`
  mount over LAN http — `crypto.randomUUID` is secure-context-only; the
  kiosk white-screened behind the router error boundary right after sign-in.
- Impact: store spine only (IMPACT_MAP "kiosk-flow.store" row) — id shape is
  opaque to all consumers; no seam change.
- Docs updated: `04` (session-id mention), `07` (new hazard #5: LAN device
  testing = insecure context, incl. MSW fallback mode), this entry.
- Validation: `tsc -p packages/clock-kiosk` clean; `test:clock-kiosk` 54/54.

## 2026-07-30 — Capability v1 complete (Claude Fable, orchestrator)

- Change: the entire capability, built in phases 1→2→3→4→6→7 (5 shelved) with
  a Codex-implements / Opus-reviews / Fable-designs-and-orchestrates loop.
  Final state: `@beyo/worker-shifts` (domain), floor device auth
  (api-client/auth floor gates), `apps/floor-app` (thin shell, port 5175),
  `@beyo/clock-kiosk` (flow + components + adapters + summary), `rise`
  surface type in `@beyo/ui`, kiosk tokens in `@beyo/styles`,
  `@beyo/stats/insight-codes` subpath. Commits `bd939800` → `e8a35e19`.
- Why: user capability request 2026-07-29; full decision record in the
  archived master plan (`docs/architecture/archives/implementation/
  PLAN_clock_kiosk_master_20260729.md`) and its Review log.
- Impact: everything — this entry is the baseline these docs describe.
- Docs updated: entire documentation set created (INDEX, 00–07, IMPACT_MAP,
  this file), stamped at commit `e8a35e19`.
- Validation: Opus final review verdict **complete-with-notes, master
  criteria 1–9 all PASS** (2026-07-30); matrix at stamp: typecheck 0 ·
  worker-shifts 40 · clock-kiosk 54 · floor 9 · ui 162 · auth 3 ·
  api-client 3 · Playwright 9×3 projects, cold server.
- **Open item**: F6 — physical-device always-on rehearsal (operator task;
  script in `packages/clock-kiosk/README.md`). Record its result as the next
  entry when run.
