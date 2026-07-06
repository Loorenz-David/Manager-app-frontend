# PLAN_seller_customer_coordination_email_inbox_20260705

## Metadata

- Plan ID: `PLAN_seller_customer_coordination_email_inbox_20260705`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-05T00:00:00Z`
- Last updated at (UTC): `2026-07-05T10:35:17Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/making_seller_app_2.txt`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_customer_coordination_email_and_counts_20260704.md`

---

> **Revision note (2026-07-05, post-review):** This plan was corrected to remove **all** backend/API/query/mutation ownership from `@beyo/emails`. The emails package is now a **controlled, presentational UI capability only** — it owns components + generic view-model types + generic adapter/callback contract types, and never calls `apiClient`, never defines endpoint paths, never defines query keys, and never runs mutations or cache invalidation. Every endpoint helper, query key, query hook, mutation, cache invalidation, mapping of the current backend shape, and the app-level sync flow lives in the concrete integration layer (`@beyo/task-customer-coordination` + the seller app). See §6 boundary table and §21 Codex Guardrails.

## 1. Overview

Build a seller-facing **email inbox** for customer coordination threads that feels like the Gmail mobile app: an inbox list of threads (unread-first), a sliding thread view with the full conversation, pull-to-refresh IMAP syncing, unread styling, swipe-to-complete / swipe-to-fail actions, and an app-level background sync that keeps replies fresh.

The capability is split across layers to satisfy the **hard architecture requirement** that `packages/emails` remains a generic, reusable email inbox/thread capability that does not own a backend contract:

1. **`@beyo/ui`** — one new domain-agnostic primitive: `SwipeableRow`.
2. **`@beyo/emails`** — generic email inbox/thread **presentational UI** (controlled by props/callbacks) + generic view-model types + generic adapter/config/callback contract types + the generic message-details sheet UI. **No `apiClient` calls, no endpoint paths, no query keys, no mutations, no cache invalidation. Knows nothing about `task_customer_coordination` or `/api/v1/email-threads/*`.**
3. **`@beyo/task-customer-coordination`** — the **concrete integration**: coordination + email-thread endpoint helpers, query keys, query hooks, mutations, cache invalidation, raw→view-model mapping, the controller, the concrete `CustomerCoordinationEmailInboxPage`, the inbox slide surface id, and the app-level sync flow. This is the only place `task_customer_coordination` names, endpoint paths, labels, and swipe meanings appear.
4. **Seller app** — registers the surfaces, adds the Home entry button + unread badge, provides surface openers, and mounts the app-level sync flow. The seller app is the only place `openSurface` is called (Contract 35).

This mirrors the existing `CustomerCoordinationEmailSlidePage` convention (the batch-compose slide already lives in `@beyo/task-customer-coordination` and consumes `EmailComposer` from `@beyo/emails`).

### Confirmed decisions (from clarification round 2026-07-05)

- **Page placement:** concrete inbox page + coordination API/adapter live in `@beyo/task-customer-coordination`; generic UI in `@beyo/emails`; seller app only registers + injects.
- **App-level sync scope:** **gated after first inbox visit** — no background polling until the seller opens the inbox once per app session; then `sync-targeted` runs every 10s app-wide. Page load triggers an immediate sync + timer reset.
- **Swipe primitive:** new generic `SwipeableRow` in `@beyo/ui`.
- **Sliding carousel:** dedicated lightweight two-pane component in `@beyo/emails` (CSS `translateX`, no routing).

### Resolved by the intention/handoff (no longer open)

- **Complete endpoint:** confirmed `POST /api/v1/tasks/{task_id}/customer-coordination/complete`, body `{ "coordination_id": string | null }` (handoff §12).
- **Inbox scope:** `coordination_states=coordinating` only.
- **Message order:** oldest-first (backend order; do not reverse).
- **HTML bodies:** phase 1 renders **plain text only** (`text_body` → `body_preview` → empty state). `html_body` is carried in the view-model but not rendered.
- **Reply button:** rendered but **disabled/no-op** in phase 1.

---

## 2. Relevant contracts

### Contracts loaded

