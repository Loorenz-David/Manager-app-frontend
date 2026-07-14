# PLAN_shopify_product_sync_keep_mode_20260714

## Metadata

- Plan ID: `PLAN_shopify_product_sync_keep_mode_20260714`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-14T00:00:00Z`
- Last updated at (UTC): `2026-07-14T14:23:55Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_shopify_product_sync_keep_mode_20260714.md`

## Goal and intent

- Goal: Add a `mode: "submit" | "keep"` contract to `ShopifyProductSyncForm` so that in `"keep"` mode the final staged-form action saves the current (possibly incomplete) form values to a new IndexedDB-backed draft store, keyed by the task's `client_id`, instead of queuing a Shopify sync — and so that any time the form opens for a task with a live draft, it restores automatically. Additionally, give `"keep"` mode an actual entry point: a "Fill shopify sync" button on `TaskStepActionsSheetPage`, visible only for working sections that allow Shopify product modifications.
- Business/user intent: let a worker save partial Shopify sync progress on a task and resume it later, without discarding it via Skip or forcing a possibly-incomplete Shopify submission. The actions-sheet button is the ad-hoc, any-time way to do this — separate from the existing task-completion flow, which keeps using `"submit"` mode (Sync/Skip) unchanged.
- Non-goals: backend persistence, cross-device/cross-tab sync, continuous autosave, offline submission, a discard-draft UI affordance, changes to `@beyo/ui` staged-form primitives.

## Scope

- In scope:
  - `packages/shopify/src/types.ts`: `ShopifyProductSyncFormMode` type, `ShopifyProductSyncDraftRecordSchema`/`ShopifyProductSyncDraftRecord` type.
  - `packages/shopify/src/surface-ids.ts`: add `mode?: ShopifyProductSyncFormMode`, `taskClientId: string`, `onKept?: () => void` to `ShopifyProductSyncSlideSurfaceProps`.
  - `packages/shopify/src/pages/ShopifyProductSyncSlidePage.tsx`: resolve `mode` default, thread `taskClientId`/`onKept` into the provider.
  - `packages/shopify/src/providers/ShopifyProductSyncFormProvider.tsx`: carry `mode`, `taskClientId`, `onKept` in context.
  - New: `packages/shopify/src/drafts/shopify-product-sync-draft-types.ts`, `packages/shopify/src/drafts/shopify-product-sync-draft-repository.ts`, `packages/shopify/src/drafts/shopify-product-sync-draft-db.ts`.
  - New: `packages/shopify/src/hooks/use-shopify-product-sync-draft.ts`.
  - `packages/shopify/src/components/ShopifyProductSyncForm.tsx`: mode-aware keep action, restore-on-mount, delete-on-submit-success.
  - `packages/shopify/src/index.ts`: export new public types (`ShopifyProductSyncFormMode`) if needed by consuming apps; no new component/hook exports required (drafts stay package-internal).
  - `packages/shopify/package.json`: add `dexie` dependency, `fake-indexeddb` devDependency.
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`: pass `taskClientId: resolvedTaskId` at the existing `openSurface(SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID, ...)` call site (line 407, task-completion flow, stays `mode: "submit"` by omission — unchanged behavior); expand the `TASK_STEP_ACTIONS_SHEET_SURFACE_ID` call site (`handleOpenActionsSheet`, line 578-584) with item-detail fields and the already-computed `allowsShopifyProductModifications` flag.
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts`: derive `allowsShopifyProductModifications` via the same `queryClient.getQueryData<WorkerWorkingSection[]>(workerWorkingSectionKeys.mine())` lookup already used in the sibling controller (keyed by this controller's own `sectionId`); expand `handleOpenTaskActions`'s `TASK_STEP_ACTIONS_SHEET_SURFACE_ID` call with the same item-detail fields (looked up from `rawSteps` by `stepId`) and the flag.
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`: expand `TaskStepActionsSheetSurfaceProps` with `itemArticleNumber?`, `itemSku?`, `itemCategoryId?` (all `string | null`), and a required `allowsShopifyProductModifications: boolean`.
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskStepActionsSheetPage.tsx`: new "Fill shopify sync" button, rendered only when `allowsShopifyProductModifications && itemId`, opening `SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID` with `mode: "keep"` and the task/item identity fields already in its surface props.
  - Tests: repository unit tests, hook tests, form tests, one integration test file, plus `TaskStepActionsSheetPage` button-visibility/open-call tests.
- Out of scope: any change to `@beyo/ui` staged-form primitives; a new "Discard draft" button/action; backend routes; cross-tab/cross-device sync; any app besides `workers-app` (it's the only current caller of the surface); a `productCategory`/`defaultTitle` prefill from the actions-sheet entry point (both are optional on `ShopifyProductSyncSlideSurfaceProps` and unused by `"keep"` mode, which never reads them — see Design §8).
- Assumptions:
  - `resolvedTaskId` (`TaskId` branded type from `@beyo/lib`, `packages/lib/src/types/common.ts:10`) is structurally a `string` and is the task's `client_id` — confirmed by its use as `entity_client_id` for `entity_type: "task"` case queries in the same controller (`use-task-step-detail.controller.ts:226`).
  - Only one Shopify product sync draft can exist per task at a time (the form always operates on `step.item`, singular, per task-step-completion flow; the intention explicitly keys drafts by task, not item).
  - `dexie` is an acceptable new dependency; `26_persistence.md` explicitly recommends Dexie for IndexedDB use in this codebase and no existing IndexedDB abstraction exists anywhere in the frontend monorepo (verified via repo-wide grep for `indexeddb|dexie|idb|localforage`, zero hits outside node_modules).

## Clarifications required

None outstanding — all resolved during research (see table below). No checklist items block starting implementation.

### Resolved clarifications (from the original spec's "Important Clarifications" list)

| # | Question | Resolution | Evidence |
|---|---|---|---|
| 1 | Where is `task.client_id` available? | In `apps/workers-app/.../use-task-step-detail.controller.ts`, as `resolvedTaskId` (line 142: `taskId ?? ("" as TaskId)`), in scope at the exact `openSurface(SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID, ...)` call (line 407). | `use-task-step-detail.controller.ts:142,226,407` |
| 2 | Is the property `client_id`, `clientId`, or mapped? | Branded `TaskId = Branded<string, 'TaskId'>` (a plain string at runtime). The controller already treats it as the task's client id — passed as `entity_client_id` when querying cases for `entity_type: "task"`. | `packages/lib/src/types/common.ts:10`; `use-task-step-detail.controller.ts:226` |
| 3 | Which component owns `mode`? | `ShopifyProductSyncSlidePage` resolves the default (`props.mode ?? "submit"`) and passes it into `ShopifyProductSyncFormProvider`, which carries it in context; `ShopifyProductSyncForm` reads `ctx.mode`. This mirrors how every other prop (`itemClientId`, `itemSku`, etc.) already flows through this exact chain — no new pattern introduced. | `ShopifyProductSyncSlidePage.tsx`, `ShopifyProductSyncFormProvider.tsx` |
| 4 | Does an IndexedDB repository already exist? | No. Repo-wide search for `indexeddb`, `dexie`, `idb`, `localforage`, and `draft`-named persistence files found nothing outside `node_modules`. Building new, scoped to `packages/shopify/src/drafts/`. | grep across `packages/` and `apps/`, zero matches |
| 5 | How are notifications currently displayed? | `notify` from `@beyo/lib` (`packages/lib/src/notify.ts`), a thin `sonner` wrapper (`notify.success/error/info(title, description?)`), already imported and used inside this very package (`use-create-shopify-metafield-preference.ts`, `use-delete-shopify-metafield-preference.ts`, `ShopifyShopActionsSheetPage.tsx`). | `packages/lib/src/notify.ts`; grep hits inside `packages/shopify/src` |
| 6 | Does `onSkipped` mean close, or permanent discard? | Close/continue only. At the sole call site, `onSkipped: openTimeConfirmation` — the **same** callback passed to `onCompleted`. It means "this optional step is done, move the task-completion flow forward," not "the user discarded their draft." Draft deletion must **not** be wired to `onSkipped`. | `use-task-step-detail.controller.ts:407` |
| 7 | Does successful submission unmount the form immediately? | Yes — `ShopifyProductSyncSlidePage`'s `onCompleted` prop is `() => closeAndContinue(props.onCompleted)`, which calls `header?.requestClose()` synchronously before the callback. The draft delete-on-success call must be `await`ed **before** `ctx.onCompleted?.()` fires, not after, or the component may unmount before the delete resolves. | `ShopifyProductSyncSlidePage.tsx:13-16,27` |
| 8 | Are metafield form values structured-clone compatible? | Yes. `ShopifyProductSyncMetafieldValueSchema` = `{ shopIntegrationId: string, shopifyMetafieldDefinitionId: string, namespace: string, key: string, type: string, value: string }` — all primitive strings, no functions/class instances/Maps. | `packages/shopify/src/types.ts:391-401` |
| 9 | Does `ShopifyProductSyncFormSchema` accept incomplete drafts? | Structurally yes — `z.object({ shopIntegrationIds: z.array(z.string()), sku: z.string().optional(), metafields: z.array(...), title: z.string().optional(), description: z.string().optional() })` has no `.min()`/`.refine()` completeness constraints; empty arrays and omitted optional strings all pass. Business completeness ("must have a title or SKU," "must pick a shop") is enforced later, in `resolveShopifyProductSyncSubmit`, not in this resolver. Keep mode will call `form.getValues()` directly and skip `form.handleSubmit(...)`/the zod resolver entirely, so it is immune to any future stricter resolver schema. | `packages/shopify/src/types.ts:472`; `packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts` |
| 10 | Does `@beyo/ui` need a mode-specific final-action change? | No. `StagedFormNavigation` already accepts a plain `submitLabel` string prop and `StagedForm` already accepts a plain `isAdvancing` boolean prop — both already sourced from `ShopifyProductSyncForm` itself (`submitLabel={isFormFilled(values) ? "Sync" : "Skip"}`, `isAdvancing={mutation.isPending}`). Swapping these expressions for mode-aware ones requires zero `@beyo/ui` changes. | `ShopifyProductSyncForm.tsx:97,104`; `StagedFormNavigation.tsx`; `staged-form.types.ts` |
| 11 | Can multiple drafts exist per task? | No — one draft per task. The surface is opened once per task-step completion for a single `step.item`; the intention explicitly keys the draft by `taskClientId` alone (not item id), so the object store's primary key is `taskClientId` and a new Keep overwrites the prior draft for that task. | Original spec's explicit exclusion of item-id keying; `use-task-step-detail.controller.ts:405-408` (one item per completion) |
| 12 | Does restoring `shopIntegrationIds`/metafields require waiting on integration queries? | No new wait-gating needed. `useShopifyMetafieldPickerController` already reactively re-derives `activeFields`/`unavailableDefinitions` from `useListShopifyShopsQuery`/category queries via `useEffect`s keyed on `shopIntegrationIds`/`itemCategoryId` — this already happens for any form value regardless of where it came from (user typing vs. `form.reset`). `ShopifyProductSyncShopField` similarly only *auto-fills* empty selections from remembered shops; it never clears a non-empty value, so a restored `shopIntegrationIds` array is left untouched and reconciled by the picker's own live queries as they resolve. | `use-shopify-metafield-picker.controller.ts:94-225`; `ShopifyProductSyncShopField.tsx:21-40` |
| 13 | How does `allowsShopifyProductModifications` reach the "Fill shopify sync" trigger's `openSurface` call, given the flag lives on the working section, not the task step? | Reuse the existing `queryClient.getQueryData<WorkerWorkingSection[]>(workerWorkingSectionKeys.mine())?.find(...)?.allows_shopify_product_modifications ?? false` cache-lookup pattern, independently in each of the two controllers that open `TASK_STEP_ACTIONS_SHEET_SURFACE_ID` — `use-task-step-detail.controller.ts` already computes this exact value for its own purposes (reused as-is); `use-working-section-steps.controller.ts` gets a new one-line derivation keyed by its own `sectionId`. **Explicitly not** done by threading `WorkingSectionViewModel`/the flag through `WorkingSectionStepsProvider`'s props from `StandardWorkerHomeView.tsx`/`WoodWorkerHomeView.tsx` — that would touch 4+ additional files to carry a value each controller can already derive in one line from cache data it already has (`use-task-step-detail.controller.ts` already imports `useQueryClient`; `use-working-section-steps.controller.ts` already does too, per its existing `queryClient.getQueryData` calls at other lines). React Context was also considered and rejected outright: `TaskStepActionsSheetPage` is a portaled surface, not a descendant of the home route tree, so no Context defined near `route-entry.tsx` could reach it anyway — the value must travel through surface props regardless, and the question was only ever how the controller obtains it before packing it into those props. | `use-task-step-detail.controller.ts:206-208` (existing derivation); `use-working-section-steps.controller.ts` (has `queryClient` already, per its `handleTransition`/`handleOpenStateFilter` callbacks); `StandardWorkerHomeView.tsx`/`WoodWorkerHomeView.tsx` (both pass only `sectionId` to `WorkingSectionStepsProvider`, and the full `section` only to `WorkingSectionStepsView`, not to the controller) |

## Acceptance criteria

1. `ShopifyProductSyncForm` compiles and behaves identically to today when `mode` is omitted or `"submit"` (existing tests in `ShopifyProductSyncSlidePage.test.tsx` and any existing form tests pass unmodified).
2. In `"keep"` mode: final action button reads "Keep"; activating it writes a `ShopifyProductSyncDraftRecord` to IndexedDB keyed by `taskClientId`, never calls `useProcessShopifyProducts().mutateAsync` or `resolveShopifyProductSyncSubmit`, and calls `ctx.onKept?.()` only after the write resolves successfully.
3. Reopening the form for the same `taskClientId` restores the saved values via `form.reset(...)` before the user interacts, and does not restore if the user has already made the form dirty by the time the async lookup resolves.
4. A draft older than 24 hours (by `expiresAt`) is never restored and is removed by the sweep that runs on both save and open.
5. A successful `"submit"` mutation for a task deletes that task's draft (awaited before `ctx.onCompleted?.()` fires); a failed mutation leaves the draft untouched.
6. An IndexedDB write failure during Keep leaves the form open, keeps the user's typed values, shows a root-level form error, and does not call `ctx.onKept?.()`.
7. An IndexedDB read failure during restore is swallowed; the form renders normally with defaults, no crash, no user-facing error.
8. `TaskStepActionsSheetPage` renders a "Fill shopify sync" button if and only if `allowsShopifyProductModifications` is `true` and the step has an item (`itemId` present); activating it opens `ShopifyProductSyncSlidePage` with `mode: "keep"` and the correct `taskClientId`/item identity fields, for a step reached either from the working-section list or from the step detail page.

## Contracts and skills

### Contracts loaded

- `architecture/26_persistence.md`: authoritative source for storage-tier choice — confirms IndexedDB via Dexie is the correct tier for this draft data and that no existing abstraction should be duplicated.
- `architecture/09_forms.md`: react-hook-form conventions (resolver usage, `form.reset`, dirty-state checks) to follow when wiring restore-without-clobbering-user-edits.
- `architecture/17_testing.md`: Vitest + RTL conventions, package-level `vitest.config.ts` pattern, mocking conventions (`vi.mock`, `vi.hoisted`) already used in `ShopifyProductSyncSlidePage.test.tsx`.
- `architecture/13_errors.md`: how to surface a caught error as a root-level form error / UI-safe message, consistent with the existing `form.setError("root", { type: "server", message })` pattern already in `ShopifyProductSyncForm.tsx`.

### Local extensions loaded

- None apply — no `_local.md` override exists for persistence, forms, testing, or errors in this repo.

### File read intent — pattern vs. relational

Applied throughout this plan's research phase per `task_system/frontend_contract_goal_mapping_guide.md`:

- **Relational reads already performed** (understanding what exists, not how to write new code): `ShopifyProductSyncForm.tsx`, `ShopifyProductSyncFormProvider.tsx`, `types.ts`, `resolve-shopify-product-sync-submit.ts`, `use-process-shopify-products.ts`, `ShopifyProductSyncSlidePage.tsx` (+ its test), `surface-ids.ts`, `ShopifyProductSyncShopField.tsx`, `use-shopify-metafield-picker.controller.ts`, `shopify-product-sync-storage.ts` (existing localStorage precedent in this same package), `StagedFormNavigation.tsx`, `staged-form.types.ts`, `notify.ts`, `use-task-step-detail.controller.ts` (the one call site), `packages/lib/src/types/common.ts` (`TaskId` brand).
- **Contract reads for how-to-write**: `26_persistence.md` (Dexie pattern), `17_testing.md` (Vitest conventions) — code in this plan follows those contracts rather than copying another feature's raw hook/query implementation.
- Nothing in this plan required reading another package's DTO/query-hook/provider file merely to copy its shape — the one genuinely relevant precedent (`shopify-product-sync-storage.ts`) lives inside the same package being modified and is directly on-topic (it is this package's existing "remember shop selection" localStorage helper, and is stylistically the template for the new IndexedDB helper's defensive-parsing conventions).

### Skill selection

- Primary skill: none required — this is a planning-only deliverable; no code is being written in this pass.
- Trigger terms: `indexeddb`, `draft persistence`, `form mode`.
- Excluded alternatives: a generic cross-package `@beyo/storage` abstraction — excluded because no second consumer exists yet; introducing one now would be speculative (per the "no premature abstraction" project convention). If a second feature needs IndexedDB later, extract `shopify-product-sync-draft-db.ts`'s Dexie-wrapper pattern into a shared package at that time.

## Design

### 1. Mode type and ownership

```ts
// packages/shopify/src/types.ts (addition)
export type ShopifyProductSyncFormMode = "submit" | "keep";
```

Ownership chain (mirrors every other prop already flowing through this chain):

```
ShopifyProductSyncSlideSurfaceProps.mode?: ShopifyProductSyncFormMode   // surface-ids.ts
        ↓ (default resolved here: props.mode ?? "submit")
