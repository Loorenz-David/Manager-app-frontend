---
plan: PLAN_production_time_widget_20260818
role: implementer
round: 1
date: 2026-08-18
---

# Codex prompt — Production time widget, Track B (logic)

Copy everything below the line into Codex.

---

You are implementing **Track B (the logic layer)** of the Production time widget in the ManagerBeyo frontend monorepo.

**Repo root:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`

## Read first, in this order

1. `docs/architecture/under_construction/implementation/production_time/PLAN_production_time_widget_20260818.md` — your specification. §Track B lists your twelve steps in build order. Follow it literally.
2. `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_production_time_and_worker_cards_20260818.md` — the backend contract. Ignore every part about the **worker task-step cards** (`budget-allocations`, `typical-times`); that is a separate component, not in scope.
3. `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` §6 — the twelve-value `status` vocabulary.
4. `task_system/frontend_contract_goal_mapping_guide.md` — then read the contracts the plan lists under §Contracts and skills. **Read contracts to learn how to write; read implementation files only to learn what already exists.**
5. `packages/item-economics/src/lib/production-time-view-model.ts` — the seam you are building against.

## What already exists — do not rebuild or modify

Track A (the visual layer) is **built, tested and approved**: 46 tests passing, typecheck clean. Everything marked `[A]` in the plan's §File map is finished. That is all of `packages/item-economics/src/components/production-time/` except `ProductionTimeSection.tsx`, plus `src/lib/production-time-view-model.ts` and its test.

Your job is to produce a `ProductionTimeViewModel` from the endpoint and hand it to `<ProductionTimeCard>`. **Do not edit any `[A]` file, including its class names and layout.** If you believe the seam is wrong, stop and report it rather than changing it.

## What you are building

The twelve steps in the plan's §Track B: Zod DTOs in `types.ts` → query key → `fetch-task-production-time.ts` → `use-task-production-time-query.ts` → `use-production-time-clock.ts` → `production-time-dto.ts` (the transform) → `use-production-time.controller.ts` → `ProductionTimeSection.tsx` → `socket-events.ts` → `index.ts` exports → mounting in both task-detail pages → app wiring for all three apps.

The endpoint is `GET /api/v1/item-economics/tasks/{task_client_id}/production-time`.

## Traps — each of these is a real bug, not a style note

1. **Never sort, filter or re-order `sections`.** It arrives in workshop pipeline order. Map it 1:1.
2. **Never derive `share_state`.** It is the server's on-track verdict; copy it through. Do not compare worked time to the allowance to decide a verdict anywhere.
3. **Never aggregate a section's `state` from its steps.** `step_count > 1` is a reassignment, but the backend guarantees two steps of one section never run at once and already sends the later, active state. Read the field as given.
4. **Guard every division by `allowance_seconds`.** It is nullable and can legitimately be zero or negative. `buildRowDetail` already handles this — pass it the raw value.
5. **Anchor the live tick to `state_entered_at`, never to fetch time.** Anchoring to fetch time makes the timer reset on every reload. Unparseable or missing → no tick for that row, never `NaN`.
6. **When `status` is not `ok`/`infeasible`, sum the worked total from `sections[].worked_seconds`.** `budget.actual_worker_seconds` is `null` in that branch. Rows must still render, with typicals and worked time, and no bars. Never hide the component, never show `0m of 0m`.
7. **Decimals arrive as strings** (`"160.00"`). Keep them as strings in the Zod schema; do not coerce to `number` at the schema boundary. Seconds fields are integers.
8. **`@beyo/item-economics` must never import `@beyo/tasks`.** `@beyo/tasks` will depend on this package; importing back creates a cycle. Everything you need (tone map, state labels) is already local in `production-time-view-model.ts`.
9. **`task:step-state-changed` carries the STEP id, not the task id** (`packages/realtime/src/lib/socket-types.ts:88`). There is nothing to key off, so invalidate `itemEconomicsKeys.tasks()` broadly. Do not invent a task lookup.
10. **`item_economics:evaluation-committed` does not exist yet** in `packages/realtime/src/lib/socket-types.ts`. Declare it there first: payload `{ client_id, evaluation_id }` where `client_id` is the **task** id. That one can invalidate precisely.
11. **`ProductionTimeSection` has no `unavailable` branch and no empty-list branch.** `ProductionTimeCard` already switches on all three `kind` values and returns `null` for a pipeline with no sections. Pass the view model straight through.
12. **The `@source` line in each app's `index.css` fails silently if omitted** — you get an unstyled widget with no error. All three apps need it: managers, workers **and sellers**. The packaged `TaskDetailSlidePage` is registered by all three.
13. **Do not add a loader function.** This is inline content inside an existing slide, not a registered surface, so `35_shared_packages.md §14` does not apply. Export `ProductionTimeSection` statically from `index.ts`.
14. **v1 is read-only.** Always set the view model's `cta` to `null`. No commit action, no role gating, no valuation link.

## Environment notes

- Run all `npm` commands from `frontend/`, never from inside a package.
- After `npm install`, if vite/vitest reports "Cannot find native binding", the `rolldown` and `lightningcss` darwin-arm64 packages have dropped out of the lockfile again — reinstall those two together.
- **Do not start dev servers.** If you need the app running, ask; the owner starts them.

## The endpoint is not deployed yet

Build against MSW handlers derived from the handoff's literal example payload, including a non-`ok` status case, a reassignment (`step_count: 2`), a section with `allowance_seconds <= 0`, and a deleted section (`section_name: null`, `order_list: null`, null typical).

**Do not report the work complete on the basis that it typechecks.** State plainly that a live response has not been rendered yet, and list what remains unverified.

## Definition of done

```bash
npx tsc -p packages/item-economics/tsconfig.json --noEmit   # zero errors
npm run typecheck                                            # zero errors, all apps
npm run test:item-economics                                  # all pass, 46 existing tests still green
cd apps/workers-app/ManagerBeyo-app-workers && npm run test:e2e:mobile && npm run test:e2e:desktop
```

Plus every numbered item in the plan's §Acceptance criteria, in particular 3 (payload order), 4 (one row for a reassigned section), 5 (no client-side verdict), 6 (no division by a non-positive allowance), 7 (degraded state renders), 8–9 (one clock, anchored to `state_entered_at`), and 11 (socket invalidation).

## When you are blocked

If the plan is silent, ambiguous, or contradicted by the code, **stop and ask**. Do not guess and do not widen the scope. Add a note to the plan's §Review log describing what you found.

Report at the end: what you built, what you verified and how, what you could not verify, and anything in the plan that turned out to be wrong.
