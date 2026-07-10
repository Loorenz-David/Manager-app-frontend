Shopify Integration Frontend Intention Plan

Document purpose

This document defines the frontend intention for building the Shopify integration management interface in the ManagerBeyo frontend monorepo.

The goal is to create a reusable Shopify feature package that can be consumed by multiple frontend apps. This package will expose pages, containers, API hooks, actions, types, and UI components needed to connect, view, manage, disconnect, and inspect Shopify shop integrations for the current workspace.

This document is not an implementation plan yet. It is the source intention that Claude will later use to create a master implementation plan and phased child implementation plans, similar to the backend Shopify implementation workflow.

⸻

Backend handoff source

The backend Shopify integration is already implemented.

Frontend implementation must follow the backend handoff document:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md

The backend exposes admin/management routes under:

/api/v1/integrations/shopify

The frontend must not call the Shopify-facing webhook route:

/api/v1/shopify/webhooks

That route is only for Shopify webhook deliveries.

The frontend must also not call the backend OAuth callback route directly:

GET /api/v1/integrations/shopify/oauth/callback

That route is called by Shopify after the merchant authorizes the app. The frontend only needs to implement the redirect landing page configured by SHOPIFY_OAUTH_REDIRECT_URL.

⸻

Feature package goal

Create a new Shopify feature package under:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages

The package should follow the established shared feature package architecture described in:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/architecture/35_shared_packages.md

The package should follow existing package conventions used by feature packages such as:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks

The Shopify package should be app-agnostic and reusable. It should not hardcode manager-app-specific routing or app-specific surface IDs. Consuming apps should be responsible for providing their own surface wiring.

Suggested package name:

@beyo/shopify

Suggested folder:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify

⸻

Package responsibility

The Shopify package should own:

- Shopify API clients.
- React Query keys and hooks.
- Mutation/action hooks.
- TypeScript types for backend response shapes.
- Shopify integration list UI.
- Shopify integration detail UI.
- Shopify integration creation form.
- Shopify integration action sheet content.
- Shopify error detail sheet content.
- Shopify webhook subscription preview/detail UI.
- Shopify webhook history/activity UI.
- OAuth redirect landing content/page.
- Controller/flow hooks needed by the package pages.
- Reusable components that can be reused by other Shopify-related pages later.

The Shopify package should not own:

- App-specific route registration.
- App-specific surface IDs.
- App-specific navigation definitions.
- Backend base URL configuration.
- Authentication token storage.
- Global QueryClient setup.
- Global theme setup.
- The actual slide/bottom-sheet host surfaces.

Consuming apps should import the package pages/components and mount them into their own surface systems.

⸻

Backend route summary

The frontend package should wrap and consume the following backend routes.

Create Shopify install URL

POST /api/v1/integrations/shopify/install-url

Roles:

- admin
- manager

Purpose:

Starts the Shopify OAuth install/link flow.

Frontend behavior:

- Submit a shop domain.
- Receive install_url.
- Redirect the browser to install_url.

Request body:

{
"shop_domain": "my-shop.myshopify.com",
"redirect_after_success": null
}

Important:

redirect_after_success must currently be omitted, null, or "default". The frontend should not expose custom redirect choices yet.

⸻

List linked Shopify shops

GET /api/v1/integrations/shopify/shops

Roles:

- admin
- manager

Purpose:

Returns paginated Shopify shop integrations for the current workspace.

Frontend behavior:

- Used by the list container.
- Shows linked shops, including disabled/uninstalled/error shops.
- Uses shops and shops_pagination from the response data.

⸻

Get one Shopify shop detail

GET /api/v1/integrations/shopify/shops/{shop_integration_id}

Roles:

- admin
- manager

Purpose:

Returns one shop integration, webhook subscription summary, and webhook subscription records.

Frontend behavior:

- Used by the detail container.
- Also used by the webhook subscriptions preview/detail component.

⸻

Create reauthorize URL

POST /api/v1/integrations/shopify/shops/{shop_integration_id}/reauthorize-url

Roles:

- admin
- manager

Purpose:

Starts OAuth reauthorization for an existing shop.

Frontend behavior:

- Show reauthorization action when scopes_status is "outdated".
- Redirect the browser to the returned install_url.

⸻

Disconnect Shopify shop

DELETE /api/v1/integrations/shopify/shops/{shop_integration_id}

Roles:

- admin only

Purpose:

Soft-disables the integration, clears the stored token, and enqueues webhook removal.

Frontend behavior:

- Hide or disable this action for manager.
- Show as a destructive action in the Shopify integration action sheet.
- After success, invalidate shop list/detail queries and return to list or update detail state.

Important:

This is not a hard delete. The shop remains visible with status: "disabled".

⸻

Manually sync webhooks for one shop

POST /api/v1/integrations/shopify/shops/{shop_integration_id}/webhooks/sync

Roles:

- admin only

Purpose:

Enqueues a webhook sync task for one shop.

Frontend behavior:

- Show when webhooks_status is "needs_sync" or "has_failures".
- Hide or disable for manager.
- After success, invalidate shop detail and webhook history queries.

⸻

Shopify webhook history

GET /api/v1/integrations/shopify/shops/{shop_integration_id}/webhooks/history

Roles:

- admin
- manager

Purpose:

Returns a paginated, merged timeline of webhook intake records and webhook-related integration events.

Frontend behavior:

- Used by the activity/history component on the shop detail container.
- Initial load should fetch the most recent 3 records.
- “Show more” should fetch the next page, preferably 5 records at a time.
- The response is heterogeneous. The UI must branch on record_type.

Record types:

- webhook_intake
- integration_event

Important:

The frontend must never expect raw_payload; the backend intentionally does not return raw webhook payloads.

⸻

Workspace-wide webhook sync

POST /api/v1/integrations/shopify/webhooks/sync

Roles:

- admin only

Purpose:

Enqueues webhook sync tasks for every eligible Shopify shop in the current workspace.

Frontend decision:

This endpoint is intentionally out of scope for the first frontend implementation.

Reason:

The first Shopify frontend version will focus on the direct shop-management flow:

- connect one shop
- list linked shops
- view one shop
- reauthorize one shop
- disconnect one shop
- manually sync webhooks for one selected shop
- view webhook subscriptions and webhook history for one selected shop

Workspace-wide webhook sync is a bulk maintenance/admin operation. It should be deferred until there is a dedicated integrations maintenance/admin-tools area.

The package API layer may still type this endpoint later, but the first UI should not expose a button or menu action for it.

⸻
Scope status

GET /api/v1/integrations/shopify/scopes

Roles:

- admin
- manager

Purpose:

Returns OAuth scope health for one Shopify shop or for all Shopify shops in the current workspace.

Frontend decision:

This endpoint is intentionally out of scope for the first frontend implementation.

Reason:

The first Shopify frontend version can rely on the scope fields already returned by the shop list and shop detail endpoints:

- requested_scopes
- granted_scopes
- scopes_status
- status

These fields are enough to show the first version of the scope health UI inside the selected shop detail page.

Expected first-version behavior:

- If scopes_status is "outdated", show a friendly warning.
- Show a "Reauthorize" action for admin and manager.
- Use the existing reauthorize endpoint:

POST /api/v1/integrations/shopify/shops/{shop_integration_id}/reauthorize-url

- If scopes_status is "up_to_date", show a calm healthy state or no warning.

Deferred behavior:

The separate scope-status endpoint can be used later for a workspace-level integration health banner or admin dashboard, for example:

- "2 Shopify shops need reauthorization"
- "All connected Shopify shops have the required scopes"

Do not create a separate scope-status query/hook in the first implementation unless the implementation plan finds that the list/detail response is insufficient.

⸻

OAuth callback redirect landing page

The frontend must provide a page matching the configured backend env var:

SHOPIFY_OAUTH_REDIRECT_URL

The backend redirects the browser to this frontend URL after Shopify OAuth completes.

The frontend page must read these query params:

- success
- shop_domain
- error_code

Expected behavior:

- If success=true, show a success state and route the user back to the Shopify integrations page/list.
- If success=false, show a friendly error state using error_code when possible.
- The page should not expect access tokens, raw OAuth codes, HMAC values, or secrets.

⸻

UI architecture

The primary Shopify management page will be a slide-surface page consumed by apps.

The page should turn off the host slide-surface header and render its own header.

Header hiding pattern:

import {
usePreloadSurface,
useSurfaceHeader,
useSurfaceProps,
} from "@beyo/hooks";
const header = useSurfaceHeader();
useEffect(() => {
header?.setHeaderHidden(true);
}, [header]);

The Shopify page should use the same general approach when mounted inside a slide surface.
Main page spacing rule

The main Shopify slide page and carousel shell should not add horizontal page padding.

Important:

Do not add `px-*` to the main page wrapper, carousel wrapper, or pane shell by default.

Reason:

The existing app pattern is that high-level slide pages provide the full-height shell and scroll behavior, while inner content components own their own spacing. Adding `px-*` at the page level and again inside containers/cards creates doubled horizontal padding and makes the mobile UI feel cramped.

Reference:

`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskDetailSlidePage.tsx`

In `TaskDetailSlidePage.tsx`, the main scroll/body shell does not add broad horizontal padding. The inner content/card components define their own spacing.

Expected Shopify layout rule:

- `ShopifyIntegrationsSlidePage` should provide height, background, carousel shell, and surface/header behavior only.
- `ShopifyIntegrationsCarousel` should provide overflow/transform behavior only.
- Each pane shell should avoid default `px-*` unless there is a specific local reason.
- List/detail/create containers may define their own internal spacing.
- Cards, form containers, and content sections should own their own padding.
- Do not stack page-level `px-*` + container-level `px-*` + card-level `px-*`.

Acceptable pattern:

- page wrapper: `h-full bg-background`
- carousel wrapper: `h-full overflow-hidden`
- pane shell: `h-full min-w-0`
- pane content: owns local `px-*`, `gap-*`, and card spacing as needed

Avoid this pattern:

- page wrapper has `px-4`
- carousel pane also has `px-4`
- card/content inside also has `p-4`

That causes excessive horizontal spacing.

UI implementation references

Use these files as targeted implementation references. Do not read them all for general style. Read each file only for the specific pattern listed below.

Slide page shell, hidden host header, pull-to-refresh, and footer visibility

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskDetailSlidePage.tsx

Use this file only to understand:

