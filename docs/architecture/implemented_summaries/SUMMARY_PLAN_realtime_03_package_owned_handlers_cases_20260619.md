# SUMMARY_PLAN_realtime_03_package_owned_handlers_cases_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_realtime_03_package_owned_handlers_cases_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T08:43:31Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_realtime_03_package_owned_handlers_cases_20260619.md`
- Related debug plan (optional): `—`

## What was implemented

- Added `caseSocketEvents` to `@beyo/cases` as a package-owned `SocketEventHandlers` registry.
- Added handlers for case create/update/state-change/participant/conversation-created events.
- Added predicate-based handlers for `conversation:message-created`, `conversation:message-edited`, and `conversation:message-deleted` that target only `caseKeys.conversationMessages(...)` queries.
- Added `@beyo/realtime` as a peer dependency of `@beyo/cases`.
- Exported `caseSocketEvents` from the `@beyo/cases` public package barrel.

## Files changed

- `packages/cases/package.json`: added `@beyo/realtime` peer dependency.
- `packages/cases/src/socket-events.ts`: added case and conversation socket handlers.
- `packages/cases/src/index.ts`: exported `caseSocketEvents`.
- `package-lock.json`: refreshed after the peer dependency metadata update.

## Contract adherence

- `architecture/21_realtime.md`: feature-owned handlers are declared as a `SocketEventHandlers` object and are intended for app-level registry merging.
- `architecture/05_server_state.md`: handlers use targeted TanStack Query invalidation and `refetchType: "active"`.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: message handlers account for payloads carrying message `client_id`, not conversation `client_id`, by using a conversation-message query predicate.

## Validation evidence

- `npx tsc -p packages/cases/tsconfig.json --noEmit`: pass.
- `npm run typecheck`: pass.
- Conversation message predicate check: only query keys beginning with `["cases", "conversation-messages"]` match.

## Known gaps or deferred items

- App-level registry assembly and runtime Socket.IO validation are deferred to `PLAN_realtime_04_app_wiring_and_env_20260619`.
- The open clarification about message event payloads remains documented in the archived plan; current implementation uses the planned predicate strategy.

## Handoff notes

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_03_package_owned_handlers_cases_20260619_0843.md`
