# PLAN_upholstery_ordering_corrections_20260616

## Metadata

- Plan ID: `PLAN_upholstery_ordering_corrections_20260616`
- Status: `archived`
- Owner agent: `Claude (Opus 4.8)`
- Created at (UTC): `2026-06-16T19:30:00Z`
- Last updated at (UTC): `2026-06-17T13:39:12Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/upholstery_ordering_2.txt`
- Corrects: `docs/architecture/archives/implementation/PLAN_upholstery_ordering_20260616.md`
- Implementation summary under review: `docs/architecture/implemented_summaries/SUMMARY_upholstery_ordering_20260616.md`

## Goal and intent

- Goal: Close the correctness bugs, contract drifts, and intention gaps found in the review of the shipped `features/upholstery-ordering` module — without changing the feature's architecture or backend contract usage.
- Business/user intent: Make the ordering workspace behave correctly under real mobile usage (selection survives refresh, the Save button is never hidden by the keyboard, order-detail context is accurate after partial receipts) and bring the module back into contract/test compliance.
- Non-goals:
  - No new endpoints, no backend behavior changes, no new screens.
  - No re-architecture of controllers/providers/surfaces.
  - No change to the create/receive "light optimistic + invalidation-first" strategy beyond making the optimistic patch complete.

## Scope

- In scope:
  1. **[Bug] Detail-page refresh drops valid selections / mis-counts totals** — `controllers/use-detail-items.controller.ts`.
  2. **[Drift] Keyboard-aware numeric inputs (contract 37)** — `pages/OrderFormSlidePages.tsx`.
  3. **[Gap] Receive optimistic patch is incomplete + order-detail shows stale `remaining`** — `actions/use-receive-upholstery-order.ts`, `pages/DetailSlidePages.tsx`.
  4. **[Gap] Order-detail aggregate context is thin** — `pages/DetailSlidePages.tsx`.
  5. **[Hygiene] Backend authoritative client-id prefix-map doc not updated** — `backend/app/beyo_manager/models/tables/client_id_prefix_map.md`.
  6. **[Tests] No vitest/Playwright coverage** — add unit + e2e per `17_testing.md` / `34_runtime_validation_local.md`.
  7. **[Polish] Low-priority improvements** — inactive-mode list query gating, item-card state label, duplicated order-state enum.
  8. **[Bug] Pending-upholstery card always PUTs when it should sometimes PATCH** — `features/pending-upholstery/components/PendingUpholsteryCard.tsx`, new `features/pending-upholstery/actions/use-pending-upholstery-update.ts`. When a task was created with `amount_meters` but no `upholstery_id`, the backend now returns those items in the pending list with a non-null `item_upholstery_id`. The card view-model already carries `itemUpholsteryId` but `handleDirectAction` ignores it and always fires `createItemUpholstery` (PUT). The fix branches on `card.itemUpholsteryId`: if set → PATCH the existing record via a new `usePendingUpholsteryUpdate` hook; if null → keep the existing PUT path.
- Out of scope:
  - Refactoring the create/receive forms to `useForm`/`zodResolver` (manual single-field validation is accepted; only the keyboard behavior is required). Recorded as a deliberate deviation, not a fix.
  - The shared pagination/accumulation refresh-after-create limitation inherited from `pending-upholstery` (pre-existing pattern debt; out of scope here).
- Assumptions:
  - The receive endpoint response still returns only `{ client_id, state }` (handoff §5); the new received amount must be derived client-side as `cached.received_amount_meters + input.received_amount_meters` for the optimistic patch.
  - `@beyo/ui` exposes the keyboard-inset primitive referenced by `37_keyboard_aware_inputs.md` (`useKeyboardInset` / `FloatingKeyboardBar`); verify the exact export name before use (see Clarifications).

## Clarifications required

- [ ] **Keyboard primitive export name/shape.** Confirm against `37_keyboard_aware_inputs.md` + `@beyo/ui` public API whether the bottom action should use `FloatingKeyboardBar`, a `useKeyboardInset()` hook + `--keyboard-inset` padding, or `KeyboardInsetProvider`. This blocks fix #2 only; pick the primitive the contract documents and the package actually exports — do not invent one.
- [ ] **Order-detail liveness depth.** Confirm the acceptable approach for fix #3: *Recommended* — derive the order's live `remaining`/`received` by reading the orders-list cache by `orderId` (falling back to the surface-prop snapshot), so the detail reflects the optimistic patch without an extra fetch. Alternative — accept detail-only staleness and just complete the list-cache patch. **Does not block** the list-cache patch portion.