ShopifyProductSyncSlidePage                                            // passes mode to provider
        ↓
ShopifyProductSyncFormProvider  Value.mode: ShopifyProductSyncFormMode // context, non-optional, always resolved
        ↓
ShopifyProductSyncForm          ctx.mode                                // reads from context
```

`surface-ids.ts` additions:
```ts
export type ShopifyProductSyncSlideSurfaceProps = {
  itemClientId: string;
  itemArticleNumber?: string | null;
  itemSku?: string | null;
  itemCategoryId?: string | null;
  productCategory?: string | null;
  defaultTitle?: string | null;
  taskClientId: string;                              // NEW — required, draft identity
  mode?: ShopifyProductSyncFormMode;                  // NEW — optional, defaults to "submit"
  surfaceOpeners?: ShopifyProductSyncSurfaceOpeners;
  onCompleted?: () => void;
  onSkipped?: () => void;
  onKept?: () => void;                                // NEW — optional, fires after a successful Keep
};
```

`ShopifyProductSyncFormProvider` `Value` type gains `mode: ShopifyProductSyncFormMode`, `taskClientId: string`, `onKept?: () => void`. `ShopifyProductSyncSlidePage` resolves the default: `mode={props.mode ?? "submit"}`, `taskClientId={props.taskClientId ?? ""}` (empty string means "no persistence identity" — see hook behavior below), `onKept={() => closeAndContinue(props.onKept)}` (kept consistent with how `onCompleted`/`onSkipped` are wrapped today, so a Keep also closes the slide).

### 2. IndexedDB schema (Dexie)

New file `packages/shopify/src/drafts/shopify-product-sync-draft-db.ts`:

```ts
import Dexie, { type Table } from "dexie";
import type { ShopifyProductSyncDraftRecord } from "./shopify-product-sync-draft-types";