- how a slide page hides the host surface header with useSurfaceHeader().setHeaderHidden(true)
- how a slide page reads surface props with useSurfaceProps
- how a slide page wires PullToRefresh to a controller refetch
- how useScrollHide is used to hide/reveal the fixed footer based on scroll state
- how the scroll container, bottom padding, and fixed footer work together
- how a detail page handles loading, error, and missing-id states

The Shopify slide page should follow this same shell pattern when mounted inside a slide surface.

Detail header and three-dot action menu

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/components/detail/TaskDetailHeader.tsx

Use this file only to understand:

- title/subtitle layout
- right-aligned status pill
- three-dot menu button layout
- mobile-friendly compact header spacing

The Shopify detail header should adapt this pattern for shop information.

Fixed bottom action footer

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/components/detail/TaskDetailBottomActions.tsx

Use this file only to understand:

- fixed bottom footer layout
- safe-area bottom padding
- two-button footer styling
- scroll-driven footer hide/reveal CSS variables

The Shopify detail and create containers should use a similar fixed footer pattern.

Pull-to-refresh primitive

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/pull-to-refresh/PullToRefresh.tsx

Use this file only to understand the primitive API:

- onRefresh
- scrollRef
- scrollClassName
- className
- how the primitive wraps scrollable content

The Shopify list/detail pages should use PullToRefresh for query refetching where appropriate.

Scroll visibility primitive

References:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/scroll-visibility/ScrollVisibilityProvider.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/scroll-visibility/ScrollVisibilityContext.tsx

Use these files only if needed to understand how footer/header visibility state is propagated. Prefer using the existing hook pattern from TaskDetailSlidePage.tsx instead of reimplementing scroll visibility logic.
⸻
Main page concept

Create one main Shopify integrations slide page that behaves like a three-pane carousel.

The page contains three panes:

1. Shopify integrations list pane.
2. Shopify integration detail pane.
3. Shopify integration creation form pane.

The active pane is controlled by the Shopify page controller, not by the page component directly.

Carousel page composition and surface-close fallback

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx

Use this file only to understand:

- how a package page composes a carousel from separate pane components
- how the page reads surface props with useSurfaceProps
- how the page hides the host surface header with useSurfaceHeader
- how surfaceOpeners are passed into the page controller instead of hardcoding app-specific surface behavior
- how the page implements a closeSurface fallback:
  - first use controller.closeSurface if provided
  - otherwise fallback to header?.requestClose()
- how the page keeps itself thin and delegates state/actions to a controller
- how the active carousel index is controlled by the controller
- how each pane receives only the props/actions it needs

The Shopify integrations slide page should follow this same composition pattern:

- ShopifyIntegrationsSlidePage should be a thin composition page.
- It should read surface props from the consuming app.
- It should pass surfaceOpeners into the Shopify page controller.
- It should hide the host surface header.
- It should provide a closeSurface fallback using the same pattern.
- It should render a Shopify carousel component with list, detail, and create panes.

Carousel transform implementation

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/emails/src/components/EmailThreadCarousel.tsx

Use this file only to understand:

- the outer h-full overflow-hidden shell
- the inner flex strip with width based on the number of panes
- transform: translateX(...)
- transition using durations.slide and easings.slideIn from @beyo/lib
- each pane occupying an equal width segment

The Shopify implementation needs three panes instead of two, so adapt the same idea:

- outer shell: h-full overflow-hidden
- inner strip: flex h-full w-[300%]
- activeIndex type: 0 | 1 | 2
- transform: translateX(${activeIndex \* -33.333333}%)
- each pane: w-1/3

Carousel controller state and refresh action pattern

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts

Use this file only to understand:

- how the active carousel index is owned by the controller
- how selected entity id/state is stored in the controller
- how open/go-back functions update activeIndex and selected state
- how refresh actions call React Query refetch functions
- how mutation errors are surfaced through notify.error
- how surfaceOpeners are accepted as an optional dependency
- how page-level components receive a controller object instead of owning business logic directly

The Shopify integrations page controller should follow the same broad pattern:

- activeIndex: 0 | 1 | 2
- selectedShopIntegrationId: string | null
- openShop(shop): set selected shop id and slide to detail
- openCreate(): slide to create form
- goBackToList(): clear create/detail transient state and slide to list
- refreshList(): refetch shop list query
- refreshDetail(): refetch selected shop detail query when selected
- refreshHistory(): refetch webhook history query when loaded
- closeSurface should come from surfaceOpeners when provided
- mutation failures should show notify.error using the existing notification pattern

Expected container flow:

- User opens the Shopify integrations slide page.
- The list pane is shown first.
- Tapping a shop card sets selectedShopIntegrationId and slides to the detail pane.
- Tapping the create FAB slides to the creation form pane.
- Back buttons slide back to the list pane.
- The list header back arrow or footer close button closes the current slide surface.

Expected container flow:

- User opens the Shopify integrations slide page.
- The list pane is shown first.
- Tapping a shop card sets selectedShopIntegrationId and slides to the detail pane.
- Tapping the create FAB slides to the creation form pane.
- Back buttons slide back to the list pane.
- The list header back arrow or footer close button closes the current slide surface.

First pane close behavior

The Shopify list pane is the only pane that should close the slide surface directly.

Expected behavior:

- list header back arrow closes the slide surface
- list footer Close & Back closes the slide surface
- detail pane back button slides back to list
- creation pane back button slides back to list

