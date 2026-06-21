# PLAN_push_notification_deep_link_managers_20260621

## Metadata

- Plan ID: `PLAN_push_notification_deep_link_managers_20260621`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-21T00:00:00Z`
- Last updated at (UTC): `2026-06-21T16:54:23Z`
- Related issue/ticket: `-`
- Intention plan: `-`
- Handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_push_notification_deep_link_20260621.md`

## Goal and intent

- Goal: When a user taps a VAPID push notification, the correct app surface or page opens for the notified entity. The current scope covers managers app Phases 1–4 and adds worker app phases for `task_step`, `case`, and temporary upholstery fallback.
- Business/user intent: Managers and workers must be able to act on relevant step, case, and upholstery notifications immediately without having to locate the entity manually after the app opens.
- Non-goals: In-app notification list navigation, a dedicated manager `item_upholstery` detail deep link, and worker `entity_type: "task"` deep linking in this iteration.

## Scope

- In scope (Phase 1 — `entity_type: "task"` in managers app):
  - Update `PushPayloadData` type to allow `entity_type: string | null` and `entity_client_id: string | null` (backend confirmed both can be null for bulk events)
  - Update managers-app `sw.ts`: encode `notif_type`, `notif_id`, and `notif_cid` as URL search params in the resolved navigation URL
  - Create `NotificationDeepLinkMount.tsx` in managers app: null-returning component that reads the URL params, opens the correct surface, marks the notification read, then cleans the URL
  - Wire `NotificationDeepLinkMount` into `RootRoute.tsx` alongside the existing `PushMount`
- In scope (Phase 2 — `entity_type: "case"` in managers app):
  - Extend `sw.ts` `resolveRoute` with a `"case"` case encoding the same URL params
  - Extend `NotificationDeepLinkMount` with a `"case"` branch that navigates directly to the existing `CaseConversationPage` route (`/cases/:caseId`) — no surface open needed, no separate URL cleanup (navigation away from the params URL implicitly clears them)
- In scope (Phase 3 — `entity_type: "task_step"` in managers app):
  - Add `task_client_id: string | null` to `PushPayloadData` type — new field sent by backend for all push events; populated only for `task_step` events
  - Extend `sw.ts` `resolveRoute` to accept `task_client_id` as a fourth parameter; `"task_step"` case uses it to build the same URL params as `"task"` (landing base path `/tasks`, `notif_id` = `task_client_id`)
  - Extend `NotificationDeepLinkMount` — `"task_step"` falls through to the same surface-open logic as `"task"`: clean params in place, open `TaskDetailSlidePage` with `taskId = notif_id`; no extra fetch required because `task_client_id` is already in the payload
- In scope (Phase 4 — upholstery fallback in managers app):
  - Extend `sw.ts` `resolveRoute` so `entity_type: "item_upholstery"` opens the existing manager upholstery inventory page at `/upholstery-inventory`
  - Treat bulk upholstery events (`entity_type: null`) the same way for now: route to `/upholstery-inventory`
  - Document explicitly that this is a temporary fallback while a dedicated item-upholstery deep link target is still undefined on the manager side
- In scope (Phase W1 — `entity_type: "task_step"` in workers app):
  - Extend workers-app `sw.ts` so `task_step` notifications encode the task-step ID (`entity_client_id`) plus the parent task ID (`task_client_id`) into the navigation URL
  - Create a workers-app `NotificationDeepLinkMount.tsx` that resolves the missing `workingSectionId` before opening `TASK_STEP_DETAIL_SURFACE_ID`
  - Use the existing worker APIs (`fetchWorkerWorkingSections` + `fetchWorkingSectionSteps`) to locate which assigned working section currently contains the pushed step ID; then open `TaskDetailSlidePage` with `stepId`, `taskId`, and `workingSectionId`
- In scope (Phase W2 — `entity_type: "case"` in workers app):
  - Extend workers-app `sw.ts` with a `"case"` branch that routes to `/cases?notif_type=case&notif_id=<caseId>&notif_cid=<notificationId>`
  - Extend workers-app `NotificationDeepLinkMount` with a `"case"` branch that navigates to the existing worker `CaseConversationPage` route (`/cases/:caseId`)
