# PLAN_task_customer_coordination_email_reply_20260706

## Metadata

- Plan ID: `PLAN_task_customer_coordination_email_reply_20260706`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-06T00:00:00Z`
- Last updated at (UTC): `2026-07-06T07:43:29Z`
- Related issue/ticket: `n/a`
- Intention plan: Provided inline by the user in chat on 2026-07-06 (no separate `INTENTION_*.md` document was authored). Full text and clarification round are captured under "Goal and intent" and "Decisions log" below.

**Revision note (same day):** the user redirected mid-planning from the generic `POST /api/v1/email-threads/{thread_id}/send` endpoint to the purpose-built `POST /api/v1/tasks/{task_id}/customer-coordination/reply` endpoint. This revision is a full rewrite of the send integration, not a patch — see "Decisions log" for what changed and why.

## Goal and intent

- Goal: Enable the currently-disabled "Reply" button in `EmailThreadFooter`. Tapping it opens a new slide surface in `@beyo/task-customer-coordination` that hosts `EmailComposer` unchanged. Sending calls `POST /api/v1/tasks/{task_id}/customer-coordination/reply`, invalidates the coordination threads list and the thread's message list, and closes both the new reply slide and returns the underlying inbox/thread carousel to the inbox pane.
- Business/user intent: Let a seller/manager/admin reply to a customer directly from the coordination email inbox thread view, without leaving the app, using the same `{{var}}`-template content system already used for the batch-send flow.
- Non-goals: Building a recipient-editing UI (the endpoint resolves the recipient itself — see below), building an "active email connection" picker UI, adding real-time re-sync after sending (existing invalidation is sufficient), changing `EmailInboxView` or the inbox list card UI, changing the batch-send (`CustomerCoordinationEmailSlidePage`) flow, changing `EmailComposer`.

## Scope

- In scope:
  - `@beyo/emails`: add a `resolveReplySubject` lib helper; add a required `onReply` callback + adjusted `replyDisabled` wiring to `EmailThreadFooter` and `EmailThreadView`. **`EmailComposer` itself is unchanged.**
  - `@beyo/task-customer-coordination`: new `types.ts` entries, new `api/post-coordination-reply.ts`, new `actions/use-send-coordination-reply.ts`, new surface id + surface-openers types (carrying both `taskId` and `threadId`), new controller `use-customer-coordination-email-reply-slide.controller.ts`, new page `CustomerCoordinationEmailReplySlidePage.tsx`, wiring changes in the existing inbox controller/page, `index.ts` exports.
  - Sellers app (`apps/selleres-app/ManagerBeyo-app-sellers`): register the new slide surface in `features/tasks/surfaces.ts`, wire the new opener in `features/home/components/HomeView.tsx`.
- Out of scope: Backend changes. Managers app (this feature is only wired into the sellers app today, matching the existing coordination email inbox/slide surfaces).
- Assumptions: none outstanding — every request/response/behavior claim below was read directly from backend source on 2026-07-06 (see "Domain schemas consulted"). This endpoint is **not documented in any handoff doc** — `HANDOFF_TO_FRONTEND_task_customer_coordination_email_and_counts_20260704.md` only documents the generic `POST /email-threads/{thread_id}/send` (a different endpoint, still used elsewhere for e.g. the existing thread-sync flow's implicit send path — not touched by this plan). Do not consult that handoff doc for this endpoint; the facts below supersede it entirely for the reply feature.

## Clarifications required

None outstanding.

### Decisions log

**Round 1 (2026-07-06, original design against `/email-threads/{thread_id}/send`):**
1. Connection resolution — omit `connection_client_id`, rely on backend auto-resolve.
2. Recipient (`to_addresses`) — resolve client-side from the last inbound message's `fromAddress` (fallback: last outbound message's `toAddresses[0]`).
3. Composer scope — reuse `EmailComposer` with template picker, accepting the (at-the-time verified-absent) risk that `{{vars}}` wouldn't be resolved.
4. Reply button enablement — enabled whenever the thread view is not loading.

**Round 2 (2026-07-06, superseding revision — this is the plan actually implemented below):**
The user redirected to `POST /api/v1/tasks/{task_id}/customer-coordination/reply`, a **different, purpose-built endpoint** (not the one in the handoff doc). Verified directly against `beyo_manager/services/commands/tasks/send_customer_coordination_reply.py`, `.../requests/send_customer_coordination_reply_request.py`, and the router at `beyo_manager/routers/api_v1/tasks.py:217-222,442-446`:

- **Decision 2 is superseded and moot**: this endpoint has no `to_addresses` field at all. The recipient is hard-resolved server-side from `task.customer.primary_email` (raises `ValidationError` — 422 — if the customer has no primary email). The frontend cannot send or override a recipient. **`resolveReplyToAddress` and any "To" field are dropped from this plan entirely.**
- **Decision 3 is superseded**: `{{var}}` substitution is confirmed **implemented and active** on this endpoint (it builds an `EnrichmentContext` from the task/customer/item and runs it through `ContentEnricher`/`VAR_PARSER_MAP` — the exact same machinery as the batch endpoint). Reusing `EmailComposer`'s template picker unchanged is now correct with **zero accepted risk** — templates with `{{vars}}` will resolve correctly.
- **Decision 1 still holds**: `connection_client_id` is optional; frontend omits it.
- **Decision 4 still holds**: Reply enabled whenever the thread view is not loading.
- **New requirement**: the endpoint takes `task_id` as a **path parameter**, not derivable from the thread alone by the frontend. Source: `EmailInboxThreadVM.majorEntityClientId` (already populated — see `mapCoordinationInboxThread.ts:40`, `raw.task.client_id`). This must be threaded through the new surface's props alongside `threadId`.
- **New requirement**: `subject` is optional server-side (falls back to the thread's latest message subject if omitted, still enriched). The frontend still always sends a computed subject (via `resolveReplySubject`, prefilled `Re: <original subject>`, editable) — simpler and more predictable than relying on the implicit server fallback, and keeps `sendDisabled` validation straightforward.

## Acceptance criteria

1. `EmailThreadFooter`'s "Reply" button is enabled whenever `CustomerCoordinationEmailInboxController.isMessagesLoading` is `false`, and tapping it opens the new `customer-coordination-email-reply-slide` surface for the currently selected thread, passing both its `taskId` (`selectedThread.majorEntityClientId`) and `threadId`.
2. The reply slide shows an unmodified `EmailComposer` with: template picker, a subject pre-filled with `Re: <original subject>` (no double `Re: Re:` on repeated replies, derived from the latest fetched message's subject), and an empty body — all editable.
3. The reply slide's footer has a "Back" and "Send" button, uses `useScrollHide()` (relative-mode progressive scroll animation) exactly like `EmailThreadFooter`/`EmailThreadView`, and visually matches the app's existing button styles verbatim (no new colors/classes).
4. Tapping "Back" closes only the reply slide, revealing the thread view underneath unchanged.
5. Tapping "Send" with a valid subject and body calls `POST /api/v1/tasks/{task_id}/customer-coordination/reply` with body `{ thread_client_id, subject, text_body, html_body }` and no `connection_client_id` and no recipient field of any kind. On success: the reply slide closes, the underlying inbox/thread carousel resets to the inbox pane (`activeIndex = 0`), and both `customerCoordinationEmailKeys` `"inbox-threads"` and `"thread-messages"` (for this thread) query caches are invalidated.
5b. On failure (e.g. 422 "Task customer does not have a primary email address for reply."), an error notification is shown via `notify.error` with the backend's message; the reply slide stays open with the user's input intact.
6. Send is disabled while `subject`/`text_body` are empty (after trim) or while the mutation/initial message fetch is pending.
7. `npm run typecheck` passes with zero errors across `@beyo/emails`, `@beyo/task-customer-coordination`, and the sellers app.

## Contracts and skills

### Contracts loaded

- `../architecture/01_architecture.md`: core (always)
- `../architecture/02_types.md`: core (always) — new Zod schemas/types for the reply request/response
- `../architecture/04_api_client.md`: core (always) — new `postCoordinationReply` API function
- `../architecture/05_server_state.md`: core (always) — no new query, but confirms invalidation/query-key conventions used by the new mutation
- `../architecture/06_client_state.md`: core (always)
- `../architecture/08_hooks.md`: core (always) — new `useSendCoordinationReply` action-hook shape (mutation + `onSettled` invalidation), matching `useSendEmailBatch`/`useMarkThreadRead`
- `../architecture/13_errors.md`: core (always) — error handling in the new controller's `handleSend`
- `../architecture/15_feature_structure.md`: core (always)
- `../architecture/07_components.md`: new footer component
- `../architecture/10_pages.md`: new `CustomerCoordinationEmailReplySlidePage`
- `../architecture/24_dto.md`: new response schema/type for `postCoordinationReply`
- `../architecture/28_surfaces.md` + `../architecture/28_surfaces_local.md`: new `slide` surface registration (this app only registers `slide`/`sheet`/`modal`, no `drawer`)
- `../architecture/30_dynamic_loading.md` + `../architecture/30_dynamic_loading_local.md`: `lazyWithPreload` + `loadCustomerCoordinationEmailReplySlidePage` export, matching the existing `loadCustomerCoordinationEmailInboxPage` pattern exactly
- `../architecture/36_scroll_visibility.md`: footer must use `useScrollHide()` (`mode: "relative"`, local pattern) — explicitly requested in the intention
- `../architecture/17_testing.md`: unit/component test conventions for the new lib helper, action hook, and controller
- `../architecture/34_runtime_validation.md` + `../architecture/34_runtime_validation_local.md`: Playwright spec + runtime validation pass

### Local extensions loaded

- `../architecture/28_surfaces_local.md`: confirms this app's surface type set is `page | slide | sheet | modal` (no `drawer`); the new surface is `slide`.
- `../architecture/30_dynamic_loading_local.md`: confirms `lazyWithPreload` utility path/usage and the `load<Page>` export convention already used by every other surface in this package.
- `../architecture/34_runtime_validation_local.md`: bootstrap status, fixture paths, npm scripts, credential env vars, spec location convention for the new Playwright spec.

### Excluded contracts

- `09_forms.md`: `EmailComposer` is unchanged (plain controlled inputs, no `react-hook-form`).
- `11_routing.md`: the new page is a stacked `slide` surface registered via `surfaceRegistry`, not a routed page.
- `12_auth.md`, `19_permissions.md`: no new role/permission gating beyond the existing `require_roles([ADMIN, MANAGER, SELLER])` already enforced server-side on this endpoint; frontend follows the same access as viewing the thread.
- `14_styling.md`: no new app/package bootstrap, no `@source` changes.
- `18_performance.md`: no virtualization/memoization concerns beyond existing patterns already used in this package.
- `21_realtime.md`: no new socket event; existing `postThreadSync`/`useCustomerCoordinationEmailSync` and the new query invalidation are sufficient to keep the thread fresh after sending.
- `23_providers.md`: no new context provider.
- `25`–`27`, `29`, `31`–`33`, `35`, `37`: no profile/persistence/scroll-container/animation/drawer/package-surface-boundary/keyboard-floating-input concerns beyond what's already covered by `36_scroll_visibility.md` and the exact reuse of existing button styles.

### File read intent — pattern vs. relational

Applying the test from `task_system/frontend_contract_goal_mapping_guide.md` before touching any implementation file outside this plan's explicit file manifest:

- Reading `EmailThreadView.tsx`, `EmailThreadFooter.tsx`, `EmailComposer.tsx`, `CustomerCoordinationEmailSlidePage.tsx`, `use-customer-coordination-email-slide.controller.ts`, `use-customer-coordination-email-inbox.controller.ts`, `CustomerCoordinationEmailInboxPage.tsx`, `surface-ids.ts` (both packages), `customer-coordination-email-keys.ts`, `types.ts` (both packages), `post-thread-read.ts`, `use-mark-thread-read.ts`, `get-thread-messages.ts`, `use-thread-messages-query.ts`, `map-coordination-inbox-thread.ts`, `map-email-message.ts`, `index.ts` (both packages), `HomeView.tsx`, `features/tasks/surfaces.ts`, `app/surface-registry.ts` was **relational** — establishing exact existing field names, exact className strings to copy verbatim, exact hook signatures, and exact surface-opener wiring pattern. All of this is "what exists," not "how to write."
- Reading backend source (`send_customer_coordination_reply.py`, `send_customer_coordination_reply_request.py`, `routers/api_v1/tasks.py`) was necessary because **no handoff doc documents this endpoint** — it is the only source of truth for the request/response contract this plan integrates with.
- Codex must **not** open any other feature's action/provider/controller file to learn hook/controller structure — `08_hooks.md`/`23_providers.md` already cover that, and this plan's own controllers above are sufficient direct precedent within the same package.
- **Styling directive (explicit, non-negotiable):** every className string in the new footer must be copied verbatim from `EmailThreadFooter.tsx`. Do not invent new colors, spacing, radii, or font sizes. See step 8 below for the exact strings to copy.

### Skill selection

- No skill invocation required — this is a plan-authoring task, not a code-writing task, run inline in this conversation.

## Domain schemas consulted

- `packages/emails/src/types.ts`: `EmailMessageVM`, `EmailInboxThreadVM`, `EmailThreadHeaderAction`, `EmailTemplate`.
- `packages/task-customer-coordination/src/types.ts`: `EmailMessageRaw`, `CoordinationInboxThreadRaw`, `SendEmailBatchResponseDataSchema`/`SendEmailBatchInput` (style precedent for the new `SendCoordinationReplyResponseDataSchema`/`SendCoordinationReplyInput`), `ThreadMessagesResult`.
- `packages/task-customer-coordination/src/lib/map-coordination-inbox-thread.ts:40`: confirms `EmailInboxThreadVM.majorEntityClientId` is already populated from `raw.task.client_id` — this is the `task_id` this plan's new endpoint call needs, no schema changes required to obtain it.
- Backend source (verified live on 2026-07-06, not from any handoff doc — this endpoint is undocumented in the handoff):
  - `beyo_manager/routers/api_v1/tasks.py:217-222` (`_SendCustomerCoordinationReplyBody`), `:442-446` (route decorator + role guard) — router contract: `POST /api/v1/tasks/{task_id}/customer-coordination/reply`, roles `ADMIN|MANAGER|SELLER`.
  - `beyo_manager/services/commands/tasks/requests/send_customer_coordination_reply_request.py` — inner validated model: `task_id` (from path), `thread_client_id: str` (min_length 1), `connection_client_id: str | None = None`, `subject: str | None` (min_length 1, max_length 255 when present), `text_body: str | None`, `html_body: str | None`, with a `model_validator` requiring at least one of `text_body`/`html_body`.
  - `beyo_manager/services/commands/tasks/send_customer_coordination_reply.py` — command body:
    - Loads task, thread, validates thread is a `TASK_CUSTOMER_COORDINATION` thread attached to this exact task (`_validate_coordination_thread`), loads the coordination record and cross-checks it belongs to the task.
    - Loads `customer = task.customer`; `if customer is None or not customer.primary_email: raise ValidationError(...)` — recipient is **always** `[customer.primary_email]`, never client-supplied.
    - `resolved_subject = request.subject or latest_message.subject if latest_message else request.subject`; raises `ValidationError` if still falsy.
    - Builds `EnrichmentContext(task=task, customer=customer, item=..., item_category=...)` from `_load_item_contexts` (imported from the batch command), then `enricher.enrich(...)` on subject/text_body/html_body — confirms `{{var}}` substitution is live on this path.
    - Delegates to `send_email(...)` with `{ thread_client_id, connection_client_id, to_addresses: [customer.primary_email], subject: <enriched>, text_body: <enriched|None>, html_body: <enriched|None> }` and returns `send_email`'s result verbatim: `{ enqueued: true, task_client_id, thread_client_id, message_client_id }`.
    - Connection resolution: delegates to `send_email`'s `_resolve_send_connection` — same auto-resolve semantics already relied on in this plan.
  - Error surface: `NotFound` (404) for missing task/thread/coordination; `ValidationError` (422) for wrong thread type/task mismatch/missing customer email/unresolvable subject/malformed body; `PermissionDenied` (403) if a resolved connection doesn't match the thread's own connection; standard FastAPI 422 for body schema violations.

## Implementation plan

Ordered bottom-up per `16_feature_workflow.md`: types → api → actions → lib helpers → components → controllers → pages → surface-ids/exports → app wiring → tests → validation.

1. **`packages/task-customer-coordination/src/types.ts`** — add:
   ```ts
   export type SendCoordinationReplyInput = {
     thread_client_id: string;
     subject: string;
     text_body: string | null;
     html_body?: string | null;
   };

   export const SendCoordinationReplyResponseDataSchema = z.object({
     enqueued: z.boolean(),
     task_client_id: z.string().nullable(),
     thread_client_id: z.string(),
     message_client_id: z.string(),
   });
   export type SendCoordinationReplyResponseData = z.infer<
     typeof SendCoordinationReplyResponseDataSchema
   >;
   ```
   No `connection_client_id` and no recipient field anywhere in `SendCoordinationReplyInput` — both are handled entirely server-side (see "Domain schemas consulted").

2. **`packages/task-customer-coordination/src/api/post-coordination-reply.ts`** (new file) — follow the exact structure of `post-email-batch.ts`. Note the URL is task-scoped, not thread-scoped:
   ```ts
   import { z } from "zod";

   import { apiClient } from "@beyo/api-client";
   import { ApiEnvelopeSchema } from "@beyo/lib";

   import { SendCoordinationReplyResponseDataSchema } from "../types";
   import type {
     SendCoordinationReplyInput,
     SendCoordinationReplyResponseData,
   } from "../types";

   const PostCoordinationReplyResponseSchema = ApiEnvelopeSchema(
     SendCoordinationReplyResponseDataSchema,
   ).extend({ ok: z.literal(true) });

   export async function postCoordinationReply(
     taskId: string,
     input: SendCoordinationReplyInput,
   ): Promise<SendCoordinationReplyResponseData> {
     const parsed = await apiClient.post(
       `/api/v1/tasks/${taskId}/customer-coordination/reply`,
       PostCoordinationReplyResponseSchema,
       input,
     );

     return parsed.data;
   }
   ```

3. **`packages/task-customer-coordination/src/actions/use-send-coordination-reply.ts`** (new file) — mirror `use-mark-thread-read.ts`'s `onSettled` invalidation style (no optimistic update needed):
   ```ts
   import { useMutation, useQueryClient } from "@tanstack/react-query";

   import { customerCoordinationEmailKeys } from "../api/customer-coordination-email-keys";
   import { postCoordinationReply } from "../api/post-coordination-reply";
   import type { SendCoordinationReplyInput } from "../types";

   export function useSendCoordinationReply() {
     const queryClient = useQueryClient();

     const mutation = useMutation({
       mutationFn: ({
         taskId,
         input,
       }: {
         taskId: string;
         input: SendCoordinationReplyInput;
       }) => postCoordinationReply(taskId, input),
       onSettled: (_data, _error, variables) => {
         void queryClient.invalidateQueries({
           queryKey: [...customerCoordinationEmailKeys.all, "inbox-threads"],
         });
         void queryClient.invalidateQueries({
           queryKey: [
             ...customerCoordinationEmailKeys.all,
             "thread-messages",
             variables.input.thread_client_id,
           ],
         });
       },
     });

     return {
       ...mutation,
       sendCoordinationReply: mutation.mutateAsync,
     };
   }
   ```
   The two `invalidateQueries` calls use deliberately partial keys (no params/limit/offset suffix) — TanStack Query's default matching treats a given key as a prefix, so this invalidates every params variant of both query families, matching the exact technique already used in `use-mark-thread-read.ts`.

4. **`packages/emails/src/lib/resolve-reply-subject.ts`** (new file):
   ```ts
   export function resolveReplySubject(originalSubject: string | null): string {
     const trimmed = (originalSubject ?? "").trim();
     if (!trimmed) return "Re: Conversation";
     return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
   }
   ```

5. **`packages/emails/src/components/EmailThreadFooter.tsx`** — add a required `onReply: () => void` prop; wire it to the Reply button's `onClick`; keep `replyDisabled` as an external prop (caller now controls it based on loading state, not a hardcoded `true`):
   ```tsx
   type EmailThreadFooterProps = {
     onBack: () => void;
     onReply: () => void;
     replyDisabled?: boolean;
   };
   ```
   ```tsx
   <button
     className="rounded-2xl bg-primary px-5 py-3.5 text-md font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
     disabled={replyDisabled}
     type="button"
     onClick={onReply}
   >
     Reply
   </button>
   ```
   No other className changes.

6. **`packages/emails/src/components/EmailThreadView.tsx`** — add a required `onReply: () => void` prop to `EmailThreadViewProps`; forward it to `<EmailThreadFooter replyDisabled={footerReplyDisabled} onBack={onBack} onReply={onReply} />`.

7. **`packages/task-customer-coordination/src/surface-ids.ts`** — add:
   ```ts
   export const CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID =
     "customer-coordination-email-reply-slide";

   export type CustomerCoordinationEmailReplySlideSurfaceOpeners = EmailsSurfaceOpeners & {
     closeSurface?: () => void;
     onSent?: () => void;
   };

   export type CustomerCoordinationEmailReplySlideSurfaceProps = {
     taskId: string;
     threadId: string;
     surfaceOpeners?: CustomerCoordinationEmailReplySlideSurfaceOpeners;
   };
   ```
   Also extend `CustomerCoordinationEmailInboxSurfaceOpeners` with:
   ```ts
   openEmailReplySlide?: (props: {
     taskId: string;
     threadId: string;
     onSent?: () => void;
   }) => void;
   ```

8. **`packages/task-customer-coordination/src/controllers/use-customer-coordination-email-reply-slide.controller.ts`** (new file):
   ```ts
   import { useState } from "react";

   import { resolveReplySubject } from "@beyo/emails";
   import { notify } from "@beyo/lib";
   import type { EmailTemplate } from "@beyo/emails";

   import { useSendCoordinationReply } from "../actions/use-send-coordination-reply";
   import { useThreadMessagesQuery } from "../api/use-thread-messages-query";
   import type { CustomerCoordinationEmailReplySlideSurfaceOpeners } from "../surface-ids";

   type UseCustomerCoordinationEmailReplySlideControllerParams = {
     taskId: string;
     threadId: string;
     surfaceOpeners?: CustomerCoordinationEmailReplySlideSurfaceOpeners;
   };

   export type CustomerCoordinationEmailReplySlideController = {
     isLoading: boolean;
     isError: boolean;
     subject: string;
     textBody: string;
     selectedTemplate: EmailTemplate | null;
     isSending: boolean;
     sendDisabled: boolean;
     closeSurface?: () => void;
     setSubject: (value: string) => void;
     setTextBody: (value: string) => void;
     applyTemplate: (template: EmailTemplate) => void;
     handleSend: () => Promise<boolean>;
   };

   export function useCustomerCoordinationEmailReplySlideController({
     taskId,
     threadId,
     surfaceOpeners,
   }: UseCustomerCoordinationEmailReplySlideControllerParams): CustomerCoordinationEmailReplySlideController {
     const messagesQuery = useThreadMessagesQuery(threadId, { limit: 200, offset: 0 });
     const sendCoordinationReply = useSendCoordinationReply();

     const [subjectOverride, setSubjectOverride] = useState<string | null>(null);
     const [textBody, setTextBody] = useState("");
     const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

     const messages = messagesQuery.data?.messages ?? [];
     const latestSubject = messages.at(-1)?.subject ?? null;
     const subject = subjectOverride ?? resolveReplySubject(latestSubject);

     const trimmedSubject = subject.trim();
     const trimmedTextBody = textBody.trim();
     const sendDisabled =
       trimmedSubject.length === 0 ||
       trimmedTextBody.length === 0 ||
       messagesQuery.isPending ||
       sendCoordinationReply.isPending;

     function applyTemplate(template: EmailTemplate): void {
       setSelectedTemplate(template);
       setSubjectOverride(template.subject);
       setTextBody(template.text_body);
     }

     async function handleSend(): Promise<boolean> {
       if (sendDisabled) {
         return false;
       }

       try {
         await sendCoordinationReply.sendCoordinationReply({
           taskId,
           input: {
             thread_client_id: threadId,
             subject: trimmedSubject,
             text_body: trimmedTextBody,
             html_body: null,
           },
         });

         notify.success("Reply sent.");
         return true;
       } catch (error) {
         notify.error(
           error instanceof Error ? error.message : "The reply could not be sent.",
         );
         return false;
       }
     }

     return {
       isLoading: messagesQuery.isPending,
       isError: messagesQuery.isError,
       subject,
       textBody,
       selectedTemplate,
       isSending: sendCoordinationReply.isPending,
       sendDisabled,
       closeSurface: surfaceOpeners?.closeSurface,
       setSubject: setSubjectOverride,
       setTextBody,
       applyTemplate,
       handleSend,
     };
   }
   ```
   Note: `messagesQuery` reuses the exact same query key as the inbox controller's own `useThreadMessagesQuery(selectedThreadId, { limit: 200, offset: 0 })` call — since both are mounted at the same time (reply slide stacks on top of the still-mounted inbox page), this reads from the already-populated TanStack Query cache instead of issuing a duplicate network request. It is used here only to derive the subject prefill (`latestSubject`) — there is no recipient to resolve.

9. **`packages/task-customer-coordination/src/pages/CustomerCoordinationEmailReplySlidePage.tsx`** (new file) — structure copied from `EmailThreadView`'s top-level wrapper (`useScrollHide`) and `CustomerCoordinationEmailSlidePage`'s `ContentCard`-wrapped composer step. `EmailComposer` usage is **identical** to the batch-send page's usage (no new props):
   ```tsx
   import { useEffect } from "react";
   import { ArrowLeft } from "lucide-react";

   import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
   import { ContentCard, useScrollHide } from "@beyo/ui";
   import { EmailComposer } from "@beyo/emails";

   import { useCustomerCoordinationEmailReplySlideController } from "../controllers/use-customer-coordination-email-reply-slide.controller";
   import type { CustomerCoordinationEmailReplySlideSurfaceProps } from "../surface-ids";

   function CustomerCoordinationEmailReplyFooter({
     isSending,
     sendDisabled,
     onBack,
     onSend,
   }: {
     isSending: boolean;
     sendDisabled: boolean;
     onBack: () => void;
     onSend: () => void;
   }): React.JSX.Element {
     return (
       <div
         className="absolute bottom-0 left-0 right-0 z-20"
         style={{
           transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
           opacity: "calc(1 - var(--scroll-hide-progress, 0))",
           transition:
             "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
         }}
       >
         <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
           <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
             <button
               className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-medium text-primary shadow-sm"
               type="button"
               onClick={onBack}
             >
               <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
               <span>Back</span>
             </button>
             <button
               className="rounded-2xl bg-primary px-5 py-3.5 text-md font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
               disabled={sendDisabled}
               type="button"
               onClick={onSend}
             >
               {isSending ? "Sending..." : "Send"}
             </button>
           </div>
           <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
         </div>
       </div>
     );
   }

   export function CustomerCoordinationEmailReplySlidePage(): React.JSX.Element {
     const props = useSurfaceProps<CustomerCoordinationEmailReplySlideSurfaceProps>();
     const header = useSurfaceHeader();
     const { scrollRef, hideProgressContainerRef } = useScrollHide();
     const controller = useCustomerCoordinationEmailReplySlideController({
       taskId: props.taskId,
       threadId: props.threadId,
       surfaceOpeners: props.surfaceOpeners,
     });

     useEffect(() => {
       header?.setHeaderHidden(true);
       return () => {
         header?.setHeaderHidden(false);
       };
     }, [header]);

     function closeSurface(): void {
       if (props.surfaceOpeners?.closeSurface) {
         props.surfaceOpeners.closeSurface();
         return;
       }
       header?.requestClose();
     }

     async function handleSend(): Promise<void> {
       const success = await controller.handleSend();
       if (success) {
         props.surfaceOpeners?.onSent?.();
         closeSurface();
       }
     }

     return (
       <div ref={hideProgressContainerRef} className="relative flex h-full flex-col">
         <div
           ref={scrollRef}
           className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-y-none"
         >
           <div className="flex min-h-full flex-col pt-4 pb-[calc(var(--safe-bottom,0)+7rem)]">
             <div className="mx-4">
               <ContentCard>
                 <div className="py-4">
                   <EmailComposer
                     disabled={controller.isSending}
                     selectedTemplate={controller.selectedTemplate}
                     subject={controller.subject}
                     surfaceOpeners={props.surfaceOpeners}
                     textBody={controller.textBody}
                     onSelectTemplate={controller.applyTemplate}
                     onSubjectChange={controller.setSubject}
                     onTextBodyChange={controller.setTextBody}
                   />
                 </div>
               </ContentCard>
             </div>
           </div>
         </div>

         <CustomerCoordinationEmailReplyFooter
           isSending={controller.isSending}
           sendDisabled={controller.sendDisabled}
           onBack={closeSurface}
           onSend={() => {
             void handleSend();
           }}
         />
       </div>
     );
   }
   ```
   This is the only file in the plan that defines new JSX layout from scratch (the footer + scroll wrapper); every className used above is copied verbatim from `EmailThreadFooter.tsx`/`EmailThreadView.tsx`/`CustomerCoordinationEmailSlidePage.tsx` — do not introduce new ones.

10. **`packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts`** — add:
    ```ts
    function openReplySlide(): void {
      if (!selectedThreadId || !selectedThread?.majorEntityClientId) {
        return;
      }

      surfaceOpeners?.openEmailReplySlide?.({
        taskId: selectedThread.majorEntityClientId,
        threadId: selectedThreadId,
        onSent: goBack,
      });
    }
    ```
    Add `openReplySlide: () => void;` to `CustomerCoordinationEmailInboxController` type and to the returned object. (`selectedThread.majorEntityClientId` is always populated for coordination threads per `mapCoordinationInboxThread.ts:40` — the guard is defensive, not expected to trigger in normal use.)

11. **`packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx`** — update the `EmailThreadView` usage:
    ```tsx
    <EmailThreadView
      error={controller.messagesError}
      footerReplyDisabled={controller.isMessagesLoading}
      headerActions={controller.threadHeaderActions}
      isLoading={controller.isMessagesLoading}
      isSyncing={controller.isMessagesSyncing}
      messages={controller.messages}
      subject={controller.selectedSubject}
      onBack={controller.goBack}
      onOpenMessageDetails={controller.openMessageDetails}
      onRefreshThread={controller.refreshThread}
      onReply={controller.openReplySlide}
    />
    ```

12. **`packages/task-customer-coordination/src/index.ts`** — add exports:
    ```ts
    export { SendCoordinationReplyResponseDataSchema } from "./types";
    export type {
      SendCoordinationReplyInput,
      SendCoordinationReplyResponseData,
    } from "./types";
    export { postCoordinationReply } from "./api/post-coordination-reply";
    export { useSendCoordinationReply } from "./actions/use-send-coordination-reply";
    export { CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID } from "./surface-ids";
    export type {
      CustomerCoordinationEmailReplySlideSurfaceOpeners,
      CustomerCoordinationEmailReplySlideSurfaceProps,
    } from "./surface-ids";
    export {
      useCustomerCoordinationEmailReplySlideController,
      type CustomerCoordinationEmailReplySlideController,
    } from "./controllers/use-customer-coordination-email-reply-slide.controller";
    export { CustomerCoordinationEmailReplySlidePage } from "./pages/CustomerCoordinationEmailReplySlidePage";
    ```
    And add, next to the existing `loadCustomerCoordinationEmailInboxPage`:
    ```ts
    export function loadCustomerCoordinationEmailReplySlidePage() {
      return import("./pages/CustomerCoordinationEmailReplySlidePage").then((m) => ({
        default: m.CustomerCoordinationEmailReplySlidePage,
      }));
    }
    ```

13. **`packages/emails/src/index.ts`** — add export:
    ```ts
    export { resolveReplySubject } from "./lib/resolve-reply-subject";
    ```

14. **`apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts`** — import `CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID` and `loadCustomerCoordinationEmailReplySlidePage` from `@beyo/task-customer-coordination` (same import line as the existing `CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID`/`loadCustomerCoordinationEmailInboxPage`). Add:
    ```ts
    const customerCoordinationEmailReplySlide = lazyWithPreload(
      loadCustomerCoordinationEmailReplySlidePage,
    );
    ```
    next to `customerCoordinationEmailInboxSlide`, and register it in the surfaces map:
    ```ts
    [CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID]: {
      surface: "slide",
      component: customerCoordinationEmailReplySlide.Component,
    },
    ```
    next to the `CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID` entry.

15. **`apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/components/HomeView.tsx`** — inside `openCustomerCoordinationEmailInboxSurface`, add `openEmailReplySlide` to the `surfaceOpeners` object passed to `CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID`:
    ```ts
    openEmailReplySlide: ({ taskId, threadId, onSent }) => {
      surface.open(CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID, {
        taskId,
        threadId,
        surfaceOpeners: {
          closeSurface: () =>
            surface.close(CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID),
          openEmailTemplatePicker: (templateProps) => {
            surface.open(
              EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID,
              templateProps satisfies EmailTemplatePickerSheetSurfaceProps,
            );
          },
          onSent,
        },
      } satisfies CustomerCoordinationEmailReplySlideSurfaceProps);
    },
    ```
    Add `CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID` and `CustomerCoordinationEmailReplySlideSurfaceProps` to the existing `@beyo/task-customer-coordination` import at the top of `HomeView.tsx`.

16. Unit/component tests (`17_testing.md`):
    - `resolveReplySubject` — cases: `null`/empty → `"Re: Conversation"`; plain subject → prefixed; already-prefixed (`"Re: ..."`, case-insensitive) → unchanged.
    - `useCustomerCoordinationEmailReplySlideController` — `sendDisabled` true/false transitions; `handleSend` success path calls `sendCoordinationReply` with `{ taskId, input: { thread_client_id, subject, text_body, html_body: null } }` and no recipient/connection keys; failure path calls `notify.error` and returns `false`, does not throw.

17. Playwright spec (`34_runtime_validation.md`/`_local.md`): add a spec under the existing coordination-email feature spec directory covering: open inbox → open a thread → tap Reply → composer shows the `Re: <subject>` prefill → type a body → tap Send → assert the mocked `POST /api/v1/tasks/:taskId/customer-coordination/reply` request body has exactly `{ thread_client_id, subject, text_body }` (no `to_addresses`, no `connection_client_id`) and the URL's `:taskId` matches the selected thread's task → assert the reply slide closes and the view lands back on the inbox pane (not the thread pane).

## Risks and mitigations

- Risk: The endpoint raises `ValidationError` (422, "Task customer does not have a primary email address for reply.") when the linked task's customer has no `primary_email`. The frontend has no way to detect or prevent this ahead of time (no customer-email field is surfaced in the reply composer).
  Mitigation: `handleSend`'s `catch` surfaces this message via `notify.error` as-is — it's already a clear, actionable message; no special-casing needed. Accepted as normal error-path behavior, consistent with how the batch-send flow already surfaces its own `no_customer_email` skip reason.
- Risk: `resolveReplySubject`'s prefill could compound oddly if the thread's latest message subject is from an *inbound* message with a locale-specific reply prefix (e.g. "SV:" in Swedish clients) instead of "Re:".
  Mitigation: out of scope for this plan — the regex only recognizes `Re:` case-insensitively, matching the existing backend convention note ("Convention: prefix with `Re: `"); a `SV: SV: ...` style build-up would only happen if the customer's mail client uses a different prefix, which is a pre-existing cross-client-convention concern, not something this endpoint or plan introduces.
- Risk: `_resolve_send_connection` can still raise `404`/`422` for `SELLER` actors with zero or multiple active connections tied to the thread's own connection mismatch (`PermissionDenied`, 403, "You can only send from the email connection attached to this thread.").
  Mitigation: same generic `notify.error` handling as above; no special-casing needed since the message is already actionable.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/emails`, `@beyo/task-customer-coordination`, and `apps/selleres-app/ManagerBeyo-app-sellers`.
- `npm run test -- --grep "resolveReplySubject|CustomerCoordinationEmailReplySlideController"`: all new unit/component tests pass.
- `npx playwright test --grep "customer coordination email reply" --project=mobile`: passes, including the assertion on the exact request URL/body shape.
- `npx playwright test --grep "customer coordination email reply" --project=desktop`: passes.
- Manual runtime pass (per `34_runtime_validation_local.md`): open the sellers app, open the coordination email inbox, open a thread, tap Reply, confirm footer scroll-hides identically to the thread view's footer, pick a template with a `{{var}}` (e.g. `{{customer_name}}`) and confirm it resolves in the actual sent/persisted message (check via `GET /email-threads/{thread_id}/messages` or the thread view after invalidation), confirm the app lands back on `EmailInboxView`.

## Review log

- 2026-07-06, user: redirected from `POST /email-threads/{thread_id}/send` to `POST /api/v1/tasks/{task_id}/customer-coordination/reply`. Plan rewritten in full (recipient resolution and "To" field dropped; `taskId` threading added; var-substitution risk removed as resolved-by-design on the new endpoint).

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: user (David)
