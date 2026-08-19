---
plan: PLAN_production_time_widget_20260818
role: reviewer
round: 1
date: 2026-08-19
---

# Reviewer prompt — Production time widget, first review

Copy everything below the line into the reviewer session.

---

You are reviewing the **Production time widget** in the ManagerBeyo frontend monorepo
(`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`).
You did not write this code and must not assume it is correct — or wrong.

## Doctrine

Follow `/Users/davidloorenz/agent-skills/plan-reviewer.md` and, first,
`/Users/davidloorenz/agent-skills/pipeline-charter.md`. This is a **first review of a phase**:
full checklist against every acceptance criterion, the semantic authorities, the contracts, plus
the judgment-call probes below. You produce findings and a verdict. You never fix.

## Read first

1. `docs/architecture/under_construction/implementation/production_time/plans/PLAN_production_time_widget_20260818.md`
   — the phase row: goal, Track A/B split, acceptance criteria (13), Review log.
2. `docs/architecture/under_construction/implementation/production_time/handoffs/implementer/handoff_PLAN_production_time_widget_20260818_implement_1.md`
   — the implementer's report and declared write perimeter.
3. `docs/architecture/under_construction/implementation/production_time/prompts/implementer/PROMPT_codex_track_b_20260818.md`
   and `PROMPT_codex_socket_compose_20260818.md` — what was actually asked for.
4. `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_production_time_and_worker_cards_20260818.md`
   — the response contract. `HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` carries
   the twelve-value status vocabulary.
5. Contracts (repo root, not under `docs/`): `architecture/` — `02_types.md`, `24_dto.md`, `21_realtime.md`,
   `35_shared_packages.md`. `task_system/frontend_contract_goal_mapping_guide.md` is the
   alignment authority named by the plan.

## The code

- `packages/item-economics/` — the whole package (Track A visual + seam types, Track B logic).
- `packages/realtime/src/lib/socket-compose.ts` + its test — introduced by this phase.
- The three app socket registries: `apps/{managers-app,selleres-app,workers-app}/*/src/app/socket-registry.ts`.
- Mount sites: `packages/tasks/src/pages/TaskDetailSlidePage.tsx` and
  `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`.
- `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/features/task_steps/production-time.spec.ts`.

## Baseline and perimeter

Everything landed in **one commit**: `CHECKPOINT (not approved): item-economics package,
production time widget, item pricing fields` on branch `pipeline/item-economics-phase-1`. There is
no earlier baseline — this work was untracked until 2026-08-19, so no per-round diff exists.

Reconstruct the perimeter by comparing the handoff's **declared write perimeter** against
`git show --stat HEAD`. Note that the commit also contains two other workstreams (the money-key
migration and the item pricing fields); attribute carefully rather than treating every changed
file as this phase's. Undeclared writes attributable to this phase are a finding.

## Judgment-call probes

These come from reconciling the handoff against the plan. Each is a probe, not a trusted claim.

1. **No live backend response has ever been observed.** The Playwright spec intercepts the
   endpoint with `page.route`, so it proves wiring, ordering, snapshot-label fallback and
   placement — not the response contract. Read the backend handoff's payload shape against
   `ProductionTimeResponseSchema` field by field and report any divergence, including optional
   vs nullable. A `.nullable()` field the backend omits blanks the surface and retries forever;
   that exact class of bug took down the task list on 2026-08-18.
2. **`composeSocketHandlers` correctness under composition.** It was introduced because all three
   registries were silently dropping a `task:step-state-changed` handler to object-spread
   collision. Verify structurally, not behaviorally: can a same-key handler still be dropped?
   What happens with a non-function value, a key present in one map only, or three maps claiming
   one event? Mutation-test its test — introduce the drop and confirm the test bites.
3. **`21_realtime.md` documents only object-spread registries** and does not define shared-key
   composition. The implementer recorded this contract gap rather than amending the contract, per
   owner direction. Assess whether the gap should now be folded into `21_realtime.md`, and route
   it as a recommendation.
4. **Filename divergence.** The plan's step 9 names `compose-socket-handlers.ts`; the shipped file
   is `socket-compose.ts` (owner's later explicit instruction, matching `socket-*` siblings).
   Confirm the plan text is the stale side, not the code.
5. **`ApiRequestError`, not `ApiError`.** The plan originally named a class that does not exist.
   Verify the 404 → hide rule and the retry policy actually key off
   `error instanceof ApiRequestError && error.status === 404`, and that a 404 hides the card
   rather than showing an error frame.
6. **Known lint failure.** `packages/item-economics/src/hooks/use-production-time-clock.ts` fails
   `react-hooks/set-state-in-effect`, inherited from `packages/stats/src/hooks/use-current-minute.ts`,
   which the plan told the implementer to model on. Both fail. Judge severity and whether the
   `useSyncExternalStore` form used by `@beyo/lib`'s `useTickingElapsed` is the correct correction.
7. **Truncation and the row set.** `selectVisibleRows` and `PRODUCTION_TIME_COLLAPSED_ROW_COUNT = 4`
   decide what a user sees. Enumerate the case table — exactly 4 rows, 5 rows, 0 rows, one row
   with a null allowance — rather than the rows the test file happens to have.
8. **Non-`ok` status rendering.** Criterion 7 says the frame still renders for any of the twelve
   statuses other than `ok` / `infeasible`, with the worked total summed from sections. Walk every
   status value, not a sample.

## Verification you must run yourself

Do not trust the handoff's numbers. Re-run and report actual counts:

- `npm run typecheck`
- `npm run test:item-economics`
- `npm run test:realtime`
- ESLint on the phase's files.

The Playwright suite requires a running app on port 5174; **do not start dev servers** — the owner
starts them and keeps control. If you need a browser run, say so and stop.

## Output

Two layers, per the reviewer doctrine's dual-audience rule.

**Layer 1 — technical review.** Findings by id, each with severity
(`blocking` / `should-fix` / `note`), what is wrong, the violated authority (file + section), and
a suggested correction. Also report, specifically, what you verified **correct** — settled ground
is what makes the next round cheap. Verdict: `APPROVED` or `CHANGES_REQUESTED`.

**Layer 2 — the human briefing.** Open with a 2–4 sentence plain-language state of the build. Then
for every blocking and should-fix finding, a 3–6 sentence story from the owner's perspective in
the product's own domain — a manager opening a task, a worker mid-section — shaped as cause →
what you would actually observe → why it matters. Strictly faithful to the verified scenario; no
inflation.

## Close

Deposit your report as
`docs/architecture/under_construction/implementation/production_time/handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_1.md`
with frontmatter `plan`, `role: review`, `round: 1`, `verdict`, `date`, `actor`, and a section
declaring your **full write perimeter** — documents, code, and any tool-recorded state. If you ran
mutation probes, list every file you touched and reverted.

Any owner decision you need goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision
cards: **Question** (one line, answerable yes/no or by naming an option), **Story** (2–4 sentences
of lived scenario, no artifact citations), **Branches** (each answer with its lived consequence).