- In scope (Phase W3 — upholstery fallback in workers app):
  - For `entity_type: "item_upholstery"` and bulk upholstery events (`entity_type: null`), default to the worker home page (`/`) for now
  - Document explicitly that workers do not yet have a dedicated upholstery target, so home is the temporary fallback
- Out of scope:
  - A dedicated `item_upholstery` detail surface or inventory-detail deep link
  - Worker `entity_type: "task"` deep linking
  - In-app notification center navigation (separate concern)
- Assumptions:
  - `useSurfaceStore.getState().open(...)` is callable outside a hook (confirmed — used this way in `use-tasks-view.controller.ts`)
  - `useMarkNotificationsRead` is callable from a null-returning React component (confirmed — it is a standard hook)
  - `buildCaseConversationRoute` from `@/lib/routes` is importable in `NotificationDeepLinkMount` (confirmed — it is an exported helper)
  - `task_client_id` is `null` for all non-`task_step` events — the type and code guard for this explicitly
  - `ROUTES.upholsteryInventory` already exists in the managers app and is the intended temporary fallback target for both `item_upholstery` and bulk upholstery notifications
  - The worker `TaskDetailSlidePage` surface currently requires `stepId`, `taskId`, and `workingSectionId`; because push payloads do not include `working_section_id`, the worker app must resolve it after boot using existing worker-section APIs
  - The worker app already has `/cases/:caseId` and `TASK_STEP_DETAIL_SURFACE_ID`, so no new worker destination surfaces/routes are required

## Clarifications required

- Worker `task_step` deep linking depends on resolving `workingSectionId` client-side after boot because the push payload does not include it. This is acceptable for the current plan because the worker app already has APIs to enumerate assigned sections and fetch their steps.

## Acceptance criteria

**Phase 1 — task**

1. Tapping a `entity_type: "task"` push notification when the app is **closed** opens the app at `/tasks` and immediately slides in the `TaskDetailSlidePage` for the correct `task_id`.
2. Tapping a `entity_type: "task"` push notification when the app is **already open** (background or foreground) navigates to `/tasks`, slides in `TaskDetailSlidePage` for the correct `task_id`, and does NOT reload the page.
3. After the surface opens, the notification is marked read and the unread count badge decrements.
4. The URL search params (`notif_type`, `notif_id`, `notif_cid`) are removed from the URL after the deep link fires — the user never sees them in the address bar.

**Phase 2 — case**

5. Tapping a `entity_type: "case"` push notification when the app is **closed** opens the app directly at `/cases/<caseId>` (the `CaseConversationPage`) for the correct case.
6. Tapping a `entity_type: "case"` push notification when the app is **already open** navigates to `/cases/<caseId>` without a page reload.
7. After navigation, the notification is marked read and the unread count badge decrements.
8. The final URL is `/cases/<caseId>` — no `notif_*` params remain.

**Phase 3 — task_step**

9. Tapping a `entity_type: "task_step"` push notification when the app is **closed** opens the app at `/tasks` and immediately slides in `TaskDetailSlidePage` for the parent task (`task_client_id` from the payload).
10. Tapping a `entity_type: "task_step"` push notification when the app is **already open** navigates to `/tasks`, slides in `TaskDetailSlidePage` for the parent task, and does NOT reload the page.
11. After the surface opens, the notification is marked read and the unread count badge decrements.
12. The final URL is `/tasks` — no `notif_*` params remain.

**Phase 4 — upholstery fallback**

13. Tapping a `entity_type: "item_upholstery"` push notification when the app is closed opens the app at `/upholstery-inventory`.
14. Tapping a bulk upholstery push notification (`entity_type: null`) when the app is closed opens the app at `/upholstery-inventory`.
15. Tapping either upholstery notification type when the app is already open navigates to `/upholstery-inventory` without a page reload.
16. After navigation, the notification is marked read and the unread count badge decrements.
17. The final URL is `/upholstery-inventory` — no `notif_*` params remain.