- `architecture/35_shared_packages.md` — package boundary rules, `surfaceOpeners` injection (§13), page loader functions (§14), peerDependencies, `@source` registration.
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md` — slide/sheet surface registration and `useSurfaceProps` / `useSurfaceHeader`.
- `architecture/36_scroll_visibility.md` — `useScrollHide` relative-mode header/footer pattern.
- `architecture/05_server_state.md` — TanStack Query keys, query hooks, invalidation.
- `architecture/08_hooks.md` — controller aggregation shape, mutation action hooks (snapshot/rollback).
- `architecture/24_dto.md` — raw→view-model transformer shape.
- `architecture/14_styling.md` — token-only styling, no invented colors.
- `architecture/31_animations.md` — `durations`/`easings` from `@beyo/lib`.
- `task_system/frontend_contract_goal_mapping_guide.md` — pattern-vs-relational read discipline.

### Local extensions loaded

- `architecture/28_surfaces_local.md` — seller/managers surface registry wiring (`features/tasks/surfaces.ts`, `app/surface-registry.ts`).
- `architecture/04_api_client_local.md` — `apiClient.get/post` + `ApiEnvelopeSchema` usage.

---

## 3. Current architecture findings (relational reads performed)

- **Existing email packages**
  - `packages/emails` currently owns only the email-template picker + `EmailComposer`. `src/index.ts` uses named exports + a `loadEmailTemplatePickerSheetPage()` loader. `package.json` peers: `@beyo/api-client`, `@beyo/hooks`, `@beyo/lib`, `@beyo/ui`, `@tanstack/react-query`, `lucide-react`, `react`, `zod`.
  - `packages/task-customer-coordination` owns the batch-compose slide (`CustomerCoordinationEmailSlidePage`), `customer-coordination-keys`, counts + tasks-with-coordination queries, and `use-send-email-batch`. `package.json` already peers `@beyo/emails`, `@beyo/ui`, `@beyo/tasks`. `types.ts` `CUSTOMER_COORDINATION_STATE` currently = `["pending","coordinating","completed"]` (missing `"failed"`).
- **Reference UI patterns**
  - `packages/tasks/src/components/TasksView.tsx` — canonical `useScrollHide()` + absolutely-positioned header (`translateY(calc(-1 * var(--...) * var(--scroll-hide-progress,0)))`) + `PullToRefresh` (with `scrollRef`, `indicatorOffset`) + list body pattern.
  - `packages/tasks/src/components/TaskListCard.tsx` — card architecture: `mx-4 rounded-xl bg-card shadow-sm`, left `aspect-square w-28` image button with `ImagePlaceholder` fallback + bottom-right quantity overlay pill (`absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white`), right body with truncated rows + `StatePill`.
  - `packages/tasks/src/components/detail/TaskDetailBottomActions.tsx` — footer pinned with `fixed bottom-0 ... translateY(calc(var(--scroll-hide-progress,0)*100%))`, `Close & Back` + primary button, `h-(--safe-bottom,0px)` spacer, `useSurfaceHeader().requestClose()`.
  - `CustomerCoordinationEmailSlidePage.tsx` — hides the surface header (`header?.setHeaderHidden(true)`), renders its own footer, reads `useSurfaceProps<...>()` for `surfaceOpeners`, composes `TaskListCard` + `EmailComposer`. This is the closest structural precedent for the inbox page.
- **Primitives available in `@beyo/ui`**
  - `PullToRefresh` (`onRefresh`, `scrollRef`, `scrollClassName`, `className`, `indicatorOffset`) — internally uses `@use-gesture/react` `useDrag` + `framer-motion`.
  - `useScrollHide()` → `{ scrollRef, isHidden, hideProgressContainerRef }`.
  - `SearchBar` (`value`, `onChange`, `onFilterPress`, `showFilterButton`, `activeFilterCount`, `placeholder`, `isLoading`).
  - `ImagePlaceholder`, `StatePill` (+ `StatePillVariant`), `ContentCard`, `BottomSheetSurface`.
  - **No swipe primitive exists** (`grep -ri swipe packages` finds only ad-hoc usages in images/cases). New primitive required.
- **Surface system**
  - Seller registrations live in `apps/selleres-app/.../src/features/tasks/surfaces.ts` (spread into `app/surface-registry.ts`). Each package surface is registered with `lazyWithPreload(loadXxxPage)` and `{ surface: "slide" | "sheet", component }`.
  - `useSurface()` (`surface.open(ID, props)` / `surface.close(ID)`) is only called in the app (e.g. `HomeView.tsx`). `HomeView` already assembles `surfaceOpeners` including an `openImageViewer` that builds `ImageViewModel[]` and opens `IMAGE_VIEWER_SURFACE_ID` — reuse this verbatim for the inbox.
- **Home counts**
  - `features/home/controllers/use-home-view.controller.ts` uses `useCustomerCoordinationCountsQuery("pending")` + `usePostHandlingCountsQuery("pending")` → `formatCompactCount` → `xxxCountLabel`. `HomeState` type in `features/home/types.ts`. Extend with an email unread count.
- **App-level mounts**
  - `apps/selleres-app/.../src/app/RootRoute.tsx` renders `NotificationRealtimeMount`, `PushMount`, `NotificationDeepLinkMount` inside `SurfaceProvider` + `AuthProvider`, above `<Outlet/>`. Each mount is a `(): null` component calling a flow hook. This is the exact insertion point + pattern for the email sync mount.
- **Query client** — `providers.tsx`: `staleTime: 60s`, `retry: 1`, mutations `retry: 0`.
- **CSS `@source`** — seller `index.css` already registers `packages/emails/src` and `packages/task-customer-coordination/src`. `@beyo/ui` is registered. **No CSS change required.**
- **Lib date barrel** — `packages/lib/src/index.ts` exports each date util explicitly (`formatShortDate`, `daysUntil`, `isoWeek`, `resolveRangeSelection`). Add the new util the same way.

---

## 4. Confirmed API contracts (from handoff)

| Purpose | Method + Path | Body / Query | Response (relevant) |
|---|---|---|---|
| Inbox threads | `GET /api/v1/tasks/customer-coordination/threads` | `coordination_states=coordinating&limit&offset` | `{ coordination_threads: CoordinationThread[], coordination_threads_pagination: { has_more, limit, offset } }` |
| Unread count | `GET /api/v1/email-threads/unread-count` | `entity_type=task_customer_coordination` | `{ unread_count: number }` |
| Thread messages | `GET /api/v1/email-threads/{thread_id}/messages` | `limit&offset` | `{ email_messages: EmailMessage[], email_messages_pagination: { has_more, limit, offset } }` (oldest-first) |
| Mark read | `POST /api/v1/email-threads/{thread_id}/read` | none | `{ marked_read: true }` |
| Single-thread sync | `POST /api/v1/email-threads/{thread_id}/sync` | none | `{ created_message_count, sync_success, ... }` |
| Batch targeted sync | `POST /api/v1/email-threads/sync-targeted` | `{ entity_type, entity_client_ids?, thread_client_ids?, max_threads }` | `{ threads_with_new_messages: string[], created_message_count, sync_success, ... }` |
| Fail coordination | `POST /api/v1/tasks/{task_id}/customer-coordination/fail` | `{ coordination_ids?: string[] }` | `{ failed_ids: string[] }` |
| Complete coordination | `POST /api/v1/tasks/{task_id}/customer-coordination/complete` | `{ coordination_id?: string }` | `{ client_id: string }` |

`CoordinationThread` = `{ thread, task, primary_item, item_images, message_count, last_message }` (full shapes in handoff §5). `EmailMessage` shape in handoff §7 (`direction`, `from_name`, `from_address`, `to/cc/bcc_addresses_json`, `subject`, `text_body`, `html_body`, `body_preview`, `sent_or_received_at`, `send_attempted_at`, `send_error`).

**Access note (handoff §7):** seller can only read threads on a connection they own; auto-resolved single connection is assumed. Do not send `connection_client_id` (omit → backend resolves the seller's single active connection). If a seller has multiple connections, a 422/404 surfaces as an error state (out of scope for phase 1; documented as a known uncertainty).

---

## 5. Data types and mapping

### Generic view-model types (`@beyo/emails` — `src/types.ts`)

```ts
export type EmailMessageDirection = "inbound" | "outbound";

export type EmailInboxThreadVM = {
  threadId: string;              // thread.client_id
  entityClientId: string | null; // thread.entity_client_id (the coordination id, generic name here)
  majorEntityClientId: string | null; // thread.major_entity_client_id (the task id)
  isUnread: boolean;             // thread.is_unread
  title: string;                 // customer display name (adapter-derived)
  messageCount: number | null;   // message_count
  subject: string | null;        // last_message.subject
  preview: string;               // last_message.body_preview ?? text_body ?? ""
  timeIso: string | null;        // last_message.sent_or_received_at ?? thread.last_message_at
  imageUrl: string | null;       // item_images[0].image_url ?? null
  quantity: number | null;       // primary_item.quantity ?? null
  lastMessageDirection: EmailMessageDirection | null;
  lastMessageSendError: string | null;
  // opaque passthrough for app-level actions (image viewer, swipe targets):
  imageClientIds: Array<{ client_id: string; image_url: string }>;
  itemClientId: string | null;   // primary_item.client_id
};

export type EmailMessageVM = {
  messageId: string;
  direction: EmailMessageDirection;
  fromName: string | null;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  subject: string | null;
  textBody: string | null;
  bodyPreview: string | null;
  htmlBody: string | null;       // carried, not rendered in phase 1
  sentOrReceivedAtIso: string;
  sendAttemptedAtIso: string | null;
  sendError: string | null;
};
```

### Generic action-config prop types (`@beyo/emails` — `src/types.ts`)

```ts
import type { LucideIcon } from "lucide-react";

export type EmailSwipeAction = {
  label: string;
  icon: LucideIcon;
  tone: "success" | "destructive"; // maps to token classes inside the card, never raw hex
  onCommit: (thread: EmailInboxThreadVM) => void;
};

export type EmailThreadHeaderAction = {
  label: string;
  icon: LucideIcon;
  tone: "success" | "destructive" | "neutral";
  onPress: () => void;
  disabled?: boolean;
};
```

### Generic adapter / config / callback contract types (`@beyo/emails` — `src/types.ts`)

These types are the **integration contract** — they describe what a consuming integration must provide. `@beyo/emails` **does not implement or call them**; the concrete controller in `@beyo/task-customer-coordination` implements them and feeds resolved data + callbacks into the presentational components (§7). They exist so the seam is typed and so a future entity (tasks/cases/customers) can plug a different backend behind the same UI.

```ts
export type EmailInboxFetchParams = { limit?: number; offset?: number };
export type EmailInboxFetchResult<TThread = EmailInboxThreadVM> = {
  threads: TThread[];
  hasMore: boolean;
  limit: number;
  offset: number;
};
export type EmailThreadMessagesFetchParams = { limit?: number; offset?: number };
export type EmailThreadMessagesFetchResult<TMessage = EmailMessageVM> = {
  messages: TMessage[];
  hasMore: boolean;
};

