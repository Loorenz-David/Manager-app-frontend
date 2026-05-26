# Intention of Cases and Case Conversations

## Purpose

We are beginning construction of the **Cases** area for the ManagerBeyo Managers application.
The backend cases system is polymorphic. A case can be linked to any supported backend entity registered in the case-link system. The frontend should be designed with this polymorphic model in mind, but the first implementation focus is cases created from, linked to, or centered around **tasks**.
This document is not the implementation plan. It is the high-level product and architecture intention that Claude should use to create staged implementation plans after researching the current architecture, frontend contracts, primitives, feature structure, backend handoff, and design conventions.
The backend API contract for the cases system is documented here:

```txt
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md

The first frontend implementation area is:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/cases

Product goal

Build a mobile-first Cases page and Case Conversation page that behave like a modern social chat interface while staying fully integrated with the application’s task workflow, image system, future voice-message system, slide surfaces, design tokens, and backend-owned case domain.

Cases should help users discuss operational issues around tasks, items, customers, returns, upholstery work, delivery questions, fixing requirements, or other future polymorphic entities.

The experience should feel fast, reliable, and native on mobile devices.

The implementation should be divided into staged plans that can be implemented safely without leaving the app half-broken. Each stage should produce either a working vertical slice or a stable foundation for later stages.

Architecture intent

The frontend should own the case and chat user experience, but it should not create a separate chat-domain architecture that conflicts with the backend cases system.

The backend owns:

* Case entities
* Case states
* Case links
* Participants
* Conversations
* Messages
* Message sequence numbers
* Unread/read tracking
* Message content validation
* Message persistence

The frontend owns:

* Cases page layout
* Case card presentation
* Case grouping and filtering UI
* Case detail / conversation slide page
* Chat message rendering
* Rich message composer behavior
* Optimistic UX where appropriate
* Image attachment integration
* Future voice-message integration
* Mobile keyboard and surface interactions
* Mapping between rich editor state and the backend message content DTO

The implementation should respect existing frontend architecture contracts, including feature boundaries, primitives, slide surfaces, app tokens, and the existing image feature.

Backend contract constraints

All case endpoints use the shared response envelope:

{
  "ok": true,
  "data": {},
  "warnings": []
}

Failures use:

{
  "ok": false,
  "error": "..."
}

Several backend endpoints currently require IDs both in the path and in the request body. The frontend must preserve this behavior when calling those endpoints, even when the path ID is the authoritative value. on the creationg of instances the frontend generated the client ids through the utility ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts ), as this allows for the frontend to handle optimistic behaviour, giving the creation and update a sensation of fast response.

The implementation must use backend enum values exactly as documented:

Case state:
- open
- resolving
- resolved
Case link entity type:
- task
- customer
Case link role:
- origin
- subject
- context
- actor
- resolution
Message content block type:
- text
- mention
- label
- link

The current backend message content format is an array of content blocks. Each block must include type and text.

Optional block-specific fields include:

mention
label_value
link

The frontend should validate these values before submission to avoid unnecessary backend validation errors. the frontend will implemnet more block-specific fields with when we start implementing the content builder, as this will introduce new types like animation.




Cases page UI

The Cases page should be mobile-first and visually aligned with the current ManagerBeyo app styling.

The page header has three rows.

Header row 1

The first row displays the page title:

Cases

At the end of the row there is a History button.

The button should use:

background: var(--color-card);
box-shadow: md;

Header row 2

The second row displays the user’s current date in a friendly format.

Example:

25th December, Thursday

The date should be based on the user’s local date.

Header row 3

The third row contains the existing primitive search bar:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/search-bar

The search should eventually connect to the backend q filter.

Backend q search can match:

* Case type labels
* Message plain text
* Task-linked article numbers
* Task-linked SKUs

Case list grouping

The Cases page list is divided into three sections:

New (#)
Active (#)
Resolving (#)

Where # is the number of cases in that section.

Grouping rules:

New:
- Cases created today according to the user's local date.
Active:
- Cases in backend state open.
Resolving:
- Cases in backend state resolving.

The implementation plan should decide how to avoid confusing duplication if a case is both New and open.

The likely product intent is that New is a highlighted grouping for today’s cases, while Active represents ongoing open cases. Claude should inspect the existing UI conventions before finalizing the grouping behavior.

Case card UI

Each case card should communicate the case context quickly.

A case card includes:

* User avatar or profile picture for the user who opened the case
* Case type label
* Unread conversation count
* Name of the user who opened the case
* Article number or SKU for the task-linked item, when available
* Created time
* Bold right arrow icon

Layout intent:

[Avatar] [Case type]
         [User name • Article/SKU]
                         [Created time] [>]

Detailed layout rules:

* Avatar is placed on the left.
* Case type appears to the right of the avatar.
* Below the case type, render the user’s name.
* On the same metadata row, separate the user name from the article number or SKU with a • separator.
* Created time is vertically centered toward the right side of the card.
* A bold > style arrow appears at the far right.
* Tapping a case card opens the case detail conversation page.

Created time formatting:

If created today:
- Show only the time.
If created within the same week:
- Show relative day format.
- Example: 3 days ago
If older:
- Show compact date and time.
- Example: yy-mm-dd hh:mm

Case detail / conversation page

The case detail page is where the case conversation lives.

It should follow modern social chat principles and feel optimized for mobile interaction.

The page should be rendered inside the existing slide page surface system. It should not use the default slide page header because the case conversation page renders its own fixed header.

The whole page background should use:

--color-background

Message bubble styling:

Other users' messages:
- background: var(--color-card)
Current user's messages:
- background: var(--color-primary)

Case conversation header

The conversation page has its own fixed header.

The fixed header includes:

* Back arrow button
* Article number or SKU of the task-linked item
* Task type
* Task return source, if any
* Info button
* Case state action button

The back arrow closes the conversation page.

The article number or SKU is displayed as the main header label.

Below the article number or SKU, display:

Task type • Task return source

If there is no return source, only render the task type.

The info button opens a bottom sheet surface with some extra data of the task in a task card having   item image, task state. we will add more interactions to that bottom sheet, actions that will allow the user to expand the participants, and configure other case settings, for now it will only help as a extra task data. that task card can be tapped, opening the task detail page. check the current task card to check how to open the task detail page ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskListCard.tsx ).

The case state action button appears on the right side of the main header row.

State button behavior:

If current case state is open:
- Button label: Process
- Tapping changes the case state to resolving
- After successful state change, close the current conversation page
If current case state is resolving:
- Button label: Resolve
- Tapping changes the case state to resolved
- After successful state change, close the current conversation page

Important backend naming note:

The backend state is resolving, not processing.

The UI label may say Process, but the backend value must be resolving.

Case context banner

Below the main fixed header, there is a secondary context row.

This row is part of the fixed header area but should behave like a collapsible context banner.

The banner contains:

* Case type in bold
* Case creation date and time

The banner background should use:

--color-primary

Interaction behavior:

* When the user scrolls the conversation upward, the context banner should smoothly slide up and fade out.
* This gives the user more room to read the conversation.
* The animation should feel smooth and intentional.
* The main fixed header remains visible.

Conversation message layout

A chat conversation message is composed of:

* User avatar/profile picture
* Message content container
* Sent time at the bottom-right of the message container

Date separators are rendered inside the message list as centered rows.

Example layout:

            yy-mm-dd
[V] message from another user
              hh:mm
                  message from current user [A]
                              hh:mm

Message list rules:

* Messages should be grouped visually by date.
* Date separators should be centered.
* Other users’ messages align to the left.
* The current user’s messages align to the right.
* Other users’ avatars appear on the left.
* The current user’s avatar can appear on the right if the final UI direction needs it.
* Message time is displayed at the bottom-right inside or near the message bubble.
* Soft-deleted messages should render as deleted-message placeholders rather than breaking the list.

Message content model

The content of a chat message is an object-oriented JSON structure, not plain text only.

This is required because a chat message may contain:

* Plain text
* Mentions
* Labels
* Links
* Lightweight custom styling
* Future image references
* Future voice-message references
* Future custom domain blocks

The current backend supports content blocks with these types:

text
mention
label
link

The frontend should build a clean adapter layer so the editor does not leak its internal structure into the backend contract.

The intended data flow is:

Lexical editor state
→ frontend adapter
→ app-owned ChatMessageContent DTO
→ backend JSONB content blocks
→ chat bubble renderer reads the app-owned DTO / backend content blocks

The renderer should not depend directly on Lexical internals.

Rich text and styling intent

The chat composer should support lightweight message styling.

This should not become a heavy document editor. It should feel like a social chat composer with a small set of expressive formatting tools.

Supported styling intentions:

* Bold
* Underline
* Big text
* Small text
* Color
* Shake animation
* Pulse animation
* Mention

The app should build its own lightweight styling semantics rather than exposing a full Markdown editor.

The goal is not traditional Markdown. The goal is app-owned message styling that can be serialized, validated, stored, and rendered consistently.

Composer interaction

The user writes a message in the composer.

Above the input there is a simple styling menu with buttons such as:

Bold | Underline | Big | Small | Color | Shake | Pulse | Mention

Interaction process:

User writes message
→ User places cursor after a word or selects text
→ User taps a styling button
→ The selected text or previous word receives the selected style
→ The style animation plays once on selection if applicable
→ User can select already styled text
→ The matching style button appears selected
→ User can tap the selected style button again to remove that style
→ User sends message
→ Frontend serializes editor content to JSON
→ Backend stores content in JSONB
→ Chat bubble renderer reads JSON and renders the custom message content

If the user has no active text selection, the styling action should apply to the previous written word or current active word, depending on what is most reliable with the selected editor library.

Claude should research the best practical behavior for this based on Lexical and mobile input reliability.

Bottom sheet styling interactions

Some styling buttons open a bottom sheet for more options.

Example:

Color button
→ Opens bottom sheet
→ Bottom sheet displays a simple color palette
→ User selects final color
→ Bottom sheet closes
→ Keyboard reopens
→ Cursor/focus returns to the exact previous input position
→ User continues typing with the selected style applied

This interaction must be extremely smooth and reliable.

Target behavior:

* User taps a style option that opens a bottom sheet.
* Keyboard closes because the bottom sheet opens.
* User makes a final selection.
* Bottom sheet closes.
* Keyboard opens again.
* Input focus returns where the user left the cursor.
* The selected styling is applied correctly.
* User can continue typing without losing context.



This needs special attention on both iPhone and Android because keyboard, focus, viewport, and bottom sheet interactions can be unstable.

If this cannot be made reliable using native keyboard behavior, we may later consider building our own lightweight custom keyboard/control surface for the chat composer to gain full control over layout shifts.

That custom keyboard is not necessarily part of the first implementation, but the architecture should not block it.

Other behaviour we will add later is mentions, which will allow to add @user on the content, which will display a list of options as the user types the name ( but that is later ), this first implementation should not block those types of integrations later.

Libraries to consider

The implementation should build app-owned case and chat primitives, not adopt a full external chat product SDK.

Do not introduce a full chat backend/product SDK such as Stream Chat. The backend already owns the case and conversation domain.

Focused frontend libraries may be used for specific hard problems.



Recommended libraries:

Textarea autosize:
- react-textarea-autosize
Gesture handling:
- @use-gesture/react
Message list virtualization / scroll stability:
- react-virtuoso
- @virtuoso.dev/message-list
Rich text editor:
- lexical
- @lexical/react

this libraries are already installed:  lexical @lexical/react @lexical/link @lexical/selection @lexical/utils @use-gesture/react react-textarea-autosize react-virtuoso . if the message list becomes complex enough, we can evaluate @virtuoso.dev/message-list.

The most important library decision is message list virtualization and scroll stability.

The chat message list should not be hand-rolled if the app needs:

* Stable scroll-to-bottom behavior
* Loading older messages
* Prepending older messages without jump
* Variable-height messages
* Images that load after render
* Long histories
* Mobile performance

Claude should evaluate whether react-virtuoso or @virtuoso.dev/message-list is the better fit for the current app architecture.

Image and voice message integration

Users should eventually be able to take pictures directly from the case conversation.

The existing image system lives here:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/images

The case conversation should integrate with this existing image system instead of creating a separate image implementation. (/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/images)

The current images feature is already entity-generic and supports case images, not only item images.

Key evidence:

Supported entity types explicitly include case in src/features/images/types.ts.
All request/input schemas are parameterized by entity_type and entity_client_id in src/features/images/types.ts.
The provider takes entityType + entityClientId as props in src/features/images/providers/EntityImagesProvider.tsx.
The main controller is built around entityType/entityClientId and uses that everywhere for fetch/upload/reorder/unlink in src/features/images/controllers/use-entity-images.controller.ts.
Store/cache keys are generic by entity key, not item-specific, in src/features/images/store/images.store.ts and src/features/images/api/image-keys.ts.

Voice messages are under development and should follow a similar polymorphic attachment style as images.

The initial case conversation architecture should leave room for:

* Image attachment blocks
* Voice message attachment blocks
* Upload progress
* Failed upload states
* Retry behavior
* Attachment previews
* Attachment rendering inside message bubbles

Even if image and voice message sending are not fully implemented in the first stage, the message model and UI structure should not block them.

State and API integration

The Cases page and Case Conversation page should integrate against the backend endpoints documented in:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md

Important backend integration points:

* List cases
* Search cases
* Get one case
* Update case state
* List case links
* List participants
* Create conversation
* Get conversation
* List messages
* Send message
* Edit message
* Soft delete message
* Get unread counts
* Mark participant read position

The implementation should use the existing frontend data-fetching conventions and should not invent an incompatible data layer.

Claude should inspect the current app conventions before choosing the exact data fetching and cache invalidation strategy.

Implementation staging intent

Because this feature is complex, implementation must be divided into stages that do not conflict with each other and do not leave the app half-broken.

The staged plans should likely be divided around these concerns:

Stage 1:
- Cases feature/page foundation
- Types and DTOs
- API client integration
- Backend response envelope handling
- Basic case list rendering
Stage 2:
- Cases page UI
- Header rows
- Search bar integration
- Grouping into New / Active / Resolving
- Case cards
Stage 3:
- Case detail slide page foundation
- Fixed conversation header
- Context banner
- State transition button
- Task info opening
Stage 4:
- Message list foundation
- Message fetching
- Date separators
- Left/right message layout
- Deleted message handling
- Virtualization / scroll stability
Stage 5:
- Basic message composer
- Send message
- Optimistic UX if appropriate
- Mark-read behavior
- Unread count refresh
Stage 6:
- Rich text composer foundation
- Lexical integration
- Editor-to-DTO adapter
- DTO-to-renderer adapter
- Styling controls
Stage 7:
- Bottom sheet styling interactions
- Color picker / mention picker
- Keyboard focus restoration
- Mobile reliability testing
Stage 8:
- Image attachment integration
- Future voice-message placeholders
- Upload / retry / preview behavior

Claude may adjust the exact staging after researching the current architecture, but the final plans should preserve the intent that each stage is independently understandable, safe to implement, and does not require a large broken intermediate state.

Non-goals for the first implementation

The first implementation should not try to solve everything at once.

Avoid introducing:

* A third-party full chat backend SDK
* A separate chat-domain model that duplicates backend cases
* Heavy document-editor UX
* Full Markdown support
* A new image system
* A new slide surface system
* A custom keyboard unless native keyboard behavior proves unreliable
* Complex realtime behavior unless the current app architecture already provides the right foundation

The first version should prioritize a stable, well-architected foundation that can grow into richer chat behavior.
```