class ShopifyDraftsDatabase extends Dexie {
  productSyncDrafts!: Table<ShopifyProductSyncDraftRecord, string>;

  constructor() {
    super("beyo-shopify-drafts");
    this.version(1).stores({
      // Primary key: taskClientId (one draft per task). Secondary index on
      // expiresAt lets the expiry sweep use a bounded cursor instead of a
      // full-table scan.
      productSyncDrafts: "taskClientId, expiresAt",
    });
  }
}

export const shopifyDraftsDb = new ShopifyDraftsDatabase();
```

- **Database name**: `beyo-shopify-drafts` (package-scoped, not shared with any future non-Shopify draft store — avoids the "don't couple to unstable UI internals" and "don't touch unrelated object stores" requirements by construction: this DB has exactly one store).
- **Object store**: `productSyncDrafts`.
- **Primary key**: `taskClientId` (string) — one record per task, overwritten on every Keep.
- **Index**: `expiresAt` (string, ISO) — used by the cleanup sweep's range query.
- **Dexie schema version**: `1`. Bump only when the *store/index structure* changes (e.g., adding a new index) — not for payload shape changes, which are tracked separately by `schemaVersion` inside the record (see below). Document this split explicitly in code comments at the `.version(1)` call, since it's the one non-obvious invariant a future editor could conflate.

### 3. Draft record type and validation

New file `packages/shopify/src/drafts/shopify-product-sync-draft-types.ts`:

```ts
import { z } from "zod";
import { ShopifyProductSyncFormSchema } from "../types";