Use CustomerCoordinationEmailInboxPage.tsx as the close-surface fallback reference. The Shopify page should not assume that every consuming app provides a custom close function.

The page itself should stay thin. It should mostly:

- read surface props
- hide the host surface header
- create the controller
- provide the closeSurface fallback
- render the carousel
- pass controller state/actions into each pane

The page itself should stay thin. It should mostly:

- read surface props
- hide the host surface header
- create the controller
- provide the closeSurface fallback
- render the carousel
- pass controller state/actions into each pane

Do not put Shopify query/mutation business logic directly inside ShopifyIntegrationsSlidePage. Put that logic in the controller, hooks, containers, or API/action modules according to the package structure.
⸻

Container 1 — Shopify integrations list

Purpose

Show all Shopify integrations linked to the current workspace.

Header

The list container header should include:

- Back arrow icon from Lucide: ArrowLeft.
- Page title: Shopify Integrations.

Behavior:

- Back arrow closes the current slide surface.

Body

The body renders Shopify integration cards from:

GET /api/v1/integrations/shopify/shops

Each card should show:

- shop_name if available, otherwise fallback to shop_domain.
- shop_domain.
- created_at.
- Connection/integration status.
- Optional warning indicator for scopes_status or webhooks_status.

Status rendering should use the established primitive status/pill component used elsewhere in the app, rather than creating a one-off visual system.

The card tap behavior:

- Select the shop.
- Slide to the detail container.

Empty state

If there are no Shopify integrations, show a friendly empty state:

- Explain that no Shopify shops are connected yet.
- Offer the create/connect action.

Footer

The list pane footer renders a single button:

Close & Back

This button closes the current slide surface.

Use EmailInboxFooter.tsx only as the footer styling/reference pattern. The Shopify package may create its own footer component, but it should preserve:

- absolute bottom placement
- safe-area bottom spacing
- scroll-hide transform/opacity behavior
- full-width rounded button styling

Pull-to-refresh and scroll behavior

The list pane should support pull-to-refresh for the Shopify shop list query.

Use EmailInboxView.tsx only as the mobile list shell reference for:

- useScrollHide
- PullToRefresh
- loading state
- error retry state
- empty state
- fixed footer coexistence with scroll content

Do not copy email-specific search/filter/swipe behavior.

Floating action button

Render a bottom-right absolute/fixed FAB with a plus icon.

Behavior:

- Tapping the FAB slides to the Shopify integration creation form pane.
- The FAB should be visible only on the list pane.
- The FAB should not appear on the detail pane or creation pane.
- The FAB should not cover the fixed Close & Back footer in a way that blocks interaction.
- If the fixed footer is present, position the FAB high enough to sit above the footer or follow the existing app FAB safe-area pattern.

FAB styling reference

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/components/TaskCreationFab.tsx

Use this file only to understand:

- fixed bottom/right FAB positioning
- safe-area-aware bottom offset using var(--safe-bottom,0px)
- rounded primary button styling
- icon sizing
- z-index layering
- shadow styling
- motion/scale transition style if the implementation needs animation

The Shopify list FAB should be simpler than TaskCreationFab because it only has one action.

Expected first-version behavior:

- no expanding multi-action menu
- no secondary action buttons
- no scanner/camera prewarm
- no task-creation surface IDs
- just one fixed plus button that calls openCreate()

Suggested styling direction:

- fixed or absolute bottom-right placement inside the slide page/list pane
- rounded-full
- bg-primary
- text-card or the equivalent existing foreground token
- shadow-md
- Plus icon from Lucide
- safe-area-aware bottom offset
- positioned above the list footer when the footer is visible
  ⸻

Container 2 — Shopify integration detail

Purpose

Show the selected Shopify integration details, health, webhook subscription status, and webhook history.

The detail container should load its own detail query using the selected shop_integration_id.

Header

The detail header should include:

- Shop name as title:
  - shop_name if available.
  - fallback to shop_domain.
- Subheader:
  - created_at
  - created_by user pill when available

The backend now returns light user objects for created/updated provenance instead of only raw user ids.

For created_by / updated_by display, use:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/user-pill/UserPill.tsx

Use this file only to understand:

- userName prop
- imageSrc prop
- imageAlt prop
- compact pill layout
- fallback ImagePlaceholder behavior when no profile picture exists

Expected mapping:

- userName: created_by.username or updated_by.username
- imageSrc: created_by.profile_picture or updated_by.profile_picture
- imageAlt: created_by.username or updated_by.username

If created_by or updated_by is null, show a calm fallback such as "Unknown user" or omit the pill depending on available space.

- Status pill on the right side of the shop title row.
- Three-dot menu button on the far right, similar to TaskDetailSlidePage.
- The menu opens the Shopify integration actions bottom sheet for the selected shop.
- The first Shopify detail action sheet should include reauthorize, one-shop webhook sync, and disconnect actions.
- Disconnect should use ConfirmActionButton because it is destructive.
- Reauthorize and one-shop webhook sync should use normal action rows/buttons because they are non-destructive.
- Workspace-wide webhook sync remains out of scope for the first UI version.

The three-dot menu opens a bottom-sheet page from the local consuming app surface.

The first-version action sheet should include the direct shop-management actions supported by the backend for one selected shop.

