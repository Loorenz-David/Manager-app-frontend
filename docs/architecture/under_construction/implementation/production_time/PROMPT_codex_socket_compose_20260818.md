# Codex prompt — socket registry composition fix (Track B, step 9)

Copy everything below the line into Codex. This is a continuation of the Track B session, not a new task.

---

Your socket-handler collision report is **confirmed — you found a real bug**, and your ordering analysis was correct: `itemEconomicsSocketEvents` is spread before the task map in all three apps, so the task handler wins and production-time invalidation is what gets silently dropped. Stopping instead of guessing was the right call.

I audited all three registries: there are exactly **three** collisions, one per app, all `task:step-state-changed`, all introduced by this work. Nothing pre-existing is being dropped.

We are taking a different fix from the one you proposed. Rather than three hand-written merges, add a composition helper, so the next package that needs an already-claimed event cannot lose its handler depending on where its line sits in the registry.

**Do not change `packages/item-economics/src/socket-events.ts`.** It is correct as written.

## 1. The helper

**New file:** `packages/realtime/src/lib/socket-compose.ts` (the `socket-*` prefix matches its siblings: `socket-batch.ts`, `socket-debounce.ts`, `socket-registry-types.ts`).

```ts
export function composeSocketHandlers(
  ...maps: SocketEventHandlers[]
): SocketEventHandlers
```

Semantics:

- A key claimed by **more than one** map → **every** handler runs, in the order the maps were passed to the function.
- A key claimed by exactly **one** map → return that handler as-is. No wrapper function, no extra allocation.
- `undefined` handler values are skipped, not wrapped.
- Handlers run in order with no try/catch — a throwing handler propagates exactly as it does today. Do not add error isolation; that is a separate decision.

Export it from `packages/realtime/src/index.ts` alongside `debouncedInvalidation` and `batchInvalidation`.

**Type discipline.** `SocketEventHandlers` is a mapped type where each key's handler takes its own payload type, so iterating it generically needs narrowing. Do that with `unknown`-based casts confined to the helper's body — **never `any`** (`02_types.md` §The no-`any` rule). The exported signature stays fully typed; callers must see no loosening.

## 2. Swap the three registries

`apps/{managers-app/ManagerBeyo-app-managers,workers-app/ManagerBeyo-app-workers,selleres-app/ManagerBeyo-app-sellers}/src/app/socket-registry.ts`

Replace the object spread with `composeSocketHandlers(...)`, **preserving the current map order exactly**. Order still matters — it now decides the sequence handlers run in, rather than which one survives.

All three registries are currently pure spreads with no inline handler entries, so each becomes a straight argument list. If you do add an inline entry later, pass it as a final object-literal argument so it composes under the same rule rather than overwriting.

## 3. Tests

`@beyo/realtime` has no vitest config yet.

- Add `packages/realtime/vitest.config.ts` mirroring `packages/item-economics/vitest.config.ts` (same `include` pattern, pointed at `packages/realtime/src`).
- Add `"test:realtime": "vitest run --config packages/realtime/vitest.config.ts"` to the root `package.json` scripts, next to the other `test:*` entries.
- Add `packages/realtime/src/lib/socket-compose.test.ts` covering:
  1. two maps claiming one key → **both** handlers run, in the order the maps were passed;
  2. a key claimed by one map → the original function reference is returned unchanged (assert identity, not just behaviour);
  3. `undefined` handler values are skipped;
  4. every handler receives the same `payload` and `ctx` it was called with;
  5. a regression test named for this bug: composing an item-economics-shaped map and a task-step-shaped map that share `task:step-state-changed` invalidates **both** query families.

## 4. Verify

```bash
npx tsc -p packages/realtime/tsconfig.json --noEmit
npm run typecheck
npm run test:realtime
npm run test:item-economics          # 46 existing tests must stay green
```

Then confirm by inspection that in each of the three apps, `task:step-state-changed` now runs both the task/step handler and the item-economics handler.

## 5. Out of scope

- **Do not edit `architecture/21_realtime.md`.** It documents the spread pattern and never contemplated two maps claiming one event. That contract gap is real and will be folded back in by the owner after this ships — note it in the plan's Review log instead.
- Do not add error isolation, handler priorities, or a deregistration API. Chaining only.

When this is done, resume the remaining Track B steps from the plan.

---