## Linked implementation plans

- `docs/architecture/archives/implementation/PLAN_13_cases_types_and_api_foundation_20260526.md` — archived, implemented the cases typed foundation and API layer.
- `docs/architecture/archives/implementation/PLAN_14_cases_page_ui_20260526.md` — archived, implemented the cases page UI, grouped card list, and stub conversation slide surface.
- `docs/architecture/archives/implementation/PLAN_15_cases_conversation_shell_and_header_20260526.md` — archived, implemented the real conversation slide shell, custom header, and case-state transition flow.
- `docs/architecture/archives/implementation/PLAN_16_case_task_info_bottom_sheet_20260526.md` — archived, implemented the task info bottom sheet and task-detail handoff from the case conversation.
- `docs/architecture/archives/implementation/PLAN_17_case_context_banner_scroll_collapse_20260526.md` — archived, implemented the secondary case-context banner and scroll-driven collapse behavior beneath the fixed conversation header.
- `docs/architecture/archives/implementation/PLAN_18_message_list_foundation_with_virtualization_20260526.md` — archived, implemented the virtualized conversation thread, older-page loading, date separators, and deleted-message rendering foundation.
- `docs/architecture/archives/implementation/PLAN_19_message_read_unread_integration_20260526.md` — archived, implemented participant-backed read-position tracking, monotonic mark-read mutation orchestration, and unread-badge refresh integration.
- `docs/architecture/archives/implementation/PLAN_20_basic_message_composer_and_send_flow_20260526.md` — archived, implemented the fixed plain-text composer, pessimistic send mutation flow, send-success read advancement, and mobile composer runtime coverage.
- `docs/architecture/archives/implementation/PLAN_20_5_case_conversation_loading_fix_20260526.md` — archived, implemented reload-safe route identity, restored slide-surface rendering through route hydration, and made task-context failures non-blocking for conversation rendering.
- `docs/architecture/archives/implementation/PLAN_21_message_edit_and_soft_delete_interactions_20260526.md` — archived, implemented own-message edit/delete actions, a message-actions sheet, composer edit mode, and runtime coverage for edited/deleted thread states.
- `docs/architecture/archives/implementation/PLAN_22_rich_content_dto_and_renderer_foundation_20260526.md` — archived, implemented the app-owned rich-content DTO, backend adapter layer, bubble renderer foundation, and focused unit coverage.
- `docs/architecture/archives/implementation/PLAN_23_lexical_rich_text_composer_foundation_20260526.md` — archived, implemented the Lexical-backed composer foundation, feature-level composer mode switch, DTO-safe editor serialization boundary, and focused runtime coverage for both rich and fallback composer modes.