export const SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION = 1;

export const ShopifyProductSyncDraftRecordSchema = z.object({
  taskClientId: z.string().min(1),
  schemaVersion: z.number().int(),
  values: ShopifyProductSyncFormSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
});
export type ShopifyProductSyncDraftRecord = z.infer<
  typeof ShopifyProductSyncDraftRecordSchema
>;
```

Migration strategy for future payload changes: when `ShopifyProductSyncFormSchema` gains/removes/renames a field, bump `SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION` and add a `migrateDraftValues(fromVersion, raw): ShopifyProductSyncFormValues | null` function in the same file; the repository's read path calls it before validating against the current `ShopifyProductSyncFormSchema` when `record.schemaVersion !== CURRENT`. For v1 there is nothing to migrate from — the seam is documented but not implemented until a v2 payload shape exists (no speculative code).

### 4. Repository

New file `packages/shopify/src/drafts/shopify-product-sync-draft-repository.ts`. Mirrors the defensive style already established in this package's `lib/shopify-product-sync-storage.ts` (safeParse, swallow errors, never throw into a render path), adapted to Dexie's async API:

```ts
import { shopifyDraftsDb } from "./shopify-product-sync-draft-db";
import {
  ShopifyProductSyncDraftRecordSchema,
  SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
  type ShopifyProductSyncDraftRecord,
} from "./shopify-product-sync-draft-types";
import type { ShopifyProductSyncFormValues } from "../types";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type ShopifyProductSyncDraftErrorKind =
  | "unavailable"
  | "quota_exceeded"
  | "serialization_failed"
  | "unknown";

export class ShopifyProductSyncDraftError extends Error {
  constructor(
    public readonly kind: ShopifyProductSyncDraftErrorKind,
    message: string,
  ) {
    super(message);
  }
}

function classifyError(error: unknown): ShopifyProductSyncDraftError {
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError")
      return new ShopifyProductSyncDraftError("quota_exceeded", "Storage is full.");
    return new ShopifyProductSyncDraftError("unavailable", "Local storage is unavailable.");
  }
  return new ShopifyProductSyncDraftError(
    "unknown",
    error instanceof Error ? error.message : "Unknown storage error.",
  );
}

export async function getShopifyProductSyncDraft(
  taskClientId: string,
): Promise<ShopifyProductSyncFormValues | null> {
  if (!taskClientId) return null;
  try {
    const record = await shopifyDraftsDb.productSyncDrafts.get(taskClientId);
    if (!record) return null;
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
      return null;
    }
    if (record.schemaVersion !== SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION) {
      // No migration path implemented yet for a version bump — treat as unusable.
      await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
      return null;
    }
    const parsed = ShopifyProductSyncDraftRecordSchema.safeParse(record);
    if (!parsed.success) {
      await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
      return null;
    }
    return parsed.data.values;
  } catch {
    // Restoration failures are swallowed by design — the caller falls back
    // to a normal empty form. Never throw into a render path.
    return null;
  }
}