**All phases**

18. If `notif_type` is unrecognised or params are absent, no surface is opened, no navigation occurs, and no error is thrown.
19. TypeScript reports zero errors after changes.

**Worker Phase W1 — task_step**

20. Tapping a `entity_type: "task_step"` push notification when the worker app is closed opens the app, resolves the pushed step’s assigned `workingSectionId`, then opens the worker `TaskDetailSlidePage` for that exact step.
21. Tapping a `entity_type: "task_step"` push notification when the worker app is already open resolves the step context and opens the worker `TaskDetailSlidePage` without a full page reload.
22. The worker deep link uses the pushed task-step ID (`entity_client_id`) as the detail target and the pushed `task_client_id` as the parent task ID.
23. After the surface opens, the notification is marked read and the unread count badge decrements.

**Worker Phase W2 — case**

24. Tapping a `entity_type: "case"` push notification opens `/cases/<caseId>` in the worker app, both from a closed and already-open state.
25. After navigation, the notification is marked read and the unread count badge decrements.

**Worker Phase W3 — upholstery fallback**

26. Tapping a worker `entity_type: "item_upholstery"` or bulk upholstery (`entity_type: null`) push notification opens the worker home page (`/`) for now.
27. After navigation, the notification is marked read and the unread count badge decrements.

## Architecture — the two-channel problem

The service worker runs in a separate thread. It cannot call `useSurfaceStore` directly. When the user taps a notification the SW must bridge the intent to the React app through a shared channel that survives both warm (app already open) and cold (app was closed) starts.

**Chosen channel: URL search params (single channel for both warm and cold start)**

| Case | SW action | App action |
|---|---|---|
| App closed | `self.clients.openWindow(url)` where url carries params | App boots, `NotificationDeepLinkMount` reads params on first render, opens surface, marks read, cleans URL |
| App already open | `existing.focus()` + `existing.navigate(url)` where url carries params | React Router receives the location change, `NotificationDeepLinkMount` `useEffect` fires on `location.search` change, opens surface, marks read, cleans URL |

This is preferred over a `postMessage` channel because `postMessage` fired immediately after `openWindow` arrives before React has mounted its listener (race condition for cold starts). The URL is always readable after mount regardless of startup timing.

**URL param contract (internal — SW to React)**

| Param | Value | Description |
|---|---|---|
| `notif_type` | `entity_type` from payload; for bulk upholstery fallback use `"upholstery"` | Routing discriminant |
| `notif_id` | Primary navigation-target ID. In managers `task_step` this is `task_client_id`; in workers `task_step` this is the pushed step ID (`entity_client_id`); for most other entity types this is `entity_client_id` | ID used to open the correct surface or route |
| `notif_task_id` | `task_client_id` for worker `task_step` events only | Parent task ID needed by worker `TaskDetailSlidePage` |
| `notif_cid` | `notification_client_id` from payload | Used to mark the notification read |

## Extensibility pattern

Every future phase follows the same three-step extension:

1. **`sw.ts`**: add a `case` to `resolveRoute` returning the correct base path with params.
2. **`NotificationDeepLinkMount`**: add a `case` to the `switch (notifType)` block opening the correct surface or navigating to the correct route.
3. **Phase notes**: document which app (`managers` vs `workers`), which surface or route, and any temporary fallback behavior. Managers `task_step` no longer needs a fetch because `task_client_id` is now part of the payload; workers still need a section-resolution fetch because the worker detail surface also requires `workingSectionId`.

**Two sub-patterns inside this strategy:**

| Sub-pattern | When to use | SW route | Mount action |
|---|---|---|---|
| **Surface open** | Target is not addressable by URL (slide/sheet) | `/base-path?notif_type=X&notif_id=Y&notif_cid=Z` | Clean params in place → `useSurfaceStore.getState().open(...)` |
| **Route navigate** | Target has a real URL route | `/base-path?notif_type=X&notif_id=Y&notif_cid=Z` | `navigate(buildRoute(notifId), { replace: true })` — cleanup implicit |

