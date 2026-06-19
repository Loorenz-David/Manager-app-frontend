# PLAN_realtime_05_upholstery_socket_handlers_20260619

## Metadata

- Plan ID: `PLAN_realtime_05_upholstery_socket_handlers_20260619`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T11:25:51Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_realtime_layer_shared_packages_20260619.md`

## Goal and intent

- Goal: Wire upholstery real-time events into the managers and workers apps — add 8 new events to `ServerToClientEvents`, add `item:upholstery-*` handlers to the managers items feature, create `upholstery/socket-events.ts` in each app for `upholstery:*` events, and register both slices in each app's registry.
- Business/user intent: When upholstery entities are created, edited, or have their inventory/requirement state changed, every connected user sees the updated data without a manual refresh.
- Non-goals: item-level upholstery handlers in the workers app (workers have no `item-upholstery` feature); push notifications; creating any new API endpoints.

## Scope

- In scope:
  - `packages/realtime/src/lib/socket-types.ts` — add 8 new `ServerToClientEvents` entries.
  - `apps/managers-app/.../features/items/socket-events.ts` — extend with 4 `item:upholstery-*` handlers.
  - `apps/managers-app/.../features/upholstery/socket-events.ts` — create with 4 `upholstery:*` handlers.
  - `apps/managers-app/.../app/socket-registry.ts` — spread `upholsterySocketEvents`.
  - `apps/workers-app/.../features/upholstery/socket-events.ts` — create with 4 `upholstery:*` handlers (workers-scoped keys only).
  - `apps/workers-app/.../app/socket-registry.ts` — spread `upholsterySocketEvents`.
- Out of scope: handler logic beyond targeted query invalidation; new query hooks or API calls; item-upholstery feature in workers.
- Assumptions:
  - `@beyo/realtime`'s `SocketEventHandlers` is a `Partial` map over `ServerToClientEvents` — adding new events to the type is automatically non-breaking for existing handlers.
  - `ItemUpholsteryId` and `UpholsteryInventoryId` branded types exist in `apps/managers-app/.../types/common`.
  - Workers app `upholsteryKeys` uses unbranded `string` for `id` — no cast required in workers handlers.

## Clarifications required

None. All key factory signatures are confirmed from relational reads of the existing key files. Event catalog is authoritative.

## Acceptance criteria

1. `npm run typecheck` passes with zero errors across all packages and both apps after the changes.
2. Every `item:upholstery-*` and `upholstery:*` event name is present in `ServerToClientEvents` in `socket-types.ts`.
3. Managers app `itemSocketEvents` handles all 4 `item:upholstery-*` events using `itemUpholsteryKeys`.
4. Managers app exports `upholsterySocketEvents` from `features/upholstery/socket-events.ts` handling all 4 `upholstery:*` events using `upholsteryKeys` and `upholsteryInventoryKeys`.
5. Workers app exports `upholsterySocketEvents` from `features/upholstery/socket-events.ts` handling all 4 `upholstery:*` events using `upholsteryKeys` (`detail` + `missing`).
6. Both `socket-registry.ts` files include `...upholsterySocketEvents`.
7. No existing handler is modified or removed.

## Contracts and skills

### Contracts loaded

- `architecture/21_realtime.md`: handler pattern, `SocketEventHandlers` type, `refetchType: 'active'` rule.
- `architecture/05_server_state.md`: targeted `invalidateQueries` + `removeQueries` for deletes.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: authoritative event payloads, `client_id` semantics (ItemUpholstery vs Upholstery vs UpholsteryInventory), handler responsibility matrix.

### Local extensions loaded

None required beyond the catalog and realtime contract.

### File read intent — pattern vs. relational

Permitted relational reads (key factory signatures already confirmed — listed for reference only):
- `apps/managers-app/.../features/upholstery/api/upholstery-keys.ts` — `upholsteryKeys`, `upholsteryInventoryKeys`
- `apps/managers-app/.../features/upholstery_requirements/api/upholstery-requirement-keys.ts` — `itemUpholsteryKeys`
- `apps/workers-app/.../features/upholstery/api/upholstery-keys.ts` — `upholsteryKeys`
- `apps/managers-app/.../features/items/socket-events.ts` — existing handler structure to extend

Prohibited (pattern reads — contract covers these):
- Reading another feature's socket-events file to learn the handler shape → use `21_realtime.md` + PLAN_03 summary.

### Skill selection

- Primary skill: `verify` / typecheck.
- Trigger terms: `socket, realtime, upholstery, invalidate`.

## Implementation plan

### Step 1 — Extend `ServerToClientEvents` in `@beyo/realtime`

File: `packages/realtime/src/lib/socket-types.ts`

Add the following entries to the `ServerToClientEvents` type. Insert after the `working_section:deleted` entry and before `notification:new`:

```ts
// --- Item upholsteries (client_id = ItemUpholstery entity) ---
"item:upholstery-created": (payload: { client_id: string }) => void;
"item:upholstery-updated": (payload: { client_id: string }) => void;
"item:upholstery-deleted": (payload: { client_id: string }) => void;
"item:upholstery-requirement-state-changed": (payload: {
  client_id: string;
  new_state: string;
}) => void;