export async function saveShopifyProductSyncDraft(input: {
  taskClientId: string;
  values: ShopifyProductSyncFormValues;
}): Promise<void> {
  if (!input.taskClientId) return;
  try {
    const existing = await shopifyDraftsDb.productSyncDrafts.get(input.taskClientId);
    const now = new Date();
    const record: ShopifyProductSyncDraftRecord = {
      taskClientId: input.taskClientId,
      schemaVersion: SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
      values: input.values,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + DRAFT_TTL_MS).toISOString(),
    };
    await shopifyDraftsDb.productSyncDrafts.put(record);
    await deleteExpiredShopifyProductSyncDrafts().catch(() => {});
  } catch (error) {
    throw classifyError(error);
  }
}

export async function deleteShopifyProductSyncDraft(
  taskClientId: string,
): Promise<void> {
  if (!taskClientId) return;
  await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
}

export async function deleteExpiredShopifyProductSyncDrafts(
  now: Date = new Date(),
): Promise<number> {
  try {
    const nowIso = now.toISOString();
    const expiredKeys = await shopifyDraftsDb.productSyncDrafts
      .where("expiresAt")
      .below(nowIso)
      .primaryKeys();
    if (!expiredKeys.length) return 0;
    await shopifyDraftsDb.productSyncDrafts.bulkDelete(expiredKeys);
    return expiredKeys.length;
  } catch {
    return 0;
  }
}
```

Notes:
- `saveShopifyProductSyncDraft` throws a typed `ShopifyProductSyncDraftError` on failure (caller — the hook — turns this into UI-safe state); `getShopifyProductSyncDraft` and `deleteExpiredShopifyProductSyncDrafts` never throw (restoration/cleanup failures are always non-fatal, per the intention's error-handling section).
- Cleanup runs both inside `saveShopifyProductSyncDraft` (after every write) and separately from the hook on form open (see below) — satisfying "every time a draft is stored" and "every time the form opens."
- Only this one object store exists in this Dexie database, so "cleanup must not affect unrelated IndexedDB records" is satisfied structurally, not by a runtime filter.

### 5. Hook

New file `packages/shopify/src/hooks/use-shopify-product-sync-draft.ts`:

```ts
export function useShopifyProductSyncDraft(taskClientId: string) {
  const [isRestoring, setIsRestoring] = useState(Boolean(taskClientId));
  const [restoredValues, setRestoredValues] =
    useState<ShopifyProductSyncFormValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!taskClientId) {
      setIsRestoring(false);
      return;
    }
    setIsRestoring(true);
    (async () => {
      await deleteExpiredShopifyProductSyncDrafts().catch(() => {});
      const values = await getShopifyProductSyncDraft(taskClientId);
      if (!cancelled) {
        setRestoredValues(values);
        setIsRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskClientId]);

  const save = useCallback(
    async (values: ShopifyProductSyncFormValues) => {
      setIsSaving(true);
      setSaveError(null);
      try {
        await saveShopifyProductSyncDraft({ taskClientId, values });
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Could not save draft.",
        );
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [taskClientId],
  );

  const discard = useCallback(
    () => deleteShopifyProductSyncDraft(taskClientId),
    [taskClientId],
  );

  return { isRestoring, restoredValues, isSaving, saveError, save, discard };
}
```

This hook is the sole thing `ShopifyProductSyncForm` imports from `drafts/` — it never calls Dexie directly, satisfying "keep IndexedDB logic outside the form component."

### 6. Form wiring (`ShopifyProductSyncForm.tsx`)

- `const draft = useShopifyProductSyncDraft(ctx.taskClientId);`
- Restore effect, guarding against clobbering user edits and against restoring twice:
  ```ts
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (draft.isRestoring || !draft.restoredValues) return;
    if (form.formState.isDirty) return; // user already started editing
    hasRestoredRef.current = true;
    form.reset({ ...form.getValues(), ...draft.restoredValues });
    notify.info("Restored", "Saved Shopify product form restored.");
  }, [draft.isRestoring, draft.restoredValues]);
  ```
  The staged form renders immediately with defaults; no loading gate is introduced (smallest reliable behavior, per the intention). `{ ...form.getValues(), ...draft.restoredValues }` merges the restored payload over current defaults so any field absent from an older-but-compatible draft still falls back to the default rather than `undefined`.
- `handleKeep`, invoked instead of `form.handleSubmit(handleSubmit)()` when `ctx.mode === "keep"`:
  ```ts
  async function handleKeep(): Promise<void> {
    try {
      await draft.save(form.getValues());
      notify.success("Kept", "Shopify product form kept for later.");
      ctx.onKept?.();
    } catch {
      form.setError("root", {
        type: "server",
        message: "Could not keep this form. Please try again.",
      });
    }
  }
  ```
  Note `form.getValues()`, not `form.handleSubmit(...)` — bypasses the zod resolver entirely so an incomplete form can always be kept (resolves clarification #9).
- `useStagedForm`'s `onSubmit` becomes mode-branching:
  ```ts
  onSubmit: () => (ctx.mode === "keep" ? handleKeep() : form.handleSubmit(handleSubmit)()),
  ```
- `isAdvancing` becomes:
  ```ts
  const isAdvancing = ctx.mode === "keep" ? draft.isSaving : mutation.isPending;
  ```
- `submitLabel` becomes:
  ```ts
  submitLabel={
    ctx.mode === "keep"
      ? "Keep"
      : isFormFilled(values)
        ? "Sync"
        : "Skip"
  }
  ```
- Inside the existing submit success path, delete the draft **before** calling `ctx.onCompleted?.()` (per clarification #7 — the slide page closes synchronously inside that callback):
  ```ts
  try {
    await mutation.mutateAsync(result.payload);
    await draft.discard().catch(() => {});
    ctx.onCompleted?.();
  } catch (error) { /* unchanged — draft is left intact on failure */ }
  ```

### 7. Deletion lifecycle summary

| Event | Draft deleted? |
|---|---|
| Successful `"submit"` mutation for this task | Yes — awaited before `onCompleted` |
| Failed `"submit"` mutation | No |
| Form blocked (validation) before submit | No |
| `onSkipped` fires | No (resolved clarification #6 — not a discard signal) |
| Component unmounts | No |
| Navigating staged-form steps | No |
| Record expires (24h) | Yes — swept on next save or open |
| Successful `"keep"` | No (a Keep *creates/refreshes* the draft, it never deletes it) |

### 8. Trigger entry point — `TaskStepActionsSheetPage` "Fill shopify sync" button

This is the only place a worker can reach `"keep"` mode. The existing task-completion flow (`use-task-step-detail.controller.ts:405-409`) keeps opening the surface in default `"submit"` mode, unchanged — this button is a separate, any-time, ad-hoc entry point for jotting down partial Shopify info without completing the step.

**`apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`** — expand `TaskStepActionsSheetSurfaceProps`:
```ts
export type TaskStepActionsSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  itemId?: string | null;
  itemArticleNumber?: string | null;   // NEW
  itemSku?: string | null;             // NEW
  itemCategoryId?: string | null;      // NEW
  allowsShopifyProductModifications: boolean; // NEW — required, no silent default
};
```
`productCategory`/`defaultTitle` are deliberately **not** added here — both are optional on `ShopifyProductSyncSlideSurfaceProps` and unused by `"keep"` mode (it bypasses `resolveShopifyProductSyncSubmit`, the only place that reads `productCategory`), so there is nothing to prefill for this entry point (resolved in Scope's "Out of scope").

**`use-task-step-detail.controller.ts`** — `handleOpenActionsSheet` (currently line 578-584) gains the new fields, all already in scope (`step.item`, and `allowsShopifyProductModifications` already computed at line 206-208 for the unrelated post-completion Shopify-open call):
```ts
const handleOpenActionsSheet = useCallback(() => {
  openSurface(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
    stepId: resolvedStepId,
    taskId: resolvedTaskId,
    itemId: step?.item?.client_id ?? null,
    itemArticleNumber: step?.item?.article_number ?? null,
    itemSku: step?.item?.sku ?? null,
    itemCategoryId: step?.item?.item_category_id ?? null,
    allowsShopifyProductModifications,
  } as TaskStepActionsSheetSurfaceProps);
}, [
  openSurface,
  resolvedStepId,
  resolvedTaskId,
  step?.item,
  allowsShopifyProductModifications,
]);
```

**`use-working-section-steps.controller.ts`** — `handleOpenTaskActions` (currently line 366-376) needs the same fields, but this controller has never computed `allowsShopifyProductModifications` before. Add the identical one-line derivation already proven in the sibling controller (resolved clarification #13), keyed by this controller's own `sectionId`, plus a lookup of the matching step's item from `rawSteps`:
```ts
import type { WorkerWorkingSection } from "../../working_sections/types";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
// ...
const allowsShopifyProductModifications = useMemo(() => {
  const cached = queryClient.getQueryData<WorkerWorkingSection[]>(
    workerWorkingSectionKeys.mine(),
  );
  return (
    cached?.find((section) => section.client_id === sectionId)
      ?.allows_shopify_product_modifications ?? false
  );
}, [queryClient, sectionId]);