Phase status:
- ✅ Phase 1: `entity_type: "task"` → managers app — surface open (`TaskDetailSlidePage`)
- ✅ Phase 2: `entity_type: "case"` → managers app — route navigate (`CaseConversationPage` at `/cases/:caseId`)
- ✅ Phase 3: `entity_type: "task_step"` → managers app — surface open (`TaskDetailSlidePage` via `task_client_id`); falls through to same logic as Phase 1
- ✅ Phase 4: `entity_type: "item_upholstery"` and `entity_type: null` (bulk upholstery) → managers app — temporary route navigate to `/upholstery-inventory`
- ✅ Phase W1: `entity_type: "task_step"` → workers app — surface open (`TASK_STEP_DETAIL_SURFACE_ID`) after resolving `workingSectionId` from the worker’s assigned sections
- ✅ Phase W2: `entity_type: "case"` → workers app — route navigate (`CaseConversationPage` at `/cases/:caseId`)
- ✅ Phase W3: `entity_type: "item_upholstery"` and `entity_type: null` (bulk upholstery) → workers app — temporary route navigate to `/`

## Implementation plan

### Step 1 — Update `PushPayloadData` type

File: `packages/notifications/src/push/push-payload-types.ts`

Change `entity_type` and `entity_client_id` from `string` to `string | null` (bulk events send `null` for both). Add `task_client_id: string | null` — always present in the payload, populated only for `task_step` events, `null` for all others.

```ts
export type PushPayloadData = {
  notification_client_id: string;
  entity_type: string | null;
  entity_client_id: string | null;
  task_client_id: string | null;
};
```

No other changes to this file.

---

### Step 2 — Update managers-app `sw.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/sw.ts`

Replace the current `resolveRoute` signature and its call-site. A fourth parameter `taskClientId` carries the parent task ID for `task_step` events — the `"task_step"` case uses it as `notif_id` so `NotificationDeepLinkMount` can open the task detail directly.

```ts
function resolveRoute(
  entityType: string | null | undefined,
  entityClientId: string | null | undefined,
  notificationClientId: string | null | undefined,
  taskClientId: string | null | undefined,
): string {
  const cid = notificationClientId ?? "";

  switch (entityType) {
    case "task":
      return entityClientId
        ? `/tasks?notif_type=task&notif_id=${entityClientId}&notif_cid=${cid}`
        : "/tasks";
    case "task_step":
      return taskClientId
        ? `/tasks?notif_type=task_step&notif_id=${taskClientId}&notif_cid=${cid}`
        : "/tasks";
    case "case":
      return entityClientId
        ? `/cases?notif_type=case&notif_id=${entityClientId}&notif_cid=${cid}`
        : "/cases";
    case "item_upholstery":
    case null:
      return `/upholstery-inventory?notif_type=upholstery&notif_cid=${cid}`;
    case "upholstery":
      return "/upholstery-inventory";
    default:
      return "/";
  }
}
```

Update the call inside `notificationclick` to pass the new field:

```ts
const route = resolveRoute(
  data?.entity_type,
  data?.entity_client_id,
  data?.notification_client_id,
  data?.task_client_id,
);
```

No other changes to this file.

---

### Step 3 — Create `NotificationDeepLinkMount.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/app/NotificationDeepLinkMount.tsx` (**new file**)

This is a null-returning React component — mirroring the existing `PushMount` pattern.

Responsibilities:
1. Watch `location.search` for notification params.
2. When params are detected: mark the notification read, then either open the correct surface (surface sub-pattern) or navigate to the destination route (route sub-pattern).
3. If `notif_type` is unrecognised or params are absent, do nothing.

**Sub-pattern distinction:**
- **Surface open** (`"task"`, `"task_step"`, and future surface types): clean the URL params in-place (stay on the current route), then open the surface on top.
- **Route navigate** (`"case"`, `"upholstery"`, and future route types): navigate directly to the destination URL with `{ replace: true }` — leaving the params URL replaces it in history, so no separate cleanup is needed.