// --- Upholstery entities ---
"upholstery:updated": (payload: { client_id: string }) => void;
"upholstery:deleted": (payload: { client_id: string }) => void;
"upholstery:inventory-updated": (payload: { client_id: string }) => void;
"upholstery:inventory-deleted": (payload: { client_id: string }) => void;
```

Do NOT modify or remove any existing entries. The 8 new entries are purely additive.

---

### Step 2 — Extend managers `features/items/socket-events.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/socket-events.ts`

Add two new imports at the top:

```ts
import type { ItemUpholsteryId } from "@/types/common";
import { itemUpholsteryKeys } from "@/features/upholstery_requirements/api/upholstery-requirement-keys";
```

Append the following 4 handlers to the existing `itemSocketEvents` object (after the current `"item:deleted"` entry — do not change the existing 3 handlers):

```ts
"item:upholstery-created": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.lists(),
    refetchType: "active",
  });
},

"item:upholstery-updated": ({ client_id }, { queryClient }) => {
  const id = client_id as ItemUpholsteryId;

  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.detail(id),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.lists(),
    refetchType: "active",
  });
},

"item:upholstery-deleted": ({ client_id }, { queryClient }) => {
  const id = client_id as ItemUpholsteryId;

  queryClient.removeQueries({ queryKey: itemUpholsteryKeys.detail(id) });
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.lists(),
    refetchType: "active",
  });
},

"item:upholstery-requirement-state-changed": ({ client_id }, { queryClient }) => {
  const id = client_id as ItemUpholsteryId;

  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.detail(id),
    refetchType: "active",
  });
},
```

**Payload note:** `client_id` in all 4 `item:upholstery-*` events refers to the `ItemUpholstery` entity, not the parent item. The payload does not carry the parent item ID. Invalidating `lists()` is therefore the correct approach for `created` (cannot target a specific list) and as a secondary invalidation for `updated`/`deleted`.

---

### Step 3 — Create managers `features/upholstery/socket-events.ts`

Create a new file: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/socket-events.ts`

```ts
import type { SocketEventHandlers } from "@beyo/realtime";
import type { UpholsteryId, UpholsteryInventoryId } from "@/types/common";
import {
  upholsteryInventoryKeys,
  upholsteryKeys,
} from "./api/upholstery-keys";

export const upholsterySocketEvents: SocketEventHandlers = {
  "upholstery:updated": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryId;

    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.detail(id),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.pickerLists(),
      refetchType: "active",
    });
  },

  "upholstery:deleted": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryId;

    queryClient.removeQueries({ queryKey: upholsteryKeys.detail(id) });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.pickerLists(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-updated": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryInventoryId;

    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.detail(id),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.lists(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-deleted": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryInventoryId;

    queryClient.removeQueries({
      queryKey: upholsteryInventoryKeys.detail(id),
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.lists(),
      refetchType: "active",
    });
  },
};
```

**Key semantics:** `upholstery:updated` and `upholstery:deleted` carry the **Upholstery** `client_id`. `upholstery:inventory-updated` and `upholstery:inventory-deleted` carry the **UpholsteryInventory** `client_id`. Both are confirmed in the catalog — do not mix them.

`pickerLists()` is invalidated on upholstery changes because the picker surfaces display upholstery name, code, and image — all of which can change on `upholstery:updated`.

`upholstery:inventory-deleted` also invalidates `upholsteryKeys.lists()` because the upholstery list in the inventory page shows stock status — deleting an inventory record changes what is displayed there.

---

### Step 4 — Update managers `socket-registry.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/app/socket-registry.ts`

Add the import and spread the new slice. The final file must look like:

```ts
import { caseSocketEvents } from "@beyo/cases";
import { notificationSocketEvents } from "@beyo/notifications";
import type { SocketEventHandlers } from "@beyo/realtime";
import { itemSocketEvents } from "@/features/items/socket-events";
import { taskSocketEvents } from "@/features/tasks/socket-events";
import { upholsterySocketEvents } from "@/features/upholstery/socket-events";
import { workingSectionSocketEvents } from "@/features/working-sections/socket-events";

export const socketRegistry: SocketEventHandlers = {
  ...caseSocketEvents,
  ...taskSocketEvents,
  ...itemSocketEvents,
  ...workingSectionSocketEvents,
  ...upholsterySocketEvents,
  ...notificationSocketEvents,
};
```

`upholsterySocketEvents` must be spread before `notificationSocketEvents` (notifications last by convention).

---

### Step 5 — Create workers `features/upholstery/socket-events.ts`

Create a new file: `apps/workers-app/ManagerBeyo-app-workers/src/features/upholstery/socket-events.ts`

```ts
import type { SocketEventHandlers } from "@beyo/realtime";
import { upholsteryKeys } from "./api/upholstery-keys";

export const upholsterySocketEvents: SocketEventHandlers = {
  "upholstery:updated": ({ client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.detail(client_id),
      refetchType: "active",
    });
  },

  "upholstery:deleted": ({ client_id }, { queryClient }) => {
    queryClient.removeQueries({ queryKey: upholsteryKeys.detail(client_id) });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.missing(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.missing(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-deleted": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.missing(),
      refetchType: "active",
    });
  },
};
```

**Workers-specific notes:**
- `upholsteryKeys.detail(client_id)` accepts an unbranded `string` in the workers app — no cast needed.
- `upholsteryKeys.missing()` is invalidated on inventory events because availability changes (threshold crossings, stock depleted) drive the "missing upholstery" surface workers see. The inventory `client_id` is not needed to invalidate this key.
- Workers have no `item-upholstery` feature and therefore do NOT handle any `item:upholstery-*` events — those are managers-only.

---

### Step 6 — Update workers `socket-registry.ts`

File: `apps/workers-app/ManagerBeyo-app-workers/src/app/socket-registry.ts`

Add the import and spread the new slice. The final file must look like:

```ts
import { caseSocketEvents } from "@beyo/cases";
import { notificationSocketEvents } from "@beyo/notifications";
import type { SocketEventHandlers } from "@beyo/realtime";
import { taskStepSocketEvents } from "@/features/task_steps/socket-events";
import { upholsterySocketEvents } from "@/features/upholstery/socket-events";
import { workerWorkingSectionSocketEvents } from "@/features/working_sections/socket-events";

export const socketRegistry: SocketEventHandlers = {
  ...caseSocketEvents,
  ...taskStepSocketEvents,
  ...workerWorkingSectionSocketEvents,
  ...upholsterySocketEvents,
  ...notificationSocketEvents,
};
```

---

### Step 7 — Typecheck

Run from the monorepo root:

```
npm run typecheck
```

Must pass with zero errors across `packages/realtime`, `apps/managers-app`, and `apps/workers-app`. The additive changes to `ServerToClientEvents` must not break any existing handler type.

## Risks and mitigations

- Risk: `UpholsteryInventoryId` does not exist in `apps/managers-app/.../types/common` (not confirmed at read time — the file was not read, only the key file was).
  Mitigation: If the branded type is missing, use `string` as a fallback and note it in the summary. Do not create the type — check `types/common.ts` for existing types before the cast.

- Risk: `upholstery:inventory-deleted` also needing to invalidate `upholsteryInventoryKeys.lists()` while simultaneously removing the detail could leave a stale reference if the list re-fetches before the remove completes.
  Mitigation: `removeQueries` is synchronous and runs before `invalidateQueries` enqueues the refetch. Order is safe in TanStack Query.

- Risk: Workers `upholsteryKeys.detail(client_id)` — `client_id` is a raw string from the socket payload. In the workers key file, `detail(id: string)` accepts any string, so no runtime risk. TypeScript will not complain.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual smoke test: trigger an upholstery update from the backend, open the debug panel in both apps, confirm `upholstery:updated` appears in the log with the correct `invalidated` keys.

## Review log

- `2026-06-19` author: initial draft.
- `2026-06-19` implementer: Codex completed handler wiring, root typecheck, summary, and archive preparation.

## Lifecycle transition

- Current state: `archived`
- Next state: `n/a`
- Transition owner: `Codex`