const handleOpenTaskActions = useCallback(
  (stepId: TaskStepId, taskId: TaskId, itemId: string | null) => {
    preloadPinNotificationsSlideSurface();
    const item = rawSteps.find((s) => s.client_id === stepId)?.item ?? null;
    openSurface(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
      stepId,
      taskId,
      itemId,
      itemArticleNumber: item?.article_number ?? null,
      itemSku: item?.sku ?? null,
      itemCategoryId: item?.item_category_id ?? null,
      allowsShopifyProductModifications,
    } as TaskStepActionsSheetSurfaceProps);
  },
  [openSurface, rawSteps, allowsShopifyProductModifications],
);
```
`rawSteps` already carries `item: ItemSnapshotSchema` (`article_number`, `sku`, `item_category_id` all present — confirmed at `packages/.../task_steps/types.ts:105-108,176`, the same `TaskStep` shape both controllers consume), so this needs no new query.

**`TaskStepActionsSheetPage.tsx`** — new button and open-call:
```tsx
import { useMemo } from "react";
import { ShoppingBag } from "lucide-react"; // or whichever icon convention this file already follows
import {
  SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID,
  SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID,
  type ShopifyProductSyncSlideSurfaceProps,
  type ShopifyProductSyncSurfaceOpeners,
} from "@beyo/shopify";
// ...
const {
  stepId, taskId, itemId,
  itemArticleNumber, itemSku, itemCategoryId,
  allowsShopifyProductModifications,
} = useSurfaceProps<TaskStepActionsSheetSurfaceProps>();

const shopifySurfaceOpeners = useMemo<ShopifyProductSyncSurfaceOpeners>(
  () => ({
    openShopPicker: (props) =>
      surface.open(SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID, props),
  }),
  [surface],
);