Actions:

1. Reauthorize Shopify integration
2. Sync webhooks
3. Disconnect Shopify integration

Action behavior:

Reauthorize Shopify integration

Endpoint:

POST /api/v1/integrations/shopify/shops/{shop_integration_id}/reauthorize-url

Roles:

- admin
- manager

Purpose:

Starts OAuth reauthorization for the selected Shopify shop.

When to show:

- Show when scopes_status is "outdated", "missing", or equivalent unhealthy/outdated value.
- Also allow it when the integration status is "needs_reauth" or "scopes_outdated".
- It may be shown as a secondary action even when scopes are healthy, but the first implementation should prefer showing it only when there is a reason to reauthorize.

Behavior:

- Call the reauthorize-url mutation.
- Read the returned install_url.
- Redirect the browser to install_url.
- Do not ask the user for shop_domain because this route uses the stored shop domain.
- Do not expect tokens, OAuth code, HMAC, or secrets in the response.

Sync webhooks

Endpoint:

POST /api/v1/integrations/shopify/shops/{shop_integration_id}/webhooks/sync

Roles:

- admin only

Purpose:

Enqueues a webhook sync task for the selected Shopify shop.

When to show:

- Show for admin users.
- Hide or disable for managers.
- Prefer showing when webhooks_status is "needs_sync", "outdated", "has_failures", or equivalent unhealthy value.
- It may also be available as an admin maintenance action when the shop is active.

Behavior:

- Call the one-shop webhook sync mutation.
- Do not run GraphQL sync directly from the frontend.
- After success, invalidate/refetch:
  - selected shop detail query
  - webhook history query
  - optionally shop list query if webhooks_status is shown on cards
- Show a friendly success notification such as "Webhook sync started."

Disconnect Shopify integration

Endpoint:

DELETE /api/v1/integrations/shopify/shops/{shop_integration_id}

Roles:

- admin only

Purpose:

Soft-disables the selected Shopify integration and enqueues webhook removal.

When to show:

- Show for admin users.
- Hide or disable for managers.
- Do not show for already disabled/uninstalled shops unless the plan explicitly decides to show a disabled state.

Behavior:

- Use the primitive confirm-action-button for confirmation.
- After success, invalidate/refetch:
  - shop list query
  - selected shop detail query
  - webhook history query
- Return to the list pane or update the detail state to show status "disabled".
- Do not remove the card from the list, because disconnect is a soft disable, not a hard delete.

Confirm action reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/confirm-action-button/ConfirmActionButton.tsx

Use this file only to understand:

- two-step destructive confirmation behavior
- label and confirmLabel props
- confirmDurationMs behavior
- disabled state
- icon support
- destructive fill animation
- alignment options

The Shopify action sheet should use ConfirmActionButton only for destructive actions, especially Disconnect Shopify integration.

Non-destructive actions such as Reauthorize and Sync webhooks should use normal action buttons/list rows, not ConfirmActionButton.

Body

The body uses one main content card to render the detail fields.

Use the existing content-card/form-field-container primitive:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/form-field-container/FormFieldContainer.tsx

Each preview group should use:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/form-field-container/FieldLabelRow.tsx

Detail fields

The detail body should show these sections.

Shop domain

Label:

Shop domain

Value:

shop_domain

OAuth scopes

Label:

Granted scopes

Render:

- granted_scopes
- optionally also requested_scopes
- if there are missing scopes or scopes_status is outdated, show a friendly warning and reauthorize action.

Clarification:

requested_scopes means the scopes the current ManagerBeyo Shopify app is asking for.

granted_scopes means the scopes the merchant actually approved for this shop.

If the backend changes required scopes later, a shop can have missing scopes and require reauthorization.

Technical integration details

Render a mobile-friendly vertical table with:

- api_version
- installed_at
- uninstalled_at
- last_connected_at
- last_health_check_at
- last_health_check_status
- updated_at
- updated_by user pill if updated_by is available.

User provenance display:

The backend handoff documents created_by and updated_by as compact user references:

- client_id
- username
- profile_picture

The frontend should display these with UserPill instead of showing raw ids.

Use raw client_id only as a fallback/debug value if username is missing, and do not make raw ids the primary UI label.

Error preview

If last_error_code exists, show an error trigger row with:

- error icon
- last_error_code

Tapping it opens a bottom-sheet page showing:

- last_error_message
- optional supporting fields if available.

This bottom-sheet page should hide the host bottom-sheet header and render its own close button in the top-right corner using an X icon.

If there is no error, either hide this section or show a calm “No current error” state.

Webhook installation preview

Show a webhook subscription preview trigger.

The trigger should show counts from the detail response:

webhook_subscription_summary

For example:

- total
- active
- failed
- pending

Tapping it opens a bottom-sheet page that lists webhook subscriptions.

The webhook subscriptions page/card should show each subscription:

- topic
- status
- installed_at
- last_error_code
- last_error_message if expanded or shown in secondary text.

This component should be self-sufficient. It should own its own query flow using the selected shop_integration_id.

Preferred data source:

GET /api/v1/integrations/shopify/shops/{shop_integration_id}

because this already returns webhook_subscription_summary and webhook_subscriptions.

Webhook history/activity preview

Show a webhook history component in a friendly developer-log/timeline style.