// Documented capability contract the concrete integration fulfils.
// @beyo/emails never calls these directly — the concrete controller does,
// then passes resolved props/callbacks into the presentational components.
export type EmailInboxAdapter<
  TThread = EmailInboxThreadVM,
  TMessage = EmailMessageVM,
> = {
  fetchInboxThreads: (params: EmailInboxFetchParams) => Promise<EmailInboxFetchResult<TThread>>;
  fetchThreadMessages: (
    threadId: string,
    params?: EmailThreadMessagesFetchParams,
  ) => Promise<EmailThreadMessagesFetchResult<TMessage>>;
  markThreadRead?: (threadId: string, thread: TThread) => Promise<void> | void;
  refreshInbox?: (visibleThreads: TThread[]) => Promise<void> | void;
  refreshThread?: (threadId: string) => Promise<void> | void;
};
```

The presentational components remain **controlled** (§7): they receive already-resolved `threads` / `messages` / `isLoading` / `error` plus callbacks (`onRefreshInbox`, `onRefreshThread`, `onOpenThread`, `onMarkThreadRead`, `onOpenImage`, `onOpenMessageDetails`, `onSwipeLeftToRight`, `onSwipeRightToLeft`). They never fetch, mutate, sync, or invalidate.

### Raw schemas + backend-shape mapping — CONCRETE LAYER ONLY

The current backend shapes (`email_messages`, `to/cc/bcc_addresses_json`, `unread_count`, sync responses, coordination threads) and every Zod schema/mapper that reads them belong to `@beyo/task-customer-coordination` (or the seller app), **not** `@beyo/emails`. A mapper is only generic enough to live in `@beyo/emails` if it maps a **backend-neutral** shape; the mappers here map the *current API* shape, so they live in the concrete layer:

- `@beyo/task-customer-coordination/src/lib/map-email-message.ts` — `mapEmailMessage(raw): EmailMessageVM` (field rename, `to_addresses_json ?? []`, etc.).
- `@beyo/task-customer-coordination` raw schemas: `EmailMessageRawSchema`, `GetThreadMessagesResponse`, `EmailUnreadCountResponse`, `MarkThreadReadResponse`, `SyncThreadResponse`, `SyncTargetedResponse` (consume only `threads_with_new_messages`, `created_message_count`, `sync_success`). Follow the existing envelope pattern (§ Envelope note below), not a hardcoded wrapper.

### Coordination raw schema + mapping (`@beyo/task-customer-coordination`)

- `types.ts`: add `"failed"` to `CUSTOMER_COORDINATION_STATE` (→ `["pending","coordinating","completed","failed"]`). Add:
  - `CoordinationInboxThreadRawSchema = z.object({ thread, task, primary_item (nullable), item_images (array), message_count (int), last_message (EmailMessageRawSchema.nullable()) })`. Reuse `TaskListItemRawSchema.shape.task` / existing item + image schemas where present; if an image schema is not already exported by `@beyo/images`/`@beyo/tasks`, define a minimal local `z.object({ client_id, image_url, ... }).passthrough()` (only `client_id` + `image_url` are consumed).
  - `GetCoordinationInboxThreadsResponseSchema = ApiEnvelopeSchema({ coordination_threads: array, coordination_threads_pagination: { has_more, limit, offset } })`.
  - `CoordinationInboxThreadsParams = { coordination_states?: string; limit?: number; offset?: number }` and `CoordinationInboxThreadsResult = { items, has_more, limit, offset }`.
  - `FailCoordinationResponseSchema = ApiEnvelopeSchema({ failed_ids: z.array(z.string()) })`; `CompleteCoordinationResponseSchema = ApiEnvelopeSchema({ client_id: z.string() })`.
- `src/lib/map-coordination-inbox-thread.ts`:

```ts
mapCoordinationInboxThread(raw): EmailInboxThreadVM
// title:  raw.last_message?.from_name ?? raw.task.primary_email ?? raw.last_message?.from_address ?? "Unknown"
// threadId: raw.thread.client_id
// entityClientId (coordination id): raw.thread.entity_client_id ?? raw.task.customer_coordination?.[0]?.client_id ?? null
// majorEntityClientId (task id):    raw.task.client_id ?? raw.thread.major_entity_client_id ?? null
// itemClientId: raw.primary_item?.client_id ?? null
// imageClientIds: raw.item_images.map(i => ({ client_id, image_url }))
// imageUrl: raw.item_images[0]?.image_url ?? null
// quantity: raw.primary_item?.quantity ?? null
// subject/preview/time/direction/sendError per §5 rules
```

### Envelope pattern note (verify per endpoint — do not hardcode blindly)

The local API pattern is `ApiEnvelopeSchema(dataSchema).extend({ ok: z.literal(true) })` returning `parsed.data` — **confirmed** in `get-customer-coordination-counts.ts` and `get-tasks-with-coordination.ts`. Use it for the new coordination + email-thread helpers, but Codex must confirm each endpoint's actual wrapper against the handoff response examples before freezing the schema; follow `architecture/04_api_client_local.md` if any endpoint deviates. State "follow the existing envelope pattern" rather than assuming a shape the handoff does not show.

### Complete vs. fail body asymmetry — CONFIRMED

The two mutations intentionally use different body shapes (verified in handoff §6 and §12):

- **Fail:** `POST /tasks/{task_id}/customer-coordination/fail` → `{ "coordination_ids": string[] }` (plural array; omit/empty → backend targets the single active record).
- **Complete:** `POST /tasks/{task_id}/customer-coordination/complete` → `{ "coordination_id": string | null }` (singular; null → backend resolves the first non-completed record).

This asymmetry is a real backend contract, not a plan typo. For a single inbox card the coordination id is `thread VM.entityClientId`; send it as `[id]` for fail and `id` for complete.

### Inbox date utility (`@beyo/lib` — `src/date/format-inbox-date.ts`)

`formatInboxDate(iso: string | null | undefined, now: Date = new Date()): string` using native `Intl.DateTimeFormat` (no new deps). Rules:

1. Same local calendar day → time only, 24h: `14:35` (`{ hour: "2-digit", minute: "2-digit", hour12: false }`).
2. Not today, same month + year → weekday short + day number: `Thu, 7` (`{ weekday: "short" }` + `date.getDate()`).
3. Different month, same year → month short + ordinal day: `Jun, 7th` (`{ month: "short" }` + ordinal helper `7 → "7th"`).
4. Different year → month short + ordinal + year: `Jun 7th, 2025`.

Return `""` for null/unparseable input. Export from `packages/lib/src/index.ts` (`export { formatInboxDate } from "./date/format-inbox-date";`). Add a small unit test if the lib test pattern exists.

---

## 6. Package boundary (hard requirement — read before writing files)

| Concern | Owner | Notes |
|---|---|---|
| `SwipeableRow` gesture primitive | `@beyo/ui` | Domain-agnostic; no email/coordination names. |
| Generic inbox/thread/message/carousel/message-details **presentational** components (controlled by props/callbacks) | `@beyo/emails` | Receive resolved VM data + callbacks + `EmailSwipeAction`/`EmailThreadHeaderAction` configs. **No `apiClient`, no endpoint paths, no query keys, no mutations, no cache invalidation, no `task_customer_coordination` strings, no `openSurface`.** |
| Generic view-model types (`EmailInboxThreadVM`, `EmailMessageVM`) + adapter/config/callback contract **types** | `@beyo/emails` | Type-only contract; emails never implements it. |
| Generic message-details **sheet UI + surface props + loader** (`EMAIL_MESSAGE_DETAILS_SHEET_SURFACE_ID`, `EmailMessageDetailsSheetPage`) | `@beyo/emails` | Renders from/to/cc/bcc/date from surface props. **Never calls `openSurface`** — the app registers it and injects the opener callback. |
| **All** `/api/v1/email-threads/*` + coordination endpoint helpers (messages, read, sync, sync-targeted, unread-count, inbox threads, fail, complete) | `@beyo/task-customer-coordination` | Endpoint paths + `apiClient` calls + `entity_type = "task_customer_coordination"`. |
| **All** query keys + query hooks + mutations + cache invalidation for the above | `@beyo/task-customer-coordination` | e.g. `customerCoordinationEmailKeys.*`; mark-read optimistic update + unread invalidation live here. |
| Raw schemas + `mapEmailMessage` + `mapCoordinationInboxThread` (current backend shape → VM) | `@beyo/task-customer-coordination` | Backend-shape-aware, so not generic. |
| App-level sync flow hook + activation store | `@beyo/task-customer-coordination` | `postSyncTargeted` + coordination invalidation; emails not involved. |
| Inbox controller + concrete `CustomerCoordinationEmailInboxPage` + inbox slide surface id + loader | `@beyo/task-customer-coordination` | Wires coordination data + swipe/header meanings into generic UI. |
| App-level sync flow hook + activation store | `@beyo/task-customer-coordination` | `entity_type = "task_customer_coordination"`. |
| Surface registration, `openSurface` calls, Home button + badge, sync mount | Seller app | Contract 35: only the app calls `openSurface`. |

**Rule:** if a component in `@beyo/emails` would need to import anything from `@beyo/task-customer-coordination`, the boundary is wrong — invert it so the coordination layer passes data/config down as props.

---

## 7. Component / file structure

### `@beyo/ui` (1 primitive, 4 files)

- `packages/ui/src/components/primitives/swipeable-row/SwipeableRow.tsx` *(new)*
- `packages/ui/src/components/primitives/swipeable-row/swipeable-row.types.ts` *(new)*
- `packages/ui/src/components/primitives/swipeable-row/index.ts` *(new)*
- `packages/ui/src/index.ts` *(modify — export `SwipeableRow`, `SwipeableRowProps`)*

### `@beyo/lib` (2 files)

- `packages/lib/src/date/format-inbox-date.ts` *(new)*
- `packages/lib/src/index.ts` *(modify — export `formatInboxDate`)*

### `@beyo/emails` (generic **UI-only** capability, ~15 files)

> **No `src/api/` directory.** No `apiClient` calls, no query keys, no mutations. Types + components + generic message-details sheet only.

- `src/types.ts` *(modify — VM types, action-config types, adapter/config/callback contract types; NO raw backend schemas)*
- `src/lib/avatar-color.ts` *(new — deterministic muted color from initials)*
- `src/components/EmailAvatar.tsx` *(new)*
- `src/components/EmailInboxHeader.tsx` *(new)*
- `src/components/EmailInboxThreadCard.tsx` *(new — composes `SwipeableRow`)*
- `src/components/EmailInboxView.tsx` *(new)*
- `src/components/EmailThreadCarousel.tsx` *(new)*
- `src/components/EmailThreadHeader.tsx` *(new)*
- `src/components/EmailMessageCard.tsx` *(new)*
- `src/components/EmailThreadView.tsx` *(new)*
- `src/components/EmailThreadFooter.tsx` *(new)*
- `src/pages/EmailMessageDetailsSheetPage.tsx` *(new — reads surface props only; NEVER calls `openSurface`; the app registers it and injects the opener)*
- `src/surface-ids.ts` *(modify — `EMAIL_MESSAGE_DETAILS_SHEET_SURFACE_ID`, `EmailMessageDetailsSheetSurfaceProps`, `preloadEmailMessageDetailsSheetSurface`)*
- `src/index.ts` *(modify — export components, VM + contract types, `loadEmailMessageDetailsSheetPage`; NO api/keys/hooks)*
- `package.json` *(modify — no new peers; components are prop-controlled (no `@tanstack` usage added by the inbox UI); carousel is CSS-only. `@beyo/ui`, `lucide-react`, `react`, `zod` already present.)*

### `@beyo/task-customer-coordination` (concrete integration — owns ALL backend, ~24 files)

- `src/types.ts` *(modify — add `"failed"`; coordination inbox raw schema + params/result; fail/complete response schemas; `EmailMessageRawSchema` + messages/unread/sync response schemas moved here)*
- `src/api/customer-coordination-email-keys.ts` *(new — `inboxThreads(params)`, `threadMessages(threadId, params)`, `unreadCount()`; or extend `customer-coordination-keys.ts` if that fits package conventions)*
- `src/api/get-coordination-inbox-threads.ts` *(new)*
- `src/api/use-coordination-inbox-threads-query.ts` *(new)*
- `src/api/get-thread-messages.ts` *(new — `/email-threads/{id}/messages`)*
- `src/api/use-thread-messages-query.ts` *(new)*
- `src/api/get-email-unread-count.ts` *(new — `/email-threads/unread-count?entity_type=task_customer_coordination`)*
- `src/api/use-email-unread-count-query.ts` *(new)*
- `src/api/post-thread-read.ts` *(new — `/email-threads/{id}/read`)*
- `src/api/use-mark-thread-read.ts` *(new — mutation: optimistic `isUnread=false` on the inbox cache + `unreadCount` invalidation on settle; owns keys + cache layout)*
- `src/api/post-thread-sync.ts` *(new — `/email-threads/{id}/sync`)*
- `src/api/post-sync-targeted.ts` *(new — `/email-threads/sync-targeted`)*
- `src/api/post-fail-coordination.ts` *(new)*
- `src/api/post-complete-coordination.ts` *(new)*
- `src/actions/use-fail-coordination.ts` *(new — mutation)*
- `src/actions/use-complete-coordination.ts` *(new — mutation)*
- `src/lib/map-email-message.ts` *(new — moved from emails; maps current API shape)*
- `src/lib/map-coordination-inbox-thread.ts` *(new)*
- `src/controllers/use-customer-coordination-email-inbox.controller.ts` *(new)*
- `src/pages/CustomerCoordinationEmailInboxPage.tsx` *(new)*
- `src/sync/use-email-inbox-sync-store.ts` *(new — activation store; see §8 for the state-mechanism decision)*
- `src/sync/use-customer-coordination-email-sync.ts` *(new — interval flow hook)*
- `src/surface-ids.ts` *(modify — `CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID` + `CustomerCoordinationEmailInboxSurfaceProps` + `CustomerCoordinationEmailInboxSurfaceOpeners`)*
- `src/index.ts` *(modify — exports + `loadCustomerCoordinationEmailInboxPage` + sync exports)*
- `package.json` *(modify — add `zustand` peer **only** for the activation store. **Verified 2026-07-05: `zustand` is already a repo-standard dependency** — local `src/store/*.store.ts` zustand stores exist in `@beyo/tasks`, `@beyo/auth`, `@beyo/images`, `@beyo/cases`, `@beyo/ui` (SurfaceProvider), and it is already a peer/dep in the seller app. Adding the peer introduces no new dependency. `@beyo/emails`/`@beyo/ui` already peers.)*

### Seller app (~6 files)

- `apps/selleres-app/.../src/features/tasks/surfaces.ts` *(modify — register inbox slide + email message-details sheet; re-export ids/props)*
- `apps/selleres-app/.../src/features/home/components/HomeView.tsx` *(modify — inbox button + assemble `surfaceOpeners`)*
- `apps/selleres-app/.../src/features/home/controllers/use-home-view.controller.ts` *(modify — email unread count query + label)*
- `apps/selleres-app/.../src/features/home/types.ts` *(modify — `emailUnreadCount`, `emailUnreadCountLabel`)*
- `apps/selleres-app/.../src/app/CustomerCoordinationEmailSyncMount.tsx` *(new — `(): null` calling the flow hook)*
- `apps/selleres-app/.../src/app/RootRoute.tsx` *(modify — render `<CustomerCoordinationEmailSyncMount />` beside the other mounts)*

> `index.css` already registers both package `@source` dirs — **no change**.

---

## 8. Query and mutation strategy

**All of §8 lives in `@beyo/task-customer-coordination` (or the seller app).** `@beyo/emails` owns **none** of it — no keys, no query hooks, no mutations, no invalidation. The controller assembles resolved data + callbacks and passes them into the emails presentational components.

### Query keys (concrete layer only)

`@beyo/task-customer-coordination` — one keys module (`customer-coordination-email-keys.ts`, or extend `customerCoordinationKeys`):

```ts
export const customerCoordinationEmailKeys = {
  all: ["customer-coordination-email"] as const,
  inboxThreads: (params: CoordinationInboxThreadsParams = {}) =>
    [...customerCoordinationEmailKeys.all, "inbox-threads", params] as const,
  threadMessages: (threadId: string, params: EmailThreadMessagesFetchParams = {}) =>
    [...customerCoordinationEmailKeys.all, "thread-messages", threadId, params] as const,
  unreadCount: () =>
    [...customerCoordinationEmailKeys.all, "unread-count"] as const,
};
```

> Even though `/api/v1/email-threads/*` looks generic, the keys are owned by the concrete integration so a future entity can use different endpoints, response shapes, sync strategies, and unread-count behavior without the reusable UI forcing one backend contract.

### Queries (concrete layer)

- `useCoordinationInboxThreadsQuery({ coordinationStates: "coordinating", limit: 50, offset: 0 })` → maps raw → `EmailInboxThreadVM[]`, exposes `hasMore`. (Phase 1: first page only — see §12.)
- `useThreadMessagesQuery(threadId, { enabled: !!threadId })` → `EmailMessageVM[]` (oldest-first, mapped via `mapEmailMessage`).
- `useEmailUnreadCountQuery()` → `{ unread_count }` (fixed `entity_type=task_customer_coordination`). Shared by the Home badge and the page via the same key.

### Mutations / actions (concrete layer)

| Action | Location | Behavior |
|---|---|---|
| Mark read | `useMarkThreadRead()` (coordination) | `POST /email-threads/{id}/read`; optimistically set `isUnread=false` on that thread in the `inboxThreads` caches (matched by `threadId`); on settle invalidate `customerCoordinationEmailKeys.unreadCount()`. **Owns keys + cache layout + which unread key to refresh** — none of this is in emails. |
| Sync one thread | `postThreadSync(threadId)` (coordination; called on thread pull-to-refresh) | if `created_message_count > 0` → invalidate `threadMessages(threadId)`; always invalidate `unreadCount()`. |
| Sync targeted | `postSyncTargeted({ entity_type: "task_customer_coordination", entity_client_ids?, max_threads: 50 })` (coordination; inbox pull-to-refresh + app-level flow) | if `threads_with_new_messages.length > 0` → invalidate `inboxThreads` (prefix) + `unreadCount()`. |
| Fail | `useFailCoordination()` (coordination) | `POST /tasks/{task_id}/customer-coordination/fail` `{ coordination_ids: [id] }`; see §10 for pending/rollback rules; invalidate `inboxThreads` (prefix) + `unreadCount()`. |
| Complete | `useCompleteCoordination()` (coordination) | `POST /tasks/{task_id}/customer-coordination/complete` `{ coordination_id: id }`; same UX rules as fail. |

**Invalidation helper:** inbox threads use a params-keyed cache → invalidate by prefix predicate on `customerCoordinationEmailKeys.all` (or an `inboxThreads()` prefix). Follow `05_server_state.md`.

**Open-thread sequence (no flicker) — owned by the coordination controller:** on `onOpenThread(thread)` the controller (1) stores `selectedThreadId` + sets `activeIndex=1` synchronously, (2) only **after** the id is safely stored, optimistically sets that thread's `isUnread=false` in the inbox cache, (3) fires `markThreadRead`, (4) lets `useThreadMessagesQuery` fetch (skeleton inside the thread pane only). If mark-read **fails**, the user stays in the thread (do not navigate back); the optimistic unread flag may be rolled back and `unreadCount()` is invalidated on settle so the badge self-corrects. If the messages fetch **fails**, the thread pane shows an error + retry state (not a blank pane). The emails components receive `onOpenThread` / `onMarkThreadRead` callbacks and the resolved messages/loading/error — they decide none of this.

### App-level sync flow (gated) — coordination-owned

- `use-email-inbox-sync-store.ts` — activation state `{ active: boolean; activate(): void; syncNonce: number; requestImmediateSync(): void }`. **State mechanism:** use a small `zustand` store (already the repo-standard `src/store` pattern — verified §7). This introduces no new dependency. (If a reviewer prefers zero-store, a module-level `useSyncExternalStore` signal is an acceptable equivalent, but zustand matches existing convention.)
- `use-customer-coordination-email-sync.ts`: reads the store; when `active`, runs `setInterval(10_000)` calling `postSyncTargeted({ entity_type: "task_customer_coordination", max_threads: 50 })`; on `threads_with_new_messages.length > 0` invalidate `inboxThreads` (prefix) + `unreadCount()`. Runs once immediately on activation and whenever `syncNonce` bumps. Clears interval on unmount / when `active` flips false. In-flight ref guards overlapping runs. Pauses when `document.visibilityState !== "visible"`, resyncs on `visibilitychange → visible` (battery/network safety). **`@beyo/emails` is not involved in polling or invalidation.**
- Page mount effect (in the coordination controller/page): `activate()` + `requestImmediateSync()` — the "sync + reset app-level timer on page load" requirement.

---

## 9. Styling constraints (no invented visual language)

- Cards/containers: `mx-4 rounded-xl bg-card shadow-sm`, body padding `px-3 py-2.5`, list `flex flex-col gap-3`, safe-bottom padding `pb-[calc(var(--safe-bottom,0)+5.5rem)]` — copied from `TaskListCard`/`TasksView`.
- Image: left `aspect-square w-28 shrink-0 overflow-hidden bg-muted`, `ImagePlaceholder` fallback, quantity overlay pill exactly as `TaskListCard` (`absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white`). Image button opens the image viewer via injected `openImageViewer`.
- Header: `useScrollHide()` relative mode + absolute header with the `translateY(calc(-1 * var(--header-height,64px) * var(--scroll-hide-progress,0)))` transform + `transition: transform var(--scroll-snap-duration,0ms) ease-out`, matching `TasksView`. `SearchBar` with `showFilterButton`.
- Footer (thread view): copy `TaskDetailBottomActions` shell — `fixed bottom-0 ... translateY(calc(var(--scroll-hide-progress,0)*100%))`, `Close & Back` (secondary) + `Reply` (primary, **disabled**), `h-(--safe-bottom,0px)` spacer.
- Unread styling: unread → text opacity `1` + a small dot beside the time; read → wrap card text in `opacity-80`, no dot. **Dot color:** reuse the existing unread-indicator color already used by the Cases unread pill (`CaseCard`) if present; otherwise `bg-sky-500`. Confirm against `14_styling.md` tokens — do not introduce a new palette entry.
- Send/failed indicator beside time:
  - `direction==="outbound" && send_error==null` → Lucide `Send`, success tone. Use the **same green class the `StatePill` "success" variant uses** (read `StatePillVariant` mapping; do not hardcode a new hex).
  - `direction==="outbound" && send_error!=null` → Lucide `TriangleAlert`, warning/amber tone (`StatePill` "warning" variant color), opacity `1`.
- Avatar: circular, initial(s) of `fromName ?? fromAddress`; background from `avatar-color.ts` deterministic pick over a **muted** token palette (e.g. existing `bg-muted`/tinted tokens), never loud colors.
- Direction row: plain inline text `to me` / `from me` + Lucide `ChevronDown`, no background/border. Tapping opens the message-details sheet.
- Swipe backgrounds: left-to-right reveal = success token bg + `Check` + `Completed`; right-to-left reveal = destructive token bg + `X` + `Failed`. Tokens only (`bg-emerald-*`/`bg-destructive` per existing usage — reuse whatever `StatePill success/destructive` and existing destructive buttons already use).
- Animation timings: `durations`/`easings` from `@beyo/lib` for carousel + swipe settle.

---

## 10. UX behavior details

### `SwipeableRow` (generic)

- Props: `children`, `leftToRightAction?: { icon, label, className }`, `rightToLeftAction?: { icon, label, className }`, `onSwipeLeftToRight?()`, `onSwipeRightToLeft?()`, `threshold?` (fraction of width, default `0.4`), `disabled?`.
- Implementation: `@use-gesture/react` `useDrag` + `framer-motion` `useMotionValue(x)` + `animate`. Foreground translates with the finger (`x`), clamped with mild rubber-band past threshold. Two absolutely-positioned background layers (left action shown when `x>0`, right action when `x<0`), opacity/scale ramping toward threshold.
- Release: if `|x|` ≥ threshold → animate the foreground off-screen in the swipe direction (momentum/settling), then fire the matching callback; else spring back to `0`. Threshold-cross haptic via `navigator.vibrate` (mirror `PullToRefresh`). Vertical scroll is not hijacked (lock to horizontal intent using `useDrag` axis).
- Disabled → renders children with no gesture.

### Controlled-component contract (emails components are presentational)

The emails components never fetch/mutate/sync/invalidate. They receive resolved state + callbacks from the coordination controller:

```tsx
<EmailInboxView
  threads={threads}            // EmailInboxThreadVM[] (already fetched + mapped)
  isLoading={isLoading}
  error={error}
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  onRefreshInbox={handleRefreshInbox}   // controller runs sync-targeted + refetch
  onOpenThread={handleOpenThread}
  onOpenImage={handleOpenImage}         // controller/app builds ImageViewModel[] + opens viewer
  leftSwipeAction={completeSwipeAction} // EmailSwipeAction (complete)
  rightSwipeAction={failSwipeAction}    // EmailSwipeAction (fail)
/>

<EmailThreadView
  subject={selectedSubject}
  messages={messages}          // EmailMessageVM[] (already fetched + mapped)
  isLoading={isMessagesLoading}
  error={messagesError}
  onBack={handleBack}
  onRefreshThread={handleRefreshThread} // controller runs single-thread sync + refetch
  onOpenMessageDetails={handleOpenMessageDetails}
  headerActions={threadHeaderActions}   // EmailThreadHeaderAction[] (complete/fail)
  footerReplyDisabled                    // Reply is a no-op in phase 1
/>
```

### Inbox list

- Header: absolutely positioned, `SearchBar` (`value`/`onChange` from props) + filter button. **Phase 1: `showFilterButton={false}`** (no dead control; the filter sheet is a later phase — §12).
- Body: `PullToRefresh` wrapping the mapped `EmailInboxThreadCard[]`. Backend already sorts unread-first / newest-first — **no client re-sort**. **Local text search (§13):** client-side only, over the already-loaded VM list (`title`/`subject`/`preview`); no backend query param, no cross-page search.
- Loading (initial): 5 pulse skeletons (`mx-4 h-30 animate-pulse rounded-xl bg-muted`) like `TasksView`. Empty: `ContentCard` with muted copy. Error: `ContentCard` + "Try again" (calls `onRefreshInbox`/refetch via prop).
- Card rows: (1) title truncated + `messageCount` (if present) + time + unread dot + send/failed indicator; (2) subject truncated; (3) preview truncated. Tap body → `onOpenThread(thread)`. Tap image → `onOpenImage(thread)` (see image-viewer ownership below).
- **Image-viewer ownership:** `EmailInboxThreadCard` only renders the image button and calls `onOpenImage(thread)` (or `onOpenImage({ images, initialImageId })`). It does **not** know the app image-viewer surface. The seller app / coordination controller builds `ImageViewModel[]` from `thread.imageClientIds` and opens `IMAGE_VIEWER_SURFACE_ID` (reuse the existing `HomeView` impl).
- **Swipe async / rollback (destructive transitions):** `EmailInboxThreadCard` disables further swipes on itself while its commit is pending. On success the controller removes/refetches the item. **On failure the card animates back to its original position** and surfaces the error via the existing app toast/error pattern (`notify`/`sonner`) if available. Do **not** permanently remove the card optimistically unless rollback is implemented. Below-threshold release always returns to origin.

### Thread view (carousel index 1)

- `EmailThreadCarousel`: `<div class="flex w-[200%]">` two `w-1/2` panes, `translateX(calc(var(--active,0)*-50%))` via `activeIndex` prop, `transition: transform durations.slide`. Inbox pane always mounted; thread pane renders content only when `selectedThreadId` set.
- Header: back arrow (→ `activeIndex=0`, clear selection) + right-side `Complete` / `Fail` actions (`EmailThreadHeaderAction[]`) + subject line below. Scroll-hide relative mode.
- Body: `PullToRefresh` → `onRefreshThread` (controller runs single-thread sync + refetch); message list oldest-first, each `EmailMessageCard`. **Loading** (initial fetch) → skeleton confined to the thread pane. **Error** → in-pane error + retry, never a blank pane.
- `EmailMessageCard`: avatar + sender row (`fromName` truncated + `formatInboxDate(sentOrReceivedAtIso)`) + direction row (`to me`/`from me` + `ChevronDown` → `onOpenMessageDetails(message)`) + body. **Body rendering (HTML safety):** `textBody ?? bodyPreview ?? safe empty state`. **Phase 1 never renders `html_body`, and never uses `dangerouslySetInnerHTML`.** `htmlBody` is carried in the VM only for future work. Delivery state: outbound + `sendAttemptedAt==null` → subtle "Sending…"; outbound + `sendError!=null` → "Delivery failed: {error}" in warning tone; otherwise none.
- Footer: `Close & Back` (→ `onBack`, `activeIndex=0`) + `Reply` (**disabled/no-op**). Scroll-hide relative mode.
- Complete/Fail from header → same controller mutation as swipe (with the same pending/rollback rules) → on success invalidate inbox + unread → `activeIndex=0` + clear selection. On failure stay in the thread + toast.

### Message-details sheet (`@beyo/emails` UI, app-registered surface)

- `EmailMessageDetailsSheetPage` is generic UI that reads `useSurfaceProps<EmailMessageDetailsSheetSurfaceProps>()` = `{ fromName, fromAddress, toAddresses, ccAddresses, bccAddresses, sentOrReceivedAtIso }` and renders labeled rows inside `BottomSheetSurface`; omit empty cc/bcc. **It never calls `openSurface` and never knows which app registered it.** The seller app registers the sheet; the coordination controller/`HomeView` provides the `openMessageDetails(message)` opener via surface props, and `EmailMessageCard`/`EmailThreadView` only call the injected `onOpenMessageDetails` callback. *(If wiring a full surface proves awkward, an inline prop-controlled `BottomSheetSurface` inside the thread view is an acceptable fallback — final choice follows the existing surface architecture.)*

### Home entry

- New button **below** the existing "Customer Coordination" button, same styling (`flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 ...`), label e.g. "Customer Follow-up Email" + `unread_count` suffix (`formatCompactCount`), Gmail-style icon (reuse `GmailIcon` from `@beyo/assets`). Opens `CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID` with `surfaceOpeners: { closeSurface, openImageViewer (reuse existing impl), openMessageDetails }`.
- **Not HomeView-coupled:** the inbox page depends only on its `CustomerCoordinationEmailInboxSurfaceProps` (the `surfaceOpeners` map), not on HomeView. Any seller entry point (a future tab, deep link, or notification) can open the same surface by passing the same openers. HomeView is merely the first caller.

---

## 11. Phase-by-phase implementation plan

Each phase must end with `npm run typecheck` (seller app + touched packages) green before the next. `npm install` from `frontend/` after any `package.json` change.

### Phase 1 — Generic email UI contracts + date utility (NO backend)
1. `@beyo/lib`: add `format-inbox-date.ts` + export; unit test if pattern exists.
2. `@beyo/emails` `types.ts`: add generic VM types (`EmailInboxThreadVM`, `EmailMessageVM`), action-config types (`EmailSwipeAction`, `EmailThreadHeaderAction`), and adapter/config/callback contract types (`EmailInboxAdapter`, fetch params/results). **No raw backend schemas, no `apiClient`, no keys, no hooks.**
3. `@beyo/emails` `lib/avatar-color.ts`.
4. `@beyo/emails` `index.ts`: export types only so far.

### Phase 2 — `SwipeableRow` primitive
5. `@beyo/ui` swipeable-row files + `index.ts` export. Domain-agnostic; verify build. **No backend calls.**

### Phase 3 — Generic email presentational components (NO backend)
6. `EmailAvatar`.
7. `EmailInboxThreadCard` (composes `SwipeableRow`; `onOpenImage`/`onOpenThread`/swipe callbacks as props), `EmailInboxHeader`, `EmailInboxView`.
8. `EmailThreadCarousel`, `EmailThreadHeader`, `EmailMessageCard`, `EmailThreadView`, `EmailThreadFooter` — all controlled by props/callbacks.
9. `EmailMessageDetailsSheetPage` (generic UI) + `surface-ids.ts` additions + `loadEmailMessageDetailsSheetPage`.
10. Export all public components/types/loader from `@beyo/emails/index.ts`. **Still no `apiClient`, keys, or mutations anywhere in `@beyo/emails`.**

### Phase 4 — Customer-coordination backend integration (endpoints, keys, queries, mutations, mapping)
In `@beyo/task-customer-coordination`:
11. `types.ts` (+ `"failed"`; coordination inbox raw schema + params/result; `EmailMessageRawSchema` + messages/unread/sync response schemas; fail/complete response schemas). Follow the existing envelope pattern; verify each wrapper.
12. `customer-coordination-email-keys.ts` (`inboxThreads`, `threadMessages`, `unreadCount`).
13. `lib/map-email-message.ts` + `lib/map-coordination-inbox-thread.ts`.
14. Inbox threads: `get-coordination-inbox-threads.ts` + `use-coordination-inbox-threads-query.ts`.
15. Thread messages: `get-thread-messages.ts` + `use-thread-messages-query.ts`.
16. Unread count: `get-email-unread-count.ts` + `use-email-unread-count-query.ts`.
17. Mark read: `post-thread-read.ts` + `use-mark-thread-read.ts` (optimistic `isUnread=false` + unread invalidation, owns keys/cache layout).
18. Sync: `post-thread-sync.ts` + `post-sync-targeted.ts`.
19. Coordination transitions: `post-fail-coordination.ts` + `use-fail-coordination.ts`; `post-complete-coordination.ts` + `use-complete-coordination.ts`.

### Phase 5 — Concrete controller + inbox page + surface id
20. `controllers/use-customer-coordination-email-inbox.controller.ts` — aggregates the queries/mutations/sync, selection + carousel state, refresh flows, mark-read-on-open sequence, swipe/header action configs (incl. pending/rollback), and `surfaceOpeners` passthrough. Produces the exact props the emails components expect.
21. `pages/CustomerCoordinationEmailInboxPage.tsx` — hides surface header; renders `EmailThreadCarousel` with `EmailInboxView` (pane 0) + `EmailThreadView` (pane 1), feeding controller data/callbacks. Reads `useSurfaceProps<CustomerCoordinationEmailInboxSurfaceProps>()`.
22. `surface-ids.ts` additions; `index.ts` exports + `loadCustomerCoordinationEmailInboxPage`.

### Phase 6 — Seller app wiring: surfaces + Home button + badge
23. `features/tasks/surfaces.ts`: register `CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID` (slide) + `EMAIL_MESSAGE_DETAILS_SHEET_SURFACE_ID` (sheet) via `lazyWithPreload`; re-export ids/props.
24. `features/home/types.ts` + `use-home-view.controller.ts`: add `useEmailUnreadCountQuery()` → `emailUnreadCount` + `emailUnreadCountLabel`.
25. `features/home/components/HomeView.tsx`: add the inbox button below the coordination button; assemble `surfaceOpeners` (`closeSurface`, reuse existing `openImageViewer`, new `openMessageDetails`).

### Phase 7 — App-level sync flow (gated) + polish + QA
26. `@beyo/task-customer-coordination` `sync/use-email-inbox-sync-store.ts` (activation store) + `sync/use-customer-coordination-email-sync.ts` (interval flow; coordination-owned invalidation); export from `index.ts`. `package.json`: add `zustand` peer (already repo-standard — §7); `npm install`.
27. Seller `app/CustomerCoordinationEmailSyncMount.tsx` + mount in `RootRoute.tsx`.
28. First-open activation: page mount calls `activate()` + `requestImmediateSync()`; verify 10s visible-only cadence + coordination-specific invalidation.
29. Validate loading/empty/error, delivery states, swipe thresholds + rollback, carousel transitions; run the Manual QA checklist.

---

## 12. Pagination, filter & local search (phase-1 posture)

- **Inbox pagination:** phase-1 fetches **only the first page** (`limit=50, offset=0`) and renders it. Read `coordination_threads_pagination.has_more` for a future "Load more", but **do not implement append/infinite scroll in phase 1** — do not build half-finished pagination state that can cause duplicate/refetch bugs. A later phase adds append behavior through the same query key. Keep the controller shape ready (single `items` list, `hasMore` boolean) without wiring an offset loop yet.
- **Local search (client-side only):** phase-1 search filters the **already-loaded** inbox VM list by `title`/`subject`/`preview`. It does **not** call the backend, does **not** add a query param, and does **not** search across not-yet-loaded pages. A future backend search would be injected through the adapter/config boundary, not hardcoded into the reusable UI. (Avoids Codex inventing a nonexistent search param.)
- **Filter button:** phase 1 renders the header with `showFilterButton={false}` (no dead control). **Do not build a filter sheet in phase 1.** A coordination-state filter sheet is a future phase; the scroll-reactive header is already ready for it.

---

## 13. Known uncertainties / required clarifications

- [ ] **Multiple email connections:** handoff §7/§10 return 422/404 when a seller owns >1 active connection and `connection_client_id` is omitted. Phase 1 assumes a single connection and surfaces multi-connection as a generic error state. Confirm sellers have exactly one connection, or a later phase must add connection selection. *(Does not block phase 1.)*
- [ ] **Unread dot / success / warning color tokens:** plan reuses existing `StatePill` success/warning colors + the Cases unread-indicator color. If those exact tokens don't exist, Codex must pick the closest existing token (never a new hex) and note it in the review log.
- [ ] **`item_images` schema reuse:** if `@beyo/tasks`/`@beyo/images` already export an image row schema matching the handoff shape, reuse it; otherwise use a minimal `passthrough` schema consuming only `client_id` + `image_url`.
- [ ] **Home button label + icon:** plan uses "Customer Follow-up Email" + `GmailIcon`. Confirm final copy/icon with product if different from the existing "Customer Coordination" button.

---

## Acceptance criteria

1. Seller Home shows a new button below "Customer Coordination" with a live unread count from `GET /email-threads/unread-count?entity_type=task_customer_coordination`.
2. Tapping it opens a slide showing coordinating threads (unread-first) with correct card layout, unread styling, and outbound send/failed indicators.
3. Pull-to-refresh on the inbox calls `sync-targeted` (coordination-scoped) then refetches inbox + unread; single loading flow.
4. Tapping a card slides to the thread view, fetches messages (oldest-first), marks the thread read (optimistic + `unread-count` refresh), no unread-badge flicker.
5. Thread pull-to-refresh calls `/{thread_id}/sync` and refetches messages when `created_message_count > 0`.
6. Message-details sheet opens from the direction row and shows from/to/cc/bcc/date.
7. Swipe left-to-right completes (`/complete`), swipe right-to-left fails (`/fail`); header Complete/Fail do the same and return to the inbox; both invalidate inbox + unread and drop the item.
8. App-level `sync-targeted` polling starts only after the first inbox open, runs ~10s while visible, pauses when hidden, and invalidates inbox + unread on new messages.
9. `@beyo/emails` (the new inbox/thread capability) contains **zero** backend endpoint paths, **zero** `apiClient.get/post` calls, **zero** query keys tied to `/api/v1/email-threads`, **zero** mutation hooks, **zero** cache invalidation, **zero** `task_customer_coordination` strings/labels, and **zero** `openSurface` calls. *(Exception: the pre-existing, unrelated email-template APIs already in `@beyo/emails` stay as-is and must not be folded into this reusable inbox/thread capability.)* All domain + backend specifics live in `@beyo/task-customer-coordination` / the seller app.
10. `npm run typecheck` passes for the seller app and all touched packages; `@source` + peers verified. `grep -rE "apiClient|/api/v1/email-threads|useQuery|useMutation|invalidateQueries" packages/emails/src` returns **no** matches in the new inbox/thread files.

## Contracts and skills

### File read intent — pattern vs. relational

All reads performed for this plan were **relational** (existing field names, return shapes, surface wiring, home controller shape) per `frontend_contract_goal_mapping_guide.md`. Codex should write new query/mutation/controller/provider code from the contracts (`05`, `08`, `23`, `24`), not by copying sibling implementations.

## Risks and mitigations

- **Risk:** `@beyo/emails` accidentally gains backend ownership (imports coordination types, `apiClient`, endpoints, query keys, or mutations). **Mitigation:** boundary table §6 + §21 guardrails + acceptance criterion 9 grep gate; emails is types + controlled components only; coordination passes resolved data/callbacks down as props.
- **Risk:** 10s polling drains battery. **Mitigation:** gated activation + `visibilitychange` pause + in-flight guard + only-invalidate-on-new-messages.
- **Risk:** unread badge flicker on open. **Mitigation:** optimistic `isUnread=false` in inbox cache before mark-read resolves; skeleton confined to the thread pane.
- **Risk:** swipe gesture fighting vertical scroll. **Mitigation:** `useDrag` axis lock; threshold + rubber-band; return-on-release below threshold.
- **Risk:** dynamic-import code-splitting regressions. **Mitigation:** page components exposed only via `loadXxxPage()` loaders (Contract 35 §14), never statically re-exported.

## Validation plan

- `npm run typecheck` — zero errors (seller app + `@beyo/ui`, `@beyo/lib`, `@beyo/emails`, `@beyo/task-customer-coordination`).
- `npm run build` (seller app) — no `[INEFFECTIVE_DYNAMIC_IMPORT]` warnings for the new surfaces.
- Manual QA (below).

## Manual QA checklist

- [ ] Home badge matches backend unread count; updates after reading a thread.
- [ ] Inbox order unread-first, newest-first; unread dot + opacity correct.
- [ ] Send icon (green) on outbound-no-reply; TriangleAlert (amber) on `send_error`.
- [ ] Image tap opens viewer; quantity overlay shows when present; placeholder when no image.
- [ ] Card tap slides to thread; back arrow + Close & Back slide back.
- [ ] Messages oldest-first; avatar initials + deterministic muted color; direction row opens details sheet with correct addresses.
- [ ] Inbox pull-to-refresh = one spinner cycle; new replies appear; badge updates.
- [ ] Thread pull-to-refresh pulls new inbound messages.
- [ ] Swipe L→R completes, R→L fails; below-threshold release returns card; item leaves list after commit.
- [ ] Header Complete/Fail returns to inbox and removes item.
- [ ] Reply button visibly disabled/no-op.
- [ ] App-level sync does nothing until first inbox open; then keeps unread fresh; pauses when app backgrounded.
- [ ] Swipe commit failure returns the card to origin + shows a toast (no permanent optimistic removal without rollback).
- [ ] Mark-read failure keeps the user in the thread; badge self-corrects on settle.
- [ ] Thread messages fetch failure shows an in-pane retry, not a blank pane.

## 21. Codex Guardrails (read last, obey strictly)

- **Do not** move coordination-specific or `/api/v1/email-threads/*` endpoints, `apiClient` calls, query keys, mutations, or cache invalidation into `@beyo/emails`. They live in `@beyo/task-customer-coordination` / the seller app.
- **Do not** import `@beyo/task-customer-coordination` (or any domain package) from `@beyo/emails`. If you feel the need to, invert the dependency and pass data/config down as props.
- **Do not** call `openSurface` from any package — only the seller app calls it (Contract 35).
- **Do not** add new colors or visual language. Reuse existing tokens / `StatePill` variants / existing unread-indicator color.
- **Do not** render `html_body`; never use `dangerouslySetInnerHTML` in phase 1.
- **Do not** add new dependencies unless the plan explicitly confirms they already exist (`zustand` is confirmed repo-standard; nothing else new is needed).
- **Do not** invent backend fields, endpoints, or query params not documented in the handoff (esp. no backend search param).
- **Do not** implement a reply composer in phase 1 (Reply is disabled/no-op).
- **Do not** implement pagination beyond phase-1 first-page-only behavior; do not build half-finished offset state.
- **Do not** implement a filter sheet in phase 1.
- **Keep** all `@beyo/emails` inbox/thread components controlled by props/callbacks — no fetching, mutating, syncing, or invalidating inside them.
- **Confirm** each endpoint's envelope wrapper against the handoff before freezing its Zod schema (§5 Envelope note).

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` (pending user review of this plan)
- Transition owner: `claude`