function handleOpenShopifySync(): void {
  if (!taskId || !itemId) return;
  surface.open(SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID, {
    itemClientId: itemId,
    itemArticleNumber: itemArticleNumber ?? null,
    itemSku: itemSku ?? null,
    itemCategoryId: itemCategoryId ?? null,
    productCategory: null,
    defaultTitle: null,
    taskClientId: taskId,
    mode: "keep",
    surfaceOpeners: shopifySurfaceOpeners,
  } satisfies ShopifyProductSyncSlideSurfaceProps);
}
```
```tsx
{allowsShopifyProductModifications && itemId ? (
  <button
    type="button"
    className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
    data-testid="task-step-actions-fill-shopify-sync"
    onClick={handleOpenShopifySync}
  >
    <ShoppingBag className="size-4" />
    Fill shopify sync
  </button>
) : null}
```
Placement/styling copies the two existing buttons in this file verbatim (same className, same `data-testid` naming convention, `surface.open(...)` called the same way the "Re-assign section"/"Pin notifications" buttons already do — no manual close of this sheet first, matching existing behavior). The button is gated on `itemId` as well as the flag, since Shopify sync only applies to a step that has an item — mirroring the existing `step?.item` guard at `use-task-step-detail.controller.ts:405`.

## Implementation plan

1. Add `dexie` to `packages/shopify/package.json` dependencies and `fake-indexeddb` to devDependencies; run install.
2. Add `ShopifyProductSyncFormMode` to `packages/shopify/src/types.ts`.
3. Create `packages/shopify/src/drafts/shopify-product-sync-draft-types.ts` (schema + `SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION`).
4. Create `packages/shopify/src/drafts/shopify-product-sync-draft-db.ts` (Dexie class + singleton instance).
5. Create `packages/shopify/src/drafts/shopify-product-sync-draft-repository.ts` (get/save/delete/deleteExpired + `ShopifyProductSyncDraftError`).
6. Create `packages/shopify/src/hooks/use-shopify-product-sync-draft.ts`.
7. Update `packages/shopify/src/surface-ids.ts`: add `taskClientId`, `mode?`, `onKept?` to `ShopifyProductSyncSlideSurfaceProps`.
8. Update `packages/shopify/src/providers/ShopifyProductSyncFormProvider.tsx`: extend `Value` with `mode`, `taskClientId`, `onKept?`.
9. Update `packages/shopify/src/pages/ShopifyProductSyncSlidePage.tsx`: resolve `mode` default, pass `taskClientId`, wrap `onKept` through `closeAndContinue` like the existing callbacks.
10. Update `packages/shopify/src/components/ShopifyProductSyncForm.tsx`: wire `useShopifyProductSyncDraft`, restore effect, `handleKeep`, mode-branching `onSubmit`/`isAdvancing`/`submitLabel`, delete-before-`onCompleted` in the submit success path.
11. Update `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts:407` to pass `taskClientId: resolvedTaskId`.
12. Update `packages/shopify/src/index.ts` to export `ShopifyProductSyncFormMode` (type-only) alongside the existing `ShopifyProductSyncFormValues` export, since it is now part of the package's public surface-prop contract.
13. Write repository tests (`packages/shopify/src/drafts/shopify-product-sync-draft-repository.test.ts`) using `fake-indexeddb` (see Tests below).
14. Write hook tests (`packages/shopify/src/hooks/use-shopify-product-sync-draft.test.ts`).
15. Update/extend `ShopifyProductSyncForm` tests (create `packages/shopify/src/components/ShopifyProductSyncForm.test.tsx` if one does not already exist covering this component directly — confirm by checking the directory before writing; if only `ShopifyProductSyncSlidePage.test.tsx` exists today, this is a new file).
16. Write one integration test file (`packages/shopify/src/drafts/shopify-product-sync-draft.integration.test.tsx` or similar) covering the multi-task and expiration scenarios end-to-end through the hook + repository.
17. Update `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`: expand `TaskStepActionsSheetSurfaceProps` per Design §8.
18. Update `use-task-step-detail.controller.ts`'s `handleOpenActionsSheet` (line 578-584) with the new fields, reusing the already-computed `allowsShopifyProductModifications`.
19. Update `use-working-section-steps.controller.ts`: add the `allowsShopifyProductModifications` cache-lookup derivation, and expand `handleOpenTaskActions` with the item-detail fields and the flag.
20. Update `TaskStepActionsSheetPage.tsx`: read the new surface props, build `shopifySurfaceOpeners`, add `handleOpenShopifySync`, render the "Fill shopify sync" button gated on `allowsShopifyProductModifications && itemId`.
21. Write/extend `TaskStepActionsSheetPage` tests covering button visibility and the `openSurface` call shape (see Tests below); check for and extend an existing test file if one already covers this page, otherwise create one following the mocking conventions already used in `ShopifyProductSyncSlidePage.test.tsx`.
22. Run `npm run typecheck`, `npm run test -- --grep shopify`, and `npm run test -- --grep task-step-actions` (or the equivalent scoped grep for `workers-app`) to confirm no regressions in existing Shopify tests (`shopify-keys.test.ts`, `resolve-shopify-product-sync-submit.test.ts`, `ShopifyIntegrationsSlidePage.test.tsx`, `ShopifyProductSyncSlidePage.test.tsx`, `ShopifyShopActionsSheetPage.test.tsx`) or existing `workers-app` task-step tests.

## Tests

### Repository tests (`fake-indexeddb`)

- Saves a draft using `taskClientId`; reads it back and gets the exact `values` back.
- Updates an existing draft for the same task (second `save` overwrites `values`/`updatedAt`, preserves original `createdAt`).
- Does not mix drafts belonging to different tasks (`save` for task A does not affect `get` for task B).
- `deleteShopifyProductSyncDraft` removes only the targeted task's record.
- `deleteExpiredShopifyProductSyncDrafts` removes records with `expiresAt` in the past and retains records with `expiresAt` in the future.
- A `save` refreshes `expiresAt` to `now + 24h`, extending a previously-close-to-expiring draft.
- `get` on a malformed record (fails `ShopifyProductSyncDraftRecordSchema.safeParse`) returns `null` and deletes the bad record, without throwing.
- `get`/`save`/`deleteExpired` on a simulated Dexie/IndexedDB throw resolve gracefully (`get`/`deleteExpired` return `null`/`0`; `save` rejects with a typed `ShopifyProductSyncDraftError`).
- Only the `productSyncDrafts` store is touched — trivially true here since the database has exactly one store, but assert the DB's store list to guard against future stores being added carelessly to the same DB.

### Hook tests

- On mount with a `taskClientId` that has no draft: `isRestoring` becomes `false`, `restoredValues` is `null`.
- On mount with an existing draft: `restoredValues` becomes the saved values after the async lookup resolves.
- `save(values)` calls the repository and toggles `isSaving` around the call.
- A failing `save` sets `saveError` and rethrows (so the form's `catch` runs).
- Passing an empty `taskClientId` short-circuits to `isRestoring: false`, `restoredValues: null`, and `save`/`discard` are no-ops.

### Form tests (`ShopifyProductSyncForm.test.tsx`, new)

- Defaults to `"submit"` mode when `ctx.mode` is not provided by the mocked provider context.
- Displays "Sync" or "Skip" per `isFormFilled` in `"submit"` mode (unchanged from today).
- Displays "Keep" when `ctx.mode === "keep"`.
- In `"keep"` mode, activating the final action never calls the mocked `useProcessShopifyProducts` mutation.
- In `"keep"` mode, an incomplete form (no title, no SKU, no shops) still saves successfully.
- The save call uses `ctx.taskClientId` as the draft key (assert via a mocked `saveShopifyProductSyncDraft`).
- A successful Keep calls `ctx.onKept?.()`.
- A failed Keep (mocked repository rejection) keeps the form open, shows a root error, and does not call `ctx.onKept?.()`.
- On mount, a mocked existing draft is restored into the form via `form.reset` (assert a field's rendered value matches the draft, not the default).
- Restoring merges safely with current defaults (a draft missing a field present in current defaults still shows the default for that field).
- An expired mocked draft (repository returns `null` because the hook's lookup already filtered it) is not restored — form shows defaults.
- Simulating the user typing before the mocked async restore resolves: the restore is skipped (form keeps the user's typed value, not the draft's).
- Normal `"submit"` mode behavior is unchanged: `Sync`/`Skip` label, blocked-field navigation, mutation invocation, `onCompleted`/root error handling all still pass as they do today.
- A successful `"submit"` mutation triggers a mocked `deleteShopifyProductSyncDraft` call before `ctx.onCompleted?.()`.
- A failed `"submit"` mutation does not call `deleteShopifyProductSyncDraft`.

### Integration tests

- Open the form for task A (mocked `taskClientId="task_a"`), Keep it, "reopen" (remount) for task A: values restore.
- Open for task B: task A's draft is not restored (task B's form shows defaults).
- Save a draft, advance fake time past 24 hours, reopen: draft is not restored and is removed from the store.
- Save a draft including `metafields` entries, reopen: metafield values restore correctly (exercises the structured-clone-compatible plain-string shape end to end).

### `TaskStepActionsSheetPage` tests

- Renders "Fill shopify sync" when `allowsShopifyProductModifications: true` and `itemId` is present.
- Does not render the button when `allowsShopifyProductModifications: false`, even with an `itemId` present.
- Does not render the button when `itemId` is `null`/absent, even with `allowsShopifyProductModifications: true`.
- Activating the button calls `surface.open(SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID, {...})` with `mode: "keep"`, `taskClientId` equal to the sheet's `taskId`, and `itemClientId` equal to `itemId`.
- The two other existing buttons ("Re-assign section", "Pin notifications") remain unaffected — same rendering, same disabled/`taskId` guard as today.

## Risks and mitigations

- Risk: A restored `shopIntegrationIds` value references a shop integration that has since been disconnected/removed.
  Mitigation: Accepted per resolved clarification #12 — `ShopifyProductSyncShopField`/`useShopifyMetafieldPickerController` already reconcile against live queries for any form value, and `resolveShopifyProductSyncSubmit` still blocks final submission if `shopIntegrationIds` ends up empty or referencing nothing sync-able. No new stale-filtering logic is added; this matches the intention's explicitly-acceptable fallback ("let existing form validation block final submission").
- Risk: `Dexie`/IndexedDB is unavailable (private browsing in some browsers, or a locked-down test environment).
  Mitigation: every repository function catches and degrades gracefully — `get`/`deleteExpired` return empty results, `save` throws a typed error the hook surfaces as `saveError` without crashing the form.
- Risk: The restore effect races with the user typing, restoring over active edits.
  Mitigation: explicit `form.formState.isDirty` guard plus a `hasRestoredRef` to prevent a second restore attempt after the first no-op.
- Risk: Adding a required `taskClientId` to `ShopifyProductSyncSlideSurfaceProps`, and a required `allowsShopifyProductModifications` to `TaskStepActionsSheetSurfaceProps`, are breaking changes to each surface's public prop contract.
  Mitigation: `SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID` has exactly one call site in the monorepo (`use-task-step-detail.controller.ts:407`); `TASK_STEP_ACTIONS_SHEET_SURFACE_ID` has exactly two (`use-task-step-detail.controller.ts:579`, `use-working-section-steps.controller.ts:369`) — both confirmed by repo-wide grep for each surface ID. All are updated in this same plan (steps 11, 18, 19), so nothing is left broken.
- Risk: `dexie` adds bundle weight to a package that previously had no client-side storage dependency.
  Mitigation: Dexie is small (~25 KB min+gzip) and lazily reached only through the already-lazy-loaded `ShopifyProductSyncSlidePage` (`loadShopifyProductSyncSlidePage`), so it does not affect any other page's initial bundle.
- Risk: `use-working-section-steps.controller.ts`'s new `allowsShopifyProductModifications` cache lookup silently returns `false` (button never renders) if `workerWorkingSectionKeys.mine()` hasn't been populated in the query cache yet by the time the actions sheet opens from the list view.
  Mitigation: this is the exact same trade-off the sibling controller already accepts for its own post-completion Shopify-open call (`use-task-step-detail.controller.ts:206-208`); the list view that hosts this controller is itself reached only after `useWorkingSectionsHomeContext()`'s working-sections list query has already populated that same cache key, so in practice it is warm by the time a step in a section can be tapped.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `packages/shopify` and `apps/workers-app`.
- `npm run test -- --grep shopify`: all new repository/hook/form/integration tests pass; all pre-existing Shopify package tests (`shopify-keys.test.ts`, `resolve-shopify-product-sync-submit.test.ts`, `ShopifyIntegrationsSlidePage.test.tsx`, `ShopifyProductSyncSlidePage.test.tsx`, `ShopifyShopActionsSheetPage.test.tsx`, metafield lib tests) continue to pass unmodified.
- `npm run test` (scoped to `apps/workers-app`): new `TaskStepActionsSheetPage` tests pass; existing tests for `use-task-step-detail.controller.ts` and `use-working-section-steps.controller.ts` continue to pass unmodified.
- `npx playwright test --grep "shopify product sync" --project=mobile`: a worker in a section with `allows_shopify_product_modifications: true` opens a step's actions sheet, taps "Fill shopify sync", fills partial data, taps Keep, closes and reopens the same step's actions sheet, taps "Fill shopify sync" again, and sees the partial data restored. A worker in a section without that flag never sees the button.
- `npx playwright test --grep "shopify product sync" --project=desktop`: same scenario as above.

## Review log

- `2026-07-14` `Claude`: Initial draft plan produced from user-provided intention spec after full codebase inspection; all twelve clarifications resolved against live source, zero remained open.
- `2026-07-14` `Claude`: Added the "Fill shopify sync" trigger on `TaskStepActionsSheetPage` (Design §8, resolved clarification #13, updated scope/steps/tests/risks) per user follow-up request — `"keep"` mode now has a concrete, reachable entry point instead of being capability-only.

## Lifecycle transition

- Current state: `archived`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_product_sync_keep_mode_20260714.md`
- Archive transition owner: `Codex`
