# PLAN_ordering_count_invalidation_20260617

## Metadata

- Plan ID: `PLAN_ordering_count_invalidation_20260617`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-17T00:00:00Z`
- Last updated at (UTC): `2026-06-17T13:21:00Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Ensure both home-page button counts refresh correctly after upholstery order mutations (create and receive).
- Business/user intent: After a manager creates an upholstery order, navigating back to the home page must reflect the updated `needs_ordering_count` on the "Ordering" button immediately. Similarly, receiving an order must refresh counts so both home buttons show accurate numbers without a manual pull-to-refresh.
- Non-goals: Changing query fetching strategy, adding polling, or modifying `staleTime` on any query.

## Scope

- In scope:
  - **`useCreateUpholsteryOrder`** (`features/upholstery-ordering/actions/use-create-upholstery-order.ts`, managers app) — add `pendingSeatUpholsteryKeys.counts()` to `onSettled` invalidations. Creating an order transitions item_upholstery requirement states from `needs_ordering` → `ordered`; this could affect the pending seat count if the backend rolls those states into its counts.
  - **`useReceiveUpholsteryOrder`** (`features/upholstery-ordering/actions/use-receive-upholstery-order.ts`, managers app) — add `pendingSeatUpholsteryKeys.counts()` to `onSettled` invalidations. Receiving an order transitions states from `ordered` → `available`, completing the cycle and potentially affecting the "Select upholstery" count.
  - Both mutations already invalidate `upholsteryOrderingKeys.all` which covers `needsCount()` via TanStack Query prefix matching — no change needed for the ordering count path.
- Out of scope:
  - Changes to query configuration (`staleTime`, `refetchOnWindowFocus`, `gcTime`).
  - Changes to the home-page components or the queries themselves.
  - Any backend changes.
- Assumptions:
  - TanStack Query v5 prefix invalidation is working correctly: `queryKey: upholsteryOrderingKeys.all` (= `["upholstery-ordering"]`) already invalidates `upholsteryOrderingKeys.needsCount()` (= `["upholstery-ordering", "needs", "count"]`). This is confirmed by code inspection — no explicit `exact: true` is used.
  - `pendingSeatUpholsteryKeys.counts()` = `["pending-seat-upholstery", "counts"]`. Adding this invalidation is safe and idempotent even if the backend counts are currently unaffected by ordering state changes.

## Clarifications required

*(none — scope and key structure confirmed from code inspection)*

## Acceptance criteria

1. After creating an upholstery order and navigating back to home, the "Ordering" button count reflects the updated `needs_ordering_count` without a manual refresh.
2. After receiving an upholstery order and navigating back to home, both home button counts are fresh.
3. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/16_feature_workflow.md` — confirms the cache update belongs in the action-hook layer.
- `architecture/05_server_state.md` — confirms query-key and invalidation expectations for related server-state refresh.
- `architecture/08_hooks.md` — confirms the mutation lifecycle shape and the correct `onSettled` invalidation placement.
- `task_system/frontend_contract_goal_mapping_guide.md` — confirms the scoped read discipline for contract vs. implementation files.

### Local extensions loaded

- None.

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate

Permitted relational reads:
- `features/upholstery-ordering/actions/use-create-upholstery-order.ts` — the file being changed
- `features/upholstery-ordering/actions/use-receive-upholstery-order.ts` — the file being changed
- `features/pending-upholstery/api/pending-seat-keys.ts` — to confirm the exact `counts()` key shape before importing

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`

## Implementation plan

### Both order mutations — add pending seat count invalidation

1. **Edit `use-create-upholstery-order.ts`** — in `onSettled`, add one `invalidateQueries` call after the existing three:
   ```typescript
   void queryClient.invalidateQueries({
     queryKey: pendingSeatUpholsteryKeys.counts(),
   });
   ```
   - Import `pendingSeatUpholsteryKeys` from `@/features/pending-upholstery/api/pending-seat-keys`.
   - The existing three invalidations (`upholsteryOrderingKeys.all`, `itemUpholsteryKeys.all`, `upholsteryKeys.pickerLists()`) remain unchanged.

2. **Edit `use-receive-upholstery-order.ts`** — identical addition to `onSettled`:
   ```typescript
   void queryClient.invalidateQueries({
     queryKey: pendingSeatUpholsteryKeys.counts(),
   });
   ```
   - Import `pendingSeatUpholsteryKeys` from `@/features/pending-upholstery/api/pending-seat-keys`.
   - Existing `onSuccess` optimistic patch and three `onSettled` invalidations remain unchanged.

## Risks and mitigations

- Risk: Adding `pendingSeatUpholsteryKeys.counts()` triggers an unnecessary network request on the pending-seat count endpoint when it wasn't logically affected by the order mutation.
  Mitigation: The request is lightweight (a count endpoint); the count is always stale on the home page anyway since `staleTime` is 0 by default. The cost is negligible and correctness is improved.

- Risk: `pendingSeatUpholsteryKeys` import path is wrong.
  Mitigation: Path confirmed from code inspection: `@/features/pending-upholstery/api/pending-seat-keys`. TypeScript compile will catch any mismatch.

## Validation plan

- `npm run typecheck`: zero TypeScript errors

**Manual:**
- Create an upholstery order; dismiss the ordering slide; confirm the "Ordering" button count on home has decreased without a pull-to-refresh.
- Receive an order; navigate back to home; confirm both counts reflect the current backend state.
- Confirm no regression: opening home before any order action shows the correct counts (existing behavior unchanged).

## Review log

- `2026-06-17T13:21:00Z` — Implemented the two pending-seat count invalidations and verified `npm run typecheck` passes.

## Lifecycle transition

- Current state: `archived`
- Next state: `completed`
- Transition owner: David