This component should be self-sufficient. It should own its own query flow using the selected shop_integration_id.

Data source:

GET /api/v1/integrations/shopify/shops/{shop_integration_id}/webhooks/history

Initial query:

- limit=3
- offset=0

Show more behavior:

- Each “Show more” action loads the next page.
- Use page size 5 for subsequent pages if the query abstraction supports it cleanly.
- If the query layer is easier to implement with a single page size, use limit=5 consistently and show only the top 3 visually at first if needed.

Important security correction:

The frontend must not try to display raw_payload.

The backend does not return raw_payload by design.

When a history record is tapped, expand the card to show safe details only:

For webhook_intake records:

- topic
- webhook_id
- status
- retryable
- attempts
- received_at
- processing_started_at
- processed_at
- last_error

For integration_event records:

- event_type
- severity
- message
- metadata_json
- created_by user pill when available
- created_at

- created_by user pill when available
- created_at

Do not build UI expecting raw payload data.

Detail footer

The detail container should use a fixed bottom footer that follows the same scroll-hide behavior as TaskDetailSlidePage.tsx.

Use TaskDetailBottomActions.tsx only as the footer styling/reference pattern. The Shopify implementation can create its own footer component, but it should preserve the same mobile behavior:

- fixed at the bottom
- safe-area aware
- hidden/revealed based on scroll progress
- enough bottom padding in the scroll content so the footer does not cover content

Footer buttons:

- Left button: back icon + Back
  - slides back to the list container.
- Right button: Edit
  - visual only for now.
  - disabled or no-op in the first version.

The styling should match the TaskDetailSlidePage footer buttons.

⸻

Container 3 — Shopify integration creation form

Purpose

Let the user enter a Shopify shop domain and start the OAuth install/link flow.

Form approach

Use the established form pattern from task creation forms.

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-creation/src/components/InternalFormContent.tsx

Do not use the staged form component because this form has very few fields.

Fields

Initial fields:

1. shop_domain

Important backend correction:

The backend install-url route currently accepts only:

- shop_domain
- redirect_after_success

The backend does not accept shop_name during install-url creation.

Therefore, for the first implementation:

- shop_domain is functional.

The creation form should only ask for:

- Shopify shop domain.

Example helper text:

Enter your Shopify store domain, for example my-shop.myshopify.com.

Submit behavior

On submit:

1. Validate shop_domain is not blank.
2. Call:

POST /api/v1/integrations/shopify/install-url

3. Read data.install_url.
4. Redirect the browser to install_url.

After OAuth completes, Shopify redirects to the backend callback. The backend then redirects to the frontend OAuth result page configured by SHOPIFY_OAUTH_REDIRECT_URL.

Footer

The creation container has an absolute footer like the detail container.

Footer buttons:

- Left button: back icon + Back
  - slides back to the list container.
- Right button: Connect Shopify
  - submits the form.
  - shows loading state while creating install URL.

⸻

OAuth redirect landing page

The package should include a frontend page/component for the OAuth result.

The backend redirects to the configured frontend URL with query params:

- success
- shop_domain
- error_code

The page should:

- Parse the query params.
- If success=true, show a success message.
- If success=false, show a friendly error message.
- Offer a button back to Shopify integrations.
- Invalidate/refetch the Shopify shop list query on success.
- Never expect tokens, OAuth codes, HMAC signatures, or secrets.

Suggested success copy:

Shopify shop connected successfully.

Suggested failure fallback copy:

We could not connect this Shopify shop. Please try again.

Known error codes:

- invalid_signature
- invalid_state
- state_shop_mismatch
- state_already_consumed
- state_expired
- access_denied
- missing_code
- token_exchange_failed
- oauth_callback_failed

⸻

Role-aware UI behavior

The frontend should use the Shopify permission helper/controller to hide or disable actions. That helper may use `useRole()` internally for the first version, but presentational Shopify components should receive clear permission booleans instead of checking raw roles directly.
Permission contract reference

Reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/architecture/19_permissions_local.md

Use this contract only to understand the current local permission model.

Important current-state rule:

The canonical long-term permission model is the capability layer using usePermissions() and can(...), but backend_permissions and ui are currently scaffold fields and are always empty. Therefore, for the first Shopify frontend implementation, broad UI gating should use the local identity layer based on role/workspace role.

Current local identity source:

- roles and workspace roles are defined in @beyo/auth/roles.ts
- use AuthRole, WorkspaceRole, and derived union types from @beyo/auth
- do not create local Shopify-specific role string constants
- do not use TypeScript enum declarations for these roles

Use useRole() for the first implementation to determine broad role-driven UI behavior.

useRole() returns:

- role
- workspaceRoleName
- hasRole(role)
- isWorkspaceRole(workspaceRole)

Expected Shopify first-version behavior:

- admin can see and use all Shopify management actions
- manager can list shops, view detail, connect shops, reauthorize shops, and view webhook history
- manager cannot disconnect a shop
- manager cannot manually sync webhooks
- worker should not see the Shopify integration management UI
- seller should not see the Shopify integration management UI in the first version

Use role checks only for frontend visibility/disable behavior.

The backend remains the authority for real authorization. The frontend must not rely on role hiding as security. If a hidden/disabled action is somehow triggered, the backend will still return 401 or 403.

Recommended implementation approach:

- create a small Shopify permission helper/controller inside the Shopify package, for example useShopifyIntegrationPermissions
- this helper should consume useRole() from @beyo/auth
- expose explicit booleans to presentational components, such as:
  - canViewShopifyIntegrations
  - canCreateShopifyInstallUrl
  - canCreateShopifyReauthorizeUrl
  - canDisconnectShopifyIntegration
  - canSyncShopifyWebhooksForShop
  - canViewShopifyWebhookHistory
- pass these booleans into containers/components instead of scattering raw role checks throughout the UI

Do not use RoleGuard around individual Shopify action buttons unless an existing app pattern requires it. Prefer controller/helper booleans so package components stay simple and reusable.

Future migration note:

When backend permissions become populated, the Shopify permission helper should be the only place that changes. It can switch from local role booleans to capability checks such as can("shopify:disconnect") without rewriting presentational components.
Allowed for admin and manager:

- List shops.
- View shop detail.
- Create install URL.
- Create reauthorize URL.
- View webhook history.
- View scope status.

Allowed for admin only:

- Disconnect shop.
- Manually sync webhooks for one shop.
- Manually sync webhooks for all shops.

Rejected by backend:

- worker
- seller

Important:

Do not rely only on frontend hiding. Backend still enforces permissions.

⸻

API/query package design

The Shopify package should provide a clean API layer.

Suggested files:

packages/shopify/src/api/create-shopify-install-url.ts
packages/shopify/src/api/list-shopify-shops.ts
packages/shopify/src/api/get-shopify-shop.ts
packages/shopify/src/api/create-shopify-reauthorize-url.ts
packages/shopify/src/api/disconnect-shopify-shop.ts
packages/shopify/src/api/sync-shopify-webhooks-for-shop.ts
packages/shopify/src/api/sync-shopify-webhooks-for-workspace.ts
packages/shopify/src/api/get-shopify-scopes.ts
packages/shopify/src/api/get-shopify-webhook-history.ts
packages/shopify/src/api/shopify-keys.ts
packages/shopify/src/api/use-list-shopify-shops-query.ts
packages/shopify/src/api/use-get-shopify-shop-query.ts
packages/shopify/src/api/use-shopify-webhook-history-query.ts
packages/shopify/src/api/use-shopify-webhook-history-infinite-query.ts
packages/shopify/src/api/use-shopify-scopes-query.ts

Suggested action hooks:

packages/shopify/src/actions/use-create-shopify-install-url.ts
packages/shopify/src/actions/use-create-shopify-reauthorize-url.ts
packages/shopify/src/actions/use-disconnect-shopify-shop.ts
packages/shopify/src/actions/use-sync-shopify-webhooks-for-shop.ts
packages/shopify/src/actions/use-sync-shopify-webhooks-for-workspace.ts

The package should follow existing React Query key patterns from the tasks package.

Query invalidation expectations:

After install URL creation:

- no immediate invalidation is needed because the user leaves for Shopify OAuth.

After OAuth redirect success:

- invalidate Shopify shop list.
- optionally invalidate scope status.

After disconnect:

- invalidate shop list.
- invalidate selected shop detail.
- invalidate scope status.
- invalidate webhook history.

After manual webhook sync:

- invalidate selected shop detail.
- invalidate webhook history.
- optionally refetch after a delay if existing package patterns support it.

⸻

Suggested package structure

Suggested final package tree:

packages/shopify
├── package.json
├── src
│ ├── actions
│ ├── api
│ ├── assets
│ ├── components
│ │ ├── ShopifyIntegrationCard.tsx
│ │ ├── ShopifyIntegrationStatusPill.tsx
│ │ ├── ShopifyWebhookStatusPill.tsx
│ │ ├── ShopifyScopeStatusPill.tsx
│ │ ├── ShopifyWebhookHistory.tsx
│ │ ├── ShopifyWebhookHistoryRecordCard.tsx
│ │ ├── ShopifyWebhookSubscriptionsPreview.tsx
│ │ ├── ShopifyWebhookSubscriptionsSheetContent.tsx
│ │ ├── ShopifyErrorSheetContent.tsx
│ │ └── ShopifyIntegrationActionSheetContent.tsx
│ ├── containers
│ │ ├── ShopifyIntegrationsListContainer.tsx
│ │ ├── ShopifyIntegrationDetailContainer.tsx
│ │ └── ShopifyIntegrationCreateContainer.tsx
│ ├── controllers
│ │ ├── use-shopify-integrations-page.controller.ts
│ │ ├── use-shopify-integration-detail.controller.ts
│ │ └── use-shopify-integration-create.controller.ts
│ ├── flows
│ │ └── use-shopify-integrations-page.flow.ts
│ ├── pages
│ │ ├── ShopifyIntegrationsSlidePage.tsx
│ │ ├── ShopifyOAuthResultPage.tsx
│ │ ├── ShopifyIntegrationActionsSheetPage.tsx
│ │ ├── ShopifyIntegrationErrorSheetPage.tsx
│ │ └── ShopifyWebhookSubscriptionsSheetPage.tsx
│ ├── lib
│ │ ├── shopify-status.ts
│ │ ├── shopify-history.ts
│ │ └── shopify-formatters.ts
│ ├── store
│ │ └── shopify-integrations-page.store.ts
│ ├── surface-ids.ts
│ ├── types.ts
│ ├── index.ts
│ └── vite-env.d.ts
└── tsconfig.json