`"task_step"` falls through to exactly the same surface-open logic as `"task"` — `notif_id` already carries the parent `task_client_id` (encoded by `sw.ts`), so no extra indirection is needed in the component.

```tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMarkNotificationsRead } from "@beyo/notifications";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@/features/tasks/surfaces";
import { buildCaseConversationRoute } from "@/lib/routes";

export function NotificationDeepLinkMount(): null {
  const location = useLocation();
  const navigate = useNavigate();
  const { markRead } = useMarkNotificationsRead();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifType = params.get("notif_type");
    const notifId = params.get("notif_id");
    const notifCid = params.get("notif_cid");

    if (!notifType) return;

    // Mark notification read.
    if (notifCid) {
      markRead({ notification_client_ids: [notifCid] });
    }

    switch (notifType) {
      // — Surface sub-pattern —
      // Stay on current route, clean params in place, then open surface on top.
      // "task_step" falls through: sw.ts already placed task_client_id in notif_id.
      case "task":
      case "task_step": {
        const cleaned = new URLSearchParams(location.search);
        cleaned.delete("notif_type");
        cleaned.delete("notif_id");
        cleaned.delete("notif_cid");
        const search = cleaned.toString();
        navigate(
          { pathname: location.pathname, search: search ? `?${search}` : "" },
          { replace: true },
        );
        if (notifId) {
          useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
            taskId: notifId,
          } satisfies TaskDetailSurfaceProps);
        }
        break;
      }

      // — Route sub-pattern —
      // Navigate to destination; replacing the params URL is implicit.
      case "case":
        if (notifId) {
          navigate(buildCaseConversationRoute(notifId), { replace: true });
        }
        break;

      case "upholstery":
        navigate("/upholstery-inventory", { replace: true });
        break;

      // Future phases: add cases here following one of the two sub-patterns above.
    }
  }, [location.search]);

  return null;
}
```

**Note on `useEffect` deps**: `navigate` and `markRead` are stable references (from react-router and TanStack respectively) — they do not need to be listed as dependencies. `location.search` is the only reactive dep.

---

### Step 4 — Wire into `RootRoute.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/app/RootRoute.tsx`

Add `NotificationDeepLinkMount` import and render it alongside `PushMount`:

```tsx
import { NotificationDeepLinkMount } from "@/app/NotificationDeepLinkMount";

// Inside RootRoute JSX, after <PushMount />:
<NotificationDeepLinkMount />
```

`NotificationDeepLinkMount` must be rendered inside `SurfaceProvider` (to have access to `useSurfaceStore`) and inside `AuthProvider` (to call the mark-read API with authentication). Both are parent contexts in `RootRoute` — placement alongside `PushMount` satisfies both.

---

### Step 5 — Update workers-app `sw.ts`

File: `apps/workers-app/ManagerBeyo-app-workers/src/sw.ts`

Replace the current worker `resolveRoute(entityType)` helper with a richer URL-param strategy, matching the same SW-to-React deep-link channel used in managers.

Worker-specific route rules:
- `task_step`: base path `/`, encode `notif_type=task_step`, `notif_id=<stepId>`, `notif_task_id=<taskId>`, `notif_cid=<notificationId>`
- `case`: base path `/cases`, encode `notif_type=case`, `notif_id=<caseId>`, `notif_cid=<notificationId>`
- `item_upholstery` and `null`: route to `/?notif_type=upholstery&notif_cid=<notificationId>` and let the mount normalize to `/`
- unknown: `/`

Important worker difference:
- The worker app should use the pushed task-step ID (`entity_client_id`) as the deep-link target for `task_step`
- The worker app still needs `task_client_id` as a second URL param because the detail surface expects both the step ID and task ID

---

### Step 6 — Create workers-app `NotificationDeepLinkMount.tsx`

File: `apps/workers-app/ManagerBeyo-app-workers/src/app/NotificationDeepLinkMount.tsx` (**new file**)