## Progress notes

- `2026-05-26T07:19:39Z` `codex`: Implemented the cases typed foundations, added the planned API modules and query keys, passed `npm run typecheck`, and archived the implementation plan.
- `2026-05-26T07:29:40Z` `codex`: Implemented the cases page UI, added the grouped case cards and conversation surface stub, passed `npm run typecheck` and `npm run test:e2e:mobile -- --grep "cases page"`, and archived PLAN 14.
- `2026-05-26T07:49:37Z` `codex`: Implemented the conversation shell, task-linked custom header, and case-state transition close flow, passed `npm run typecheck` and `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`, and archived PLAN 15.
- `2026-05-26T07:58:15Z` `codex`: Implemented the case task-info bottom sheet, wired the conversation info button to the existing task-detail slide, passed `npm run typecheck` and `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`, and archived PLAN 16.
- `2026-05-26T08:24:21Z` `codex`: Implemented the secondary context banner, added the reusable scroll-collapse controller API and feature-owned conversation scroll container, passed `npm run typecheck` and `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`, and archived PLAN 17.
- `2026-05-26T08:44:05Z` `codex`: Implemented the virtualized conversation message list with paginated case-detail loading, chronological render items, deleted placeholders, and prepend-safe older-page fetching, passed `npm run typecheck` plus the cases Playwright spec on both mobile and desktop, and archived PLAN 18.
- `2026-05-26T09:08:22Z` `codex`: Implemented participant-backed read/unread integration, added monotonic mark-read orchestration plus unread-count refresh, passed `npm run typecheck` and the cases Playwright spec on mobile, and archived PLAN 19.
- `2026-05-26T09:33:51Z` `codex`: Implemented the fixed plain-text composer, added the pessimistic send-message action plus send-success read advancement, passed `npm run typecheck` and the dedicated mobile composer Playwright spec, and archived PLAN 20.
- `2026-05-26T12:20:13Z` `codex`: Implemented reload-safe case conversation routing without giving up the slide-surface shell, added route hydration for direct entry/refresh, made task lookup failures non-blocking, passed `npm run typecheck` plus focused desktop/mobile Playwright coverage, and archived PLAN 20.5.
- `2026-05-26T12:39:43Z` `codex`: Implemented own-message edit/delete interactions, added the message-actions sheet plus composer edit mode, passed `npm run typecheck` and the case composer Playwright spec on both mobile and desktop, and archived PLAN 21.
- `2026-05-26T12:56:00Z` `codex`: Implemented the app-owned rich-content DTO and backend adapter layer, updated message bubbles to render mentions/labels/links through the new renderer foundation, passed `npm run typecheck` plus focused adapter/bubble Vitest coverage, and archived PLAN 22.
- `2026-05-26T16:49:36Z` `codex`: Implemented the Lexical-backed rich composer foundation, added the feature-level composer mode switch plus DTO-safe editor serialization, passed `npm run typecheck` and the focused mobile composer Playwright spec, and archived PLAN 23.