This structure can be refined by the implementation plan after inspecting current package conventions.

⸻

Types to model

The package should model backend response shapes carefully.

Important types:

- ShopifyShopIntegration
- ShopifyWebhookSubscription
- ShopifyWebhookSubscriptionSummary
- ShopifyScopeStatus
- ShopifyWebhookHistoryRecord
- ShopifyWebhookIntakeHistoryRecord
- ShopifyIntegrationEventHistoryRecord
- ShopifyUserReference
- ShopifyInstallUrlResponse
- ShopifyDisconnectResponse
- ShopifySyncWebhooksForShopResponse
- ShopifySyncWebhooksForWorkspaceResponse
- ShopifyOAuthResultParams

ShopifyUserReference should model the compact user shape returned by the backend:

- client_id
- username
- profile_picture

Use this type for:

- shop.created_by
- shop.updated_by
- integration_event.created_by

Important enums/string unions:

- ShopifyIntegrationStatus
- ShopifyWebhookSubscriptionStatus
- ShopifyWebhookIntakeStatus
- ShopifyIntegrationEventType
- ShopifyIntegrationEventSeverity
- ShopifyScopesStatus
- ShopifyWebhooksStatus

⸻

Visual and UX principles

The Shopify UI should feel consistent with the existing ManagerBeyo mobile UI.

Principles:

- Minimal.
- Friendly.
- Operationally clear.
- Mobile-first.
- Good empty states.
- Clear status pills.
- Safe destructive actions.
- Avoid technical overload in the main list.
- Put detailed technical records in expandable cards or bottom sheets.

Use existing primitives before creating new ones.

Prefer:

- existing buttons
- existing confirm-action-button
- existing form-field-container/content-card primitives
- existing FieldLabelRow
- existing status/pill primitives
- existing footer patterns
- existing slide/bottom-sheet surface patterns

⸻

Important security and data boundaries

The frontend must not expect or attempt to display:

- access tokens
- encrypted access tokens
- Shopify client secret
- webhook secret
- OAuth code
- HMAC/signature values
- raw webhook payload
- raw Shopify provider responses

The webhook history UI must not include a “raw payload” expansion because the backend intentionally does not return raw payloads.

If a developer-log style expansion is desired, it should show safe fields only.

⸻

Initial implementation phases recommendation

After this intention is approved, create a master implementation plan and then split into child plans.

Suggested frontend phases:

Phase 1 — Shopify package foundation and API layer

Create the package, types, API functions, query keys, query hooks, and mutation hooks.

No complex UI yet.

Phase 2 — Shopify integrations list and OAuth start flow

Implement list container, list cards, create form container, install-url mutation, and browser redirect to Shopify.

Phase 3 — OAuth result page and app surface integration

Implement OAuth result page, query invalidation after success, and the consuming app surface wiring.

Phase 4 — Shopify integration detail view

Implement detail container, detail query, status/scopes/webhook summary rendering, technical details, and footer behavior.

Phase 5 — Admin actions and bottom sheets

Implement disconnect action sheet, error detail sheet, reauthorize action, and manual webhook sync action.

Phase 6 — Webhook subscriptions and webhook history UI

Implement webhook subscription sheet and webhook history/timeline component with pagination.

Phase 7 — Polish, role behavior, loading/error states, tests, and frontend handoff

Implement final loading states, empty states, role hiding/disable behavior, tests, accessibility checks, and handoff notes.

⸻

Open questions to resolve before implementation planning

1. Which frontend app will consume the first Shopify integrations slide page?
   - managers app?
   - sellers app?
   - both?
2. What exact frontend route/path should be used for SHOPIFY_OAUTH_REDIRECT_URL?
3. Does the consuming app already have a settings/integrations area where this slide page should be opened?
4. Is shop_name currently editable or should it be omitted until the backend supports updating it?
5. Which existing primitive should be used for integration status pills?
6. Which existing bottom-sheet opening API should the package use, and should it be injected by the consuming app or imported directly from shared hooks?
7. Should workspace-wide webhook sync be included in the first UI version or deferred?
8. Should scope status route be queried independently or should the first version rely on scopes_status from the shop list/detail responses?
9. How should the package determine the current user’s role?
   - via auth store?
   - via hook?
   - passed as prop from consuming app?

⸻

Current decisions

These decisions should be treated as current intent unless changed during planning:

- The first creation form should only collect shop_domain.
- The frontend should not collect or submit shop_name yet.
- The webhook history expansion should not show raw payload.
- The main page should use a three-container carousel structure.
- The package should be reusable by multiple apps.
- The package should not own app-specific surface registration.
- The list/detail/create containers should be reusable outside the main slide page later.
- The Shopify admin route prefix is /api/v1/integrations/shopify.
- The external Shopify webhook route is not frontend-facing.
- Managers can view/connect/reauthorize but cannot disconnect or manually sync webhooks.
- Admins can perform all management actions.
- Sellers/workers should not see the Shopify integration management UI in the first version.
- created_by and updated_by should be displayed as light user objects using UserPill, not as raw user ids.
- Main Shopify slide page and carousel shells should not add default horizontal `px-*`; inner containers/cards own their own spacing to avoid doubled padding.
