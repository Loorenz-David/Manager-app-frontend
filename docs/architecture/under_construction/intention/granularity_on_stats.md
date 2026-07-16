Worker Stats Granularity

Intent

Add a worker-level stats granularity page that allows the user to move from the summarized totals shown in WorkerStatsCard into the individual task-step records that compose those totals.

The entry points are:

- /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/pages/WorkerStatsSlidePage.tsx
- /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/components/WorkerStatsCard.tsx

The new page should belong to the stats package and be opened by the local application as a slide surface sheet.

Entry behavior

Each of the three stat sections in WorkerStatsCard must become an independent entry point:

- Working
- Paused
- Completed

Tapping one of these sections opens the worker granularity page with an initial intention matching the selected stat.

The initial intention exists to open the page directly on the relevant view. Once the page is open, the user must be able to switch between all three intentions without leaving the page.

When opening the page, WorkerStatsCard should provide the worker information already available in its view model, including:

- Worker identifier
- Worker name
- Profile picture
- Current state label
- Current state timer data
- Current state pill variant
- Working total
- Paused total
- Completed total

These values allow the worker header and totals to render immediately while the granular records are loaded independently.

Granularity data

The page will use the endpoint:

GET /api/v1/worker-stats/{user_id}/daily-steps

The endpoint is documented at:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_daily_step_breakdown_20260716.md

The request must include:

- The selected worker
- The active intention: working, paused, or completed
- Any pagination or list parameters required by the endpoint contract

The active intention must be sent as a query parameter so the backend can return and order the task-step records according to the requested view.

Changing the selected intention inside the page must update the query and render the corresponding granular records.

Page structure

The page must render its own header inside the scrollable content and must hide the header provided by the slide surface.

The scrollable page body should contain, in order:

1. Worker identity
2. Current worker state
3. Worker totals selector
4. Granular task-step list

Worker identity

Render the worker profile picture using the shared Avatar primitive beside the worker name.

Current worker state

Below the worker name, render the worker’s current state and elapsed time using the same state pill, timer source, and visual treatment used by WorkerStatsCard.

This information represents the worker’s current state and is independent of the selected granularity intention.

Worker totals selector

Render the same three-column totals structure used by WorkerStatsCard:

- Working
- Paused
- Completed

Each column must act as a selectable tab.

The active tab must clearly represent the current intention. Selecting another tab must:

- Change the active intention
- Query the corresponding granular records
- Update the rendered list
- Preserve the current worker context

The initial active tab is determined by the stat section tapped in WorkerStatsCard.

Granularity cards

Render each returned task-step object using a dedicated stats granularity card.

The card should follow the interaction and information hierarchy of:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/components/TaskListCard.tsx

The visual direction should follow the reference image attached to the implementation request while remaining consistent with the shared design system and the stats package.

Each card must expose two distinct interactions:

- Tapping the image opens the existing full-page image experience.
- Tapping the card body opens the existing TaskDetailPage for the related task.

The card must display the state and time information relevant to the active intention:

- working: render the working state and its accumulated working time
- paused: render the paused state and its accumulated paused time
- completed: render the completed state and the completion time in HH:mm format

Use the existing state pill conventions from the stats and task interfaces where applicable.

Scrolling and footer behavior

The worker identity header, current state, totals selector, and granular cards must belong to the same scrollable page body.

The page must include a bottom footer following the behavior already used by:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/pages/WorkerStatsSlidePage.tsx

The footer must:

- Render a Close & Back action
- Close the current slide surface
- Use the existing scroll-visibility behavior
- Hide while the user scrolls down
- Reappear according to the established useScrollHide pattern
- Respect the bottom safe area

Loading and state transitions

The page should support the standard list states used by the package:

- Initial loading
- Refreshing
- Error with retry
- Empty results for the selected intention
- Loaded granular records

Switching between intentions should preserve the worker header and page structure while replacing only the intention-dependent query state and list content.

Architectural boundaries

Keep the implementation within the stats package except where existing shared primitives, task navigation, image viewing, surface infrastructure, or API contracts must be reused.

The page should act as the feature orchestrator. Query logic, DTO mapping, granularity cards, the totals selector, and other independently scalable responsibilities should remain separated according to the existing package architecture.

Reuse established components and navigation contracts instead of recreating task-detail navigation, image viewing, avatars, state pills, timers, pull-to-refresh, surface management, or scroll-hide behavior.