## Acceptance criteria

1. On a detail page, selecting items across multiple pages and then pull-to-refresh **keeps every selection whose `item_upholstery.client_id` still exists in the refreshed result**, across all loaded pages — not just the first page; `selectedTotalMeters` reflects all retained selections.
2. A selection that is genuinely gone after refresh (id absent from the server result) is the only thing dropped.
3. On mobile, focusing the quantity input on the create and receive slides keeps the Save/Register button fully visible above the software keyboard (no overlap) on the runtime-validation mobile project.
4. After a partial receive, the order list card's `remaining`/`received` update optimistically (state **and** received amount), and reconcile to backend truth after invalidation.
5. Order-detail header aggregate shows order context comparable to shortage detail (e.g. ordered total + remaining), not only the selected count.
6. The authoritative backend prefix-map doc contains the `UpholsteryOrder | uor` row, matching the frontend mirror and `packages/lib/src/client-id.ts`.
7. New tests exist and pass: vitest for the DTO transforms, the selection-survival reconciliation (criteria 1–2), and the receive `≤ remaining` validation; Playwright mobile+desktop for the needs→create and orders→receive loops and mode-switch search preservation.
8. `npm run typecheck` clean; `npm run test` green; `npm run test:e2e:mobile` and `npm run test:e2e:desktop` green.
9. On the pending-upholstery page, selecting an upholstery for a task that already has an `ItemUpholstery` record (created at task-creation time with only `amount_meters`) fires `PATCH /api/v1/item-upholsteries/:id` — not PUT. Selecting an upholstery for a task with no prior record still fires PUT. Both paths remove the task from the pending list optimistically and reconcile via invalidation.

## Contracts and skills

### Contracts loaded

Read order — canonical first, then `_local` where present (local overrides for this app only).

