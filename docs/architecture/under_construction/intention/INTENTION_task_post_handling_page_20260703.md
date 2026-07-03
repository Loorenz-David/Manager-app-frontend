# INTENTION_task_post_handling_page_20260703

## Source

Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_post_handling_20260701.md`

## Intent

Task endpoints now expose post-handling lifecycle data and accept new parameters. We consume
those changes and add a manager-facing post-handling worklist.

1. **Schema updates**
   - `GET /tasks/{id}` now returns `assortment` (nullable string) and always includes
     `task.post_handling` (array). Update the tasks schemas accordingly.
   - `GET /tasks` accepts a new `post_handling_states` CSV filter
     (`pending,filled,completed` — needs an enum). When present, each list task payload carries
     `task.post_handling` (array); when absent, `task.post_handling` is `null`.

2. **New post-handling worklist page (`@beyo/tasks` package page)**
   - A slide-surface page built on the same foundations as `TasksView`:
     absolute header with a primitive `SearchBar`, a quick-tap filter-pill row below it that
     reacts to body scroll via scroll-visibility (relative mode, same as `TasksView`), and a
     `PullToRefresh` body with an indicator offset (header is absolutely positioned).
   - Body renders `TaskListCard`s (same actions as `TasksView`: open detail, open image viewer,
     open task actions — injected via `surfaceOpeners`, per Contract 35 §13, exactly like
     `QuickTaskAssignSlidePage`).
   - Pills render the `post_handling` states in enum order; multi-select drives the
     `post_handling_states` CSV query param, and **at least one state must always stay active**.
   - The `q` search param behaves like `TasksView`.
   - Each card's `bottomAction` calls the post-handling complete endpoint
     (`POST /tasks/{id}/post-handling/complete`). If the active post-handling instance is
     `pending`, tapping shows a warning (bottom sheet) explaining the pending state, with a button
     that completes with `force: true` (override the backend's disallowed pending→completed
     transition). If `filled`, complete directly with `force: false`.

3. **Manager home entry point**
   - Add a button on `HomeView` below the Ordering button (lucide `notepad-text` icon) that opens
     the slide with the post-handling page, injecting the surface openers.

## Goal

Author an implementation plan for Codex using `TEMPLATE_PLAN.md` and the correct contracts.