This mirrors the managers mount pattern but adds one worker-only async resolution step for `task_step`.

Responsibilities:
1. Read `notif_type`, `notif_id`, `notif_task_id`, and `notif_cid` from `location.search`
2. Mark the tapped notification read
3. Branch by entity type:
   - `task_step`: resolve the pushed step’s `workingSectionId`, then open `TASK_STEP_DETAIL_SURFACE_ID`
   - `case`: navigate to `buildCaseConversationRoute(notifId)`
   - `upholstery`: navigate to `/`
4. Clean or replace the URL after the deep link fires

Worker `task_step` resolution strategy:
1. Call `fetchWorkerWorkingSections()` to list the worker’s assigned sections
2. Prefer scanning sections that appear active first, but correctness is more important than optimization
3. For each section, call `fetchWorkingSectionSteps({ working_section_id, limit: 50, offset: 0 })`
4. Find the section whose step list contains `notif_id`
5. Clean the current URL in-place, then call `useSurfaceStore.getState().open(TASK_STEP_DETAIL_SURFACE_ID, { stepId: notif_id, taskId: notif_task_id, workingSectionId: resolvedSectionId })`

If the step cannot be resolved:
- Do not throw
- Leave the worker on `/`
- Still mark the notification read
- Log the case during implementation if needed for debugging

This is the key behavioural difference from managers: the worker page model requires one extra client-side lookup because the existing worker `TaskDetailSlidePage` is a slide bound to a working section list, not a standalone routeable record view.

---

### Step 7 — Wire workers mount into `RootRoute.tsx`

File: `apps/workers-app/ManagerBeyo-app-workers/src/app/RootRoute.tsx`

Add the new workers `NotificationDeepLinkMount` alongside `PushMount`, inside `SurfaceProvider` and `AuthProvider`.

---

## Risks and mitigations

- Risk: `notificationclick` fires `existing.navigate(url)` which triggers a React Router navigation — if the user is mid-interaction on a different route, they will be pulled to `/tasks`.
  Mitigation: This is expected behaviour for notification taps — the user explicitly tapped the notification. Acceptable.

- Risk: `useEffect` fires with stale `location.search` after the URL is cleaned (double-fire).
  Mitigation: The effect reads `location.search`. After cleanup `navigate(..., { replace: true })` updates the location and the effect fires again — but on the second run `notifType` is `null`, so the guard `if (!notifType) return` exits immediately. No double open.

- Risk: `PushPayloadData` type change (`string | null`) may cause type errors in other files that assume non-null.
  Mitigation: Both `sw.ts` files already use optional chaining (`data?.entity_type`). Check all usages of `PushPayloadData` across the codebase and guard accordingly. The workers-app `sw.ts` does not pass `entity_client_id` to `resolveRoute` today — it remains unaffected by the type change.

- Risk: Cold-start race — React has not mounted when the URL arrives.
  Mitigation: The URL is always readable after mount. The `useEffect` fires after the first render, by which time the URL is already set. No race condition.

- Risk: For the case route sub-pattern, if the user is mid-interaction and the SW fires `existing.navigate(url)`, they will be pulled away to `/cases`.
  Mitigation: Same as the task risk — the user explicitly tapped the notification. Acceptable.

- Risk: `item_upholstery` notifications do not yet open a dedicated record-specific manager surface, so the user lands at the broader inventory page instead of the exact upholstery entity.
  Mitigation: This is an intentional temporary fallback aligned with the current backend handoff. Keep the route contract stable now and add a dedicated target in a later phase once the manager-side destination is defined.

- Risk: Worker `task_step` deep linking requires an extra async lookup across assigned working sections because the push payload does not contain `working_section_id`.
  Mitigation: Reuse the existing worker APIs (`fetchWorkerWorkingSections` and `fetchWorkingSectionSteps`) to resolve the section before opening the slide. If no section contains the step, fail safely to `/` without throwing.