- `architecture/06_client_state.md`: controller-owned selection/pagination state — authority for the fix #1 reconciliation rule.
- `architecture/08_hooks.md`: action-hook optimistic snapshot/patch/invalidate — authority for fix #3 cache patch.
- `architecture/05_server_state.md`: query-key matching for `getQueriesData`/`setQueryData` and reading list cache by key (fix #3 liveness).
- `architecture/24_dto.md`: DTO transform shape — authority for DTO unit tests.
- `architecture/37_keyboard_aware_inputs.md`: floating-input-above-keyboard pattern — authority for fix #2.
- `architecture/09_forms.md`: consulted only to confirm the manual-validation deviation is acceptable for single-field forms; not refactoring.
- `architecture/17_testing.md`: vitest + MSW + `data-testid` strategy — authority for unit/component tests.
- `architecture/34_runtime_validation.md` (+ `34_runtime_validation_local.md`): Playwright fixtures, project names, credentials, element-naming — authority for e2e.
- `architecture/13_errors.md`: empty/error/pagination-error handling parity when touching detail page.

### File read intent — pattern vs. relational

All files to be edited were already read in review (relational — "what exists"). The only *how-to* reads needed are the contracts above (fix #2 keyboard pattern, fix #3 optimistic-patch pattern, tests). Do **not** open other features' action/controller/form files to copy structure — `08_hooks.md`, `37_keyboard_aware_inputs.md`, and `17_testing.md` already define it.

### Skill selection

- Primary skill: none (targeted corrections under contracts).
- Trigger terms: `keyboard`, `optimistic update`, `scroll/selection`, `testing`, `playwright`.

## Implementation plan

1. **Fix #1 — selection-survival on refresh** (`controllers/use-detail-items.controller.ts`):
   - Reconcile selection against the **accumulated, refreshed rows**, not a single refetched page. Two acceptable implementations (pick one):
     - (a) Drop the manual `await query.refetch()` + first-page pruning. On refresh, `setOffset(0)` and let the `[offset, query.data]` effect rebuild `rows`; reconcile `selectedIds` in a follow-up effect that runs when `rows` changes *after an explicit refresh flag*, keeping only ids still present in `rows`.
     - (b) Keep selection purely by identity and **do not prune on refresh at all** — selections persist; stale ids are naturally ignored because `selectedCards`/`selectedTotalMeters` derive from loaded `cards`, and the submit payload filters to ids the backend still recognizes.
   - Recommended: (b) for simplicity + matching the plan's "never prune valid selection" rule; if product wants stale cleanup, use (a). Ensure `selectedTotalMeters` and the footer label remain correct for selections across loaded pages.
   - Verify pull-to-refresh no longer collapses accumulated pages in a way that hides selected rows (if accumulation reset to page 0 is kept, that's fine as long as selection ids/counts survive).

2. **Fix #2 — keyboard-aware form inputs** (`pages/OrderFormSlidePages.tsx`, `AmountInput`):
   - Apply the `37_keyboard_aware_inputs.md` pattern so the bottom Save/Register action floats above the keyboard (keyboard-inset padding or `FloatingKeyboardBar`, per Clarification). Keep `inputMode="decimal"`.
   - Validate on the mobile runtime project that the button is reachable while the keyboard is open.

3. **Fix #3 — complete receive optimistic patch + live order detail**:
   - `actions/use-receive-upholstery-order.ts`: in `patchOrderState`, also update `received_amount_meters` to `(row.received_amount_meters ?? 0) + variables.received_amount_meters` (read the mutation `variables` in `onSuccess`), in addition to `state`. Keep `onSettled` invalidation as the authority.
   - `pages/DetailSlidePages.tsx` (order mode): derive the live order row from the orders-list cache by `orderId` (fallback to the `order` surface-prop snapshot) so the header aggregate, the footer disable rule, and the receive prefill reflect the patched `remaining`. (Recommended per Clarification 2; otherwise document accepted detail staleness.)

4. **Fix #4 — order-detail aggregate** (`pages/DetailSlidePages.tsx`):
   - For `mode === "order"`, render an aggregate string with order context (e.g. `"{orderAmountLabel} ordered • {remainingReceivableLabel} remaining"`) and append `"{n} selected"` when a selection exists — mirroring the shortage aggregate richness.

5. **Fix #5 — authoritative prefix-map doc** (`backend/app/beyo_manager/models/tables/client_id_prefix_map.md`):
   - Add the `| UpholsteryOrder | uor | uor_xxxxxxx |` row so the authoritative source matches the frontend mirror and TS map. (This file is in the backend working dir; coordinate the backend-repo edit.)

6. **Fix #6 — tests**:
   - Vitest:
     - `lib/upholstery-ordering-dto` — `toShortageCardViewModel`, `toOrderCardViewModel` (remaining math, received-vs-expected date branch), `toOrderingItemCardViewModel` (null `amount_meters` → `amountLabel: null`, `amountMeters: 0`; null `item_upholstery` → card filtered out).
     - `controllers/use-detail-items.controller` — selection survives pagination + refresh (criteria 1–2) via `renderHook` + MSW.
     - Receive validation — quantity `> remaining` blocked, `≤ remaining` allowed (`pages/OrderFormSlidePages` `parseAmount`/submit guard or extract the guard to a pure helper for testability).
   - Playwright (`tests/playwright/features/upholstery-ordering/…`, fixtures from `34_runtime_validation_local.md`, `auth.signIn()`): needs→create loop (verify create closes both surfaces and lists/counts refresh), orders→receive loop (verify state/remaining update), mode-switch preserves search text. Add any missing `data-testid`s required by selectors (cards already expose stable testids).

7. **Fix #7 — polish** (low priority, only if not destabilizing):
   - Gate the inactive mode's **list** query with `enabled: mode === "needs"` / `mode === "orders"` in `use-upholstery-ordering.controller.ts` (keep both **count** queries always enabled for the pills).
   - `components/OrderingItemCard.tsx`: title-case the state label and map a sensible `StatePill` variant instead of raw lowercase + fixed `neutral`.
   - `api/fetch-upholstery-ordering.ts`: reuse `UpholsteryOrderStateSchema` in the receive response schema instead of re-inlining the 8-state enum.

8. **Fix #8 — pending-upholstery card PUT vs PATCH** (`features/pending-upholstery/`, managers app):

   a. **Create `actions/use-pending-upholstery-update.ts`** — new action hook that mirrors `usePendingUpholsteryCreate` in optimistic-update shape but calls `updateItemUpholstery` (PATCH) instead of `createItemUpholstery` (PUT):
   - `mutationFn`: `({ taskId: _taskId, ...input }) => updateItemUpholstery(input)` where `input` is `{ itemUpholsteryId, upholstery_id }`.
   - `onMutate`: identical to `usePendingUpholsteryCreate` — cancel pending list/counts queries, snapshot both, remove the task row from `missing_selection` list queries optimistically, decrement `missing_selection_total` by 1, return snapshot for rollback.
   - `onError`: roll back using the snapshot context (identical to create hook).
   - `onSettled`: invalidate `pendingSeatUpholsteryKeys.all`, `taskKeys.detail(taskId)`, `taskKeys.lists()`, `upholsteryKeys.pickerLists()`, and `itemUpholsteryKeys.byItem(itemId)` — identical set to create hook.
   - Constructor signature: `usePendingUpholsteryUpdate(itemId: string | null)` — same as create hook.
   - Mutation input type: `UpdateItemUpholsteryInput & { taskId: string }` (import `UpdateItemUpholsteryInput` from `@/features/items/api/update-item-upholstery`).

   b. **Edit `components/PendingUpholsteryCard.tsx`**:
   - Import `usePendingUpholsteryUpdate`.
   - Instantiate both hooks: `const createUpholstery = usePendingUpholsteryCreate(...)` (existing) and `const updateUpholstery = usePendingUpholsteryUpdate(card.primaryItem?.id ?? null)` (new).
   - Update `isPending` to: `createUpholstery.isPending || updateUpholstery.isPending`.
   - In `handleDirectAction`, replace the single `onOpenUpholsteryPicker` call with a branch:
     ```typescript
     if (card.itemUpholsteryId) {
       const existingId = card.itemUpholsteryId;
       onOpenUpholsteryPicker((upholsteryClientId) => {
         updateUpholstery.mutate({
           taskId: card.taskId,
           itemUpholsteryId: existingId,
           upholstery_id: upholsteryClientId,
         });
       });
     } else {
       onOpenUpholsteryPicker((upholsteryClientId) => {
         createUpholstery.mutate({
           taskId: card.taskId,
           client_id: generateClientId("ItemUpholstery"),
           item_id: primaryItem.id,
           upholstery_id: upholsteryClientId,
           source: "internal",
         });
       });
     }
     ```

9. **Validate**: typecheck → vitest → Playwright mobile then desktop. Update `SUMMARY_upholstery_ordering_20260616.md` "Known gaps" to reflect the closed items (or note the accepted deviations: manual single-field forms, detail staleness if Clarification 2 chose the lighter path).

## Risks and mitigations

- Risk: Changing the refresh/selection logic reintroduces the accumulation reset or breaks `keepPreviousData` behavior.
  Mitigation: Cover with the new `use-detail-items.controller` vitest (criteria 1–2) before/after; prefer the minimal "don't prune" path (1b).
- Risk: Keyboard-inset primitive differs from the contract's example name.
  Mitigation: Resolve Clarification 1 against the actual `@beyo/ui` export before coding; do not invent an API.
- Risk: Optimistic `received_amount_meters` accumulation diverges from backend after concurrent receives.
  Mitigation: `onSettled` invalidation remains authoritative; the patch is display-only between mutation and refetch.
- Risk: Reading order from list cache returns `undefined` when the detail was deep-linked or the list page was evicted.
  Mitigation: Always fall back to the `order` surface-prop snapshot.
- Risk: `usePendingUpholsteryUpdate` optimistic patch removes the task from the list before the PATCH succeeds; if the server rejects (e.g. record was deleted), the card is gone and the user sees no feedback.
  Mitigation: `onError` rolls back via the snapshot (identical to the create hook pattern). The rollback restores the row and count.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test -- --grep upholstery-ordering`: DTO, selection-survival, receive-validation unit tests pass.
- `npm run test:e2e:mobile`: needs→create and orders→receive loops, mode-switch search preservation, **keyboard does not cover the Save button** — pass.
- `npm run test:e2e:desktop`: same flows pass.
- Manual: on the pending-upholstery page, open a task that was created with quantity-only (has `item_upholstery_id`, no selection) → tap "Select upholstery" → pick one → confirm network call is `PATCH /api/v1/item-upholsteries/:id`, not PUT.
- Manual: on the pending-upholstery page, open a task with no item-upholstery record at all → tap "Select upholstery" → pick one → confirm network call is `PUT /api/v1/item-upholsteries` (create path unchanged).

## Review log

- `2026-06-16` `Claude (Opus 4.8)`: Authored from the post-implementation review of `SUMMARY_upholstery_ordering_20260616`. Headline items: selection-loss-on-refresh bug (#1) and keyboard-aware inputs (#3 in review / fix #2 here); remainder are optimistic-patch completeness, order-detail context, doc sync, tests, and polish.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`
