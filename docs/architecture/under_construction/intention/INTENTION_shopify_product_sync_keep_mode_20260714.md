# INTENTION_shopify_product_sync_keep_mode_20260714

## Metadata

- Intention ID: `INTENTION_shopify_product_sync_keep_mode_20260714`
- Status: `active`
- Owner: `David`
- Created at (UTC): `2026-07-14T00:00:00Z`
- Last updated at (UTC): `2026-07-14T00:00:00Z`

## Goal

Add a persistable "Keep" mode to `ShopifyProductSyncForm` so a worker can save an in-progress Shopify product form to frontend IndexedDB — keyed by the task's `client_id` — instead of submitting it, and have it restored automatically the next time the same task's form opens.

## Why this matters

Workers filling in Shopify sync details during task completion may not have all the information (SKU, metafields, shop targets) at hand. Today the only options are to submit an incomplete/blocked form or Skip it, which discards everything typed so far. A local "Keep for later" action lets them save partial progress without triggering a real Shopify sync, then pick it back up on the same task later.

## Success criteria

1. `ShopifyProductSyncForm` supports an explicit `mode: "submit" | "keep"` contract, defaulting to `"submit"` (fully backward compatible).
2. In `"keep"` mode the final staged-form action reads "Keep", saves current (possibly incomplete) values to IndexedDB under the task's `client_id`, and never invokes `useProcessShopifyProducts` or `resolveShopifyProductSyncSubmit`.
3. Opening the form for a task with a saved, non-expired, schema-compatible draft restores it via `form.reset(...)`, without clobbering values the user has already started typing if the restore resolves late.
4. Drafts expire 24 hours after their last save and are swept both on every save and on every form open; a successful `"submit"` for the same task deletes its draft.
5. IndexedDB failures on save keep the form open, preserve the user's values, and surface an error; failures on restore fall back silently to a normal empty form.
6. No backend, cross-device, or cross-tab synchronization is introduced — this is a local, single-device, explicit-action feature only.

## Scope boundary

- In scope: `mode` contract on the Shopify product sync form/provider/surface-props chain; a new Dexie-backed IndexedDB repository + hook scoped to `packages/shopify`; restore-on-open, keep-on-action, cleanup, and delete-on-submit-success behavior; tests (repository, form, integration).
- Out of scope: backend draft endpoints or any server-side persistence; cross-device/cross-tab sync; continuous autosave on keystroke; offline Shopify submission; a new "discard draft" UI action (the repository exposes a delete function for future use, but nothing currently calls it outside the post-submit-success path); changes to `@beyo/ui` `StagedForm`/`StagedFormNavigation` (their existing `submitLabel`/`isAdvancing` props already suffice).
- Non-goals: Redis/Postgres storage, Shopify token persistence, a generic cross-package IndexedDB abstraction (none exists yet; this one is scoped to the Shopify package and named accordingly so a future generalization can extract from it if a second consumer appears).

## Linked implementation plans

| Plan ID | Path | Status | Covers |
|---------|------|--------|--------|
| `PLAN_shopify_product_sync_keep_mode_20260714` | `docs/architecture/archives/implementation/PLAN_shopify_product_sync_keep_mode_20260714.md` | `archived` | Full implementation: types, provider/surface contract, Dexie repository, hook, form wiring, tests |

## Progress notes

- `2026-07-14`: Intention captured from user-provided spec; codebase inspected (no prior IndexedDB infra found anywhere in the frontend monorepo; `task.client_id` confirmed available as `resolvedTaskId: TaskId` at the one existing call site, `apps/workers-app/.../use-task-step-detail.controller.ts:407`). Implementation plan drafted in the same session.
- `2026-07-14`: Implementation completed and archived. Shopify product sync drafts now persist locally with Keep/restore/expiry behavior; the worker actions sheet exposes the gated Keep-mode entry point. Validation passed: `npm run typecheck` and `npm run test:shopify`.

## Open questions

None blocking — all twelve clarifications listed in the original spec were resolved against the current codebase; see "Resolved clarifications" table in the linked implementation plan.

## Lifecycle transition

- Current status: `achieved`
- Next status: none
- Transition trigger: all success criteria met; linked implementation plan archived with an implementation summary