- Risk: Worker section resolution may require several API calls if the worker has many assigned sections.
  Mitigation: This path only runs on explicit notification taps. Start with correctness-first sequential or bounded-parallel fetches; optimize later only if profiling shows a real delay.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across both apps and the notifications package.
- Manual QA — app closed:
  1. Subscribe to push via managers app.
  2. Trigger a task notification from the backend.
  3. Dismiss the app from recents.
  4. Tap the OS notification.
  5. App opens at `/tasks`, `TaskDetailSlidePage` slides in for the correct task.
  6. Unread badge decrements.
  7. URL bar shows `/tasks` (no `notif_*` params).
- Manual QA — app already open (background):
  1. App is open on home (`/`).
  2. Receive the OS notification and tap it.
  3. App navigates to `/tasks`, surface opens.
  4. Same badge and URL checks as above.
- Manual QA — Phase 2 (case), app closed:
  1. Trigger a case message notification from the backend.
  2. Dismiss the app from recents.
  3. Tap the OS notification.
  4. App opens directly at `/cases/<caseId>` (the conversation view).
  5. Unread badge decrements.
  6. URL bar shows `/cases/<caseId>` (no `notif_*` params).
- Manual QA — Phase 2 (case), app already open:
  1. App is open on home (`/`).
  2. Receive and tap the case notification.
  3. App navigates to `/cases/<caseId>` without a page reload.
  4. Same badge and URL checks as above.
- Manual QA — Phase 3 (task_step), app closed:
  1. Trigger a step state-change or step assignment notification from the backend.
  2. Dismiss the app from recents.
  3. Tap the OS notification.
  4. App opens at `/tasks`, `TaskDetailSlidePage` slides in for the parent task (identified by `task_client_id` in the payload).
  5. Unread badge decrements.
  6. URL bar shows `/tasks` (no `notif_*` params).
- Manual QA — Phase 3 (task_step), app already open:
  1. App is open on home (`/`).
  2. Receive and tap the step notification.
  3. App navigates to `/tasks`, task detail surface opens for the parent task.
  4. Same badge and URL checks as above.
- Manual QA — Phase 4 (`item_upholstery`), app closed:
  1. Trigger an upholstery-completed or upholstery-in-use notification from the backend.
  2. Dismiss the app from recents.
  3. Tap the OS notification.
  4. App opens at `/upholstery-inventory`.
  5. Unread badge decrements.
  6. URL bar shows `/upholstery-inventory` (no `notif_*` params).
- Manual QA — Phase 4 (bulk upholstery), app already open:
  1. App is open on any route.
  2. Trigger an upholstery bulk notification (`entity_type: null`) and tap it.
  3. App navigates to `/upholstery-inventory` without a page reload.
  4. Same badge and URL checks as above.
- Manual QA — Worker Phase W1 (task_step), app closed:
  1. Trigger a worker-visible step notification from the backend.
  2. Dismiss the worker app from recents.
  3. Tap the OS notification.
  4. Worker app opens, resolves the step’s working section, and opens `TaskDetailSlidePage` for the exact pushed step.
  5. Unread badge decrements.
- Manual QA — Worker Phase W1 (task_step), app already open:
  1. Worker app is open on any route.
  2. Receive and tap the step notification.
  3. The app opens the correct task-step detail slide without a full page reload.
  4. Unread badge decrements.
- Manual QA — Worker Phase W2 (case):
  1. Trigger a worker-visible case message notification.
  2. Tap it from both closed and already-open states.
  3. Worker app lands on `/cases/<caseId>`.
  4. Unread badge decrements.
- Manual QA — Worker Phase W3 (upholstery fallback):
  1. Trigger a worker-visible upholstery notification (`item_upholstery` or bulk `null`).
  2. Tap it from both closed and already-open states.
  3. Worker app lands on `/`.
  4. Unread badge decrements.
- Manual QA — unrecognised type:
  1. Manually open `/tasks?notif_type=unknown&notif_id=x` in the browser.
  2. App cleans nothing, opens nothing, no console error.

## Review log

_Empty — awaiting first review._

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `David`
